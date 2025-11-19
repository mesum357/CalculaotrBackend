const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

/**
 * Initialize database schema if tables don't exist
 * This function automatically creates tables if they don't exist
 */
async function initializeDatabase() {
  try {
    console.log('🔍 Checking database schema...');
    
    // Check if categories table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'categories'
      );
    `);
    
    const tablesExist = tableCheck.rows[0].exists;
    
    if (tablesExist) {
      console.log('✓ Database tables already exist');
      return true;
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
      
      console.log('✓ Database schema initialized successfully');
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

