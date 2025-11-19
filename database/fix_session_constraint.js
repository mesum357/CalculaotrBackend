/**
 * Standalone script to fix session table constraint issue
 * Run this if you're getting "ON CONFLICT" errors during login
 * 
 * Usage: node backend/database/fix_session_constraint.js
 */

const pool = require('../config/database');

async function fixSessionConstraint() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing session table constraint...');
    
    // Check if session table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'session'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('⚠️  Session table does not exist. Creating it...');
      
      // Create session table with proper constraint
      await client.query(`
        CREATE TABLE "session" (
          "sid" varchar NOT NULL COLLATE "default",
          "sess" json NOT NULL,
          "expire" timestamp(6) NOT NULL,
          CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
        ) WITH (OIDS=FALSE);
      `);
      
      await client.query('CREATE INDEX "IDX_session_expire" ON "session" ("expire")');
      
      console.log('✓ Session table created with primary key constraint');
      return;
    }
    
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
    
    if (hasConstraint) {
      console.log('✓ Session table already has primary key constraint');
    } else {
      console.log('⚠️  Session table exists but missing primary key constraint. Adding it...');
      
      // Drop any existing broken constraint
      await client.query('ALTER TABLE "session" DROP CONSTRAINT IF EXISTS "session_pkey"');
      
      // Add primary key constraint
      await client.query(`
        ALTER TABLE "session" 
        ADD CONSTRAINT "session_pkey" 
        PRIMARY KEY ("sid") 
        NOT DEFERRABLE INITIALLY IMMEDIATE
      `);
      
      console.log('✓ Primary key constraint added to session table');
    }
    
    // Ensure index exists
    await client.query('CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire")');
    console.log('✓ Session table index verified');
    
    console.log('\n✅ Session table is now properly configured!');
    
  } catch (error) {
    console.error('✗ Error fixing session table:', error.message);
    console.error('   Code:', error.code);
    throw error;
  } finally {
    client.release();
    // Only close pool if running as standalone script
    if (require.main === module) {
      await pool.end();
    }
  }
}

// Run if called directly
if (require.main === module) {
  fixSessionConstraint()
    .then(() => {
      console.log('\n✅ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n✗ Failed:', error);
      process.exit(1);
    });
}

module.exports = { fixSessionConstraint };

