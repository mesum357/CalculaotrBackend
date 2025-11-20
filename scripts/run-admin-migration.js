const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'calculator_db',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Creating admins table...');
    
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
      CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    
    // Check if admin user exists
    const existingAdmin = await client.query('SELECT id FROM admins WHERE username = $1', ['admin']);
    
    if (existingAdmin.rows.length === 0) {
      console.log('Creating default admin user...');
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
      
      console.log('✓ Default admin user created (username: admin, password: admin123)');
    } else {
      console.log('✓ Admin user already exists');
    }
    
    await client.query('COMMIT');
    console.log('✓ Migration completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('✗ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);

