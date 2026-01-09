const pool = require('../config/database');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { seedDefaultCategories } = require('./seed-default-data');

/**
 * Initialize database schema if tables don't exist
 * This function automatically creates tables if they don't exist
 */
async function initializeDatabase() {
  try {
    console.log('🔍 Checking database schema...');
    
    // Check if all essential tables exist (categories, calculators, users, session, admins)
    const tablesCheck = await pool.query(`
      SELECT 
        EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'categories') as has_categories,
        EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'calculators') as has_calculators,
        EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') as has_users,
        EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'session') as has_session,
        EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admins') as has_admins;
    `);
    
    const { has_categories, has_calculators, has_users, has_session, has_admins } = tablesCheck.rows[0];
    const allTablesExist = has_categories && has_calculators && has_users && has_session && has_admins;
    
    if (allTablesExist) {
      console.log('✓ Database tables already exist (categories, calculators, users, session, admins)');
      
      // Check and add meta tags columns if they don't exist
      await addMetaTagsColumns();
      
      // Check and add radio modes columns if they don't exist
      await addRadioModesColumns();
      
      // Even if tables exist, check if categories are empty and seed them
      try {
        await seedDefaultCategories();
      } catch (seedError) {
        console.warn('⚠️  Warning: Could not seed default categories:', seedError.message);
        // Don't fail if seeding fails
      }
      
      // Check and create admin table if missing
      if (!has_admins) {
        console.log('⚠️  Admins table missing. Creating...');
        const client = await pool.connect();
        try {
          await createAdminsTable(client);
        } finally {
          client.release();
        }
      }
      
      return true;
    }
    
    console.log('⚠️  Missing tables detected:', {
      has_categories,
      has_calculators,
      has_users,
      has_session
    });
    
    if (!has_session) {
      console.log('⚠️  Missing session table! This will cause login failures.');
    }
    
    if (has_categories && has_calculators && !has_users) {
      console.log('⚠️  Missing some tables (users, session). Running schema to create missing tables...');
    } else if (!has_categories || !has_calculators) {
      console.log('⚠️  Database tables not found. Initializing schema...');
    }
    
    console.log('⚠️  Database tables not found. Initializing schema...');
    
    // Read schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      console.error('✗ Schema file not found at:', schemaPath);
      return false;
    }
    
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema using a client to handle multiple statements
    const client = await pool.connect();
    
    try {
      // Split by semicolon but preserve CREATE statements
      // Execute each complete statement
      const statements = [];
      let currentStatement = '';
      
      for (const line of schemaSQL.split('\n')) {
        const trimmed = line.trim();
        // Skip comments and empty lines
        if (!trimmed || trimmed.startsWith('--')) {
          continue;
        }
        
        currentStatement += line + '\n';
        
        // If line ends with semicolon, it's a complete statement
        if (trimmed.endsWith(';')) {
          const stmt = currentStatement.trim();
          if (stmt && stmt !== ';') {
            statements.push(stmt);
          }
          currentStatement = '';
        }
      }
      
      // Add any remaining statement
      if (currentStatement.trim()) {
        statements.push(currentStatement.trim());
      }
      
      // Execute each statement
      for (const statement of statements) {
        if (statement.trim() && !statement.trim().startsWith('--')) {
          try {
            await client.query(statement);
          } catch (err) {
            // Ignore "already exists" errors (42710, 42P07, 42723)
            if (err.code !== '42710' && err.code !== '42P07' && err.code !== '42723') {
              // Only warn on non-critical errors
              if (!err.message.includes('already exists')) {
                console.warn('   Warning:', err.message);
              }
            }
          }
        }
      }
      
      // CRITICAL: Ensure session table has primary key constraint
      // This fixes the "ON CONFLICT" error for connect-pg-simple
      try {
        console.log('   Checking session table constraint...');
        
        // Check if session table exists
        const sessionTableCheck = await client.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'session'
          );
        `);
        
        if (sessionTableCheck.rows[0].exists) {
          // Check if primary key constraint exists
          const constraintCheck = await client.query(`
            SELECT EXISTS (
              SELECT 1 FROM pg_constraint 
              WHERE conname = 'session_pkey' 
              AND conrelid = 'session'::regclass
              AND contype = 'p'
            );
          `);
          
          const hasConstraint = constraintCheck.rows[0].exists;
          
          if (!hasConstraint) {
            console.log('   ⚠️  Session table exists but missing primary key constraint. Fixing...');
            
            // Drop existing constraint if it exists (in case it's broken)
            await client.query('ALTER TABLE "session" DROP CONSTRAINT IF EXISTS "session_pkey"');
            
            // Add primary key constraint
            await client.query(`
              ALTER TABLE "session" 
              ADD CONSTRAINT "session_pkey" 
              PRIMARY KEY ("sid") 
              NOT DEFERRABLE INITIALLY IMMEDIATE
            `);
            
            console.log('   ✓ Session table primary key constraint added');
          } else {
            console.log('   ✓ Session table has primary key constraint');
          }
          
          // Ensure index exists
          await client.query('CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire")');
        }
      } catch (err) {
        console.warn('   Warning: Could not verify/fix session table constraint:', err.message);
        // Don't fail initialization if this fails, but log it
      }
      
      console.log('✓ Database schema initialized successfully');
      
      // Create admins table if it doesn't exist
      if (!has_admins) {
        console.log('   Creating admins table...');
        await createAdminsTable(client);
      }
      
    } finally {
      client.release();
    }
    
    // After schema is initialized, ensure meta tags columns exist
    await addMetaTagsColumns();
    
    // After schema is initialized, ensure radio modes columns exist
    await addRadioModesColumns();
    
    // Seed default categories and subcategories if database is empty
    try {
      await seedDefaultCategories();
    } catch (seedError) {
      console.warn('⚠️  Warning: Could not seed default categories:', seedError.message);
      // Don't fail initialization if seeding fails
    }
    
    return true;
    
  } catch (error) {
    console.error('\n✗ Error initializing database:', error.message);
    console.error('   Code:', error.code);
    
    if (error.code === '42P01') {
      console.error('\n⚠️  Database connection succeeded but tables do not exist.');
      console.error('📋 Please initialize the database manually:');
      console.error('\n   1. Go to Render Dashboard → Your Database Service');
      console.error('   2. Click "Connect" or "psql" button');
      console.error('   3. Copy and paste contents of: backend/database/schema.sql');
      console.error('   4. Execute the SQL');
      console.error('\n   See DATABASE_INITIALIZATION_RENDER.md for detailed instructions');
    } else if (error.code === 'ECONNREFUSED' || error.code === '28P01' || error.code === '3D000') {
      console.error('\n⚠️  Database connection failed. Check your environment variables.');
    }
    
    console.error('\n⚠️  The server will continue to run, but API endpoints may fail.\n');
    return false;
  }
}

/**
 * Add meta tags columns to calculators and categories tables if they don't exist
 * This ensures backward compatibility when upgrading existing databases
 */
async function addMetaTagsColumns() {
  const client = await pool.connect();
  
  try {
    console.log('   Checking meta tags columns...');
    
    // Check if meta_title column exists in calculators table
    const calcMetaCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'calculators' 
        AND column_name = 'meta_title'
      );
    `);
    
    if (!calcMetaCheck.rows[0].exists) {
      console.log('   Adding meta tags columns to calculators table...');
      await client.query('ALTER TABLE calculators ADD COLUMN IF NOT EXISTS meta_title VARCHAR(255)');
      await client.query('ALTER TABLE calculators ADD COLUMN IF NOT EXISTS meta_description TEXT');
      await client.query('ALTER TABLE calculators ADD COLUMN IF NOT EXISTS meta_keywords TEXT');
      console.log('   ✓ Meta tags columns added to calculators table');
    } else {
      console.log('   ✓ Calculators table already has meta tags columns');
    }
    
    // Check if meta_title column exists in categories table
    const catMetaCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'categories' 
        AND column_name = 'meta_title'
      );
    `);
    
    if (!catMetaCheck.rows[0].exists) {
      console.log('   Adding meta tags columns to categories table...');
      await client.query('ALTER TABLE categories ADD COLUMN IF NOT EXISTS meta_title VARCHAR(255)');
      await client.query('ALTER TABLE categories ADD COLUMN IF NOT EXISTS meta_description TEXT');
      await client.query('ALTER TABLE categories ADD COLUMN IF NOT EXISTS meta_keywords TEXT');
      console.log('   ✓ Meta tags columns added to categories table');
    } else {
      console.log('   ✓ Categories table already has meta tags columns');
    }
    
  } catch (error) {
    console.warn('   ⚠️  Warning: Could not add meta tags columns:', error.message);
    // Don't fail initialization if this fails
  } finally {
    client.release();
  }
}

/**
 * Add radio modes columns to calculators table if they don't exist
 * This enables calculators to have multiple calculation modes with radio options
 */
async function addRadioModesColumns() {
  const client = await pool.connect();
  
  try {
    console.log('   Checking radio modes columns...');
    
    // Check if has_radio_modes column exists in calculators table
    const radioModesCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'calculators' 
        AND column_name = 'has_radio_modes'
      );
    `);
    
    if (!radioModesCheck.rows[0].exists) {
      console.log('   Adding radio modes columns to calculators table...');
      await client.query('ALTER TABLE calculators ADD COLUMN IF NOT EXISTS has_radio_modes BOOLEAN DEFAULT FALSE');
      await client.query('ALTER TABLE calculators ADD COLUMN IF NOT EXISTS radio_options JSONB DEFAULT NULL');
      console.log('   ✓ Radio modes columns added to calculators table');
    } else {
      console.log('   ✓ Calculators table already has radio modes columns');
    }
    
  } catch (error) {
    console.warn('   ⚠️  Warning: Could not add radio modes columns:', error.message);
    // Don't fail initialization if this fails
  } finally {
    client.release();
  }
}

/**
 * Create admins table and default admin user
 */
async function createAdminsTable(client) {
  try {
    // Create admin table
    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'sub_admin',
        permissions JSONB DEFAULT '[]'::jsonb,
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES admins(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_admins_role ON admins(role);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_admins_is_active ON admins(is_active);');
    
    // Create trigger
    await client.query(`
      DROP TRIGGER IF EXISTS update_admins_updated_at ON admins;
      CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    
    // Check if admin user exists
    const existingAdmin = await client.query('SELECT id FROM admins WHERE username = $1', ['admin']);
    
    if (existingAdmin.rows.length === 0) {
      console.log('   Creating default admin user...');
      const passwordHash = await bcrypt.hash('admin123', 10);
      
      await client.query(`
        INSERT INTO admins (username, password_hash, role, permissions, is_active)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        'admin',
        passwordHash,
        'admin',
        JSON.stringify(['/', '/calculators', '/users', '/settings']),
        true
      ]);
      
      console.log('   ✓ Default admin user created (username: admin, password: admin123)');
    } else {
      console.log('   ✓ Admin user already exists');
    }
    
    console.log('✓ Admins table created successfully');
  } catch (error) {
    console.warn('   ⚠️  Warning: Could not create admins table:', error.message);
    // Don't fail initialization if this fails
  }
}

module.exports = { initializeDatabase };

