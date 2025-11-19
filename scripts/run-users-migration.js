const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'calculator_db',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function runMigration() {
  console.log('\n=== Running Migration: Add Users Table ===\n');
  
  let client;
  try {
    client = await pool.connect();
    console.log('✓ Connected to database');
    
    // Read and execute migration
    const migrationPath = path.join(__dirname, '../database/migration_add_users.sql');
    const migration = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running migration...');
    await client.query(migration);
    console.log('✓ Migration completed successfully!');
    console.log('\nTable created:');
    console.log('  - users');
    console.log('\n');
  } catch (error) {
    console.error('\n✗ Error running migration:');
    console.error('  Error:', error.message);
    console.error('  Code:', error.code);
    
    if (error.code === '42P07') {
      console.error('\n  Table already exists. Migration may have already been run.');
    } else if (error.code === '3D000') {
      console.error('\n  Database connection issue. Check your .env file.');
    }
    
    process.exit(1);
  } finally {
    if (client) {
      await client.release();
    }
    await pool.end();
  }
}

runMigration();

