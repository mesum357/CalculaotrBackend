const pool = require('../config/database');
const fs = require('fs');
const path = require('path');
const { seedDefaultCategories } = require('./seed-default-data');

/**
 * Initialize database schema if tables don't exist
 * This function automatically creates tables if they don't exist
 */
async function initializeDatabase() {
  try {
    console.log('🔍 Checking database schema...');
    
    // Check if all essential tables exist (categories, calculators, users, session)
    const tablesCheck = await pool.query(`
      SELECT 
        EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'categories') as has_categories,
        EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'calculators') as has_calculators,
        EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') as has_users,
        EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'session') as has_session;
    `);
    
    const { has_categories, has_calculators, has_users, has_session } = tablesCheck.rows[0];
    const allTablesExist = has_categories && has_calculators && has_users && has_session;
    
    if (allTablesExist) {
      console.log('✓ Database tables already exist (categories, calculators, users, session)');
      
      // Even if tables exist, check if categories are empty and seed them
      try {
        await seedDefaultCategories();
      } catch (seedError) {
        console.warn('⚠️  Warning: Could not seed default categories:', seedError.message);
        // Don't fail if seeding fails
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
      
      // Seed default categories and subcategories if database is empty
      try {
        await seedDefaultCategories();
      } catch (seedError) {
        console.warn('⚠️  Warning: Could not seed default categories:', seedError.message);
        // Don't fail initialization if seeding fails
      }
      
      return true;
      
    } finally {
      client.release();
    }
    
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

module.exports = { initializeDatabase };

