const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: 'postgres', // Connect to default postgres database first
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function setupDatabase() {
  console.log('\n=== Database Setup ===\n');
  
  let client;
  try {
    client = await pool.connect();
    console.log('✓ Connected to PostgreSQL server');
  } catch (error) {
    console.error('\n✗ Failed to connect to PostgreSQL:');
    console.error('  Error:', error.message);
    if (error.code === '28P01') {
      console.error('\n  Password authentication failed. Check your .env file.');
      console.error('  Run: npm run setup-env');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n  PostgreSQL is not running. Start the PostgreSQL service.');
    }
    process.exit(1);
  }
  
  try {
    const dbName = process.env.DB_NAME || 'calculator_db';
    
    // Check if database exists
    console.log(`Checking if database "${dbName}" exists...`);
    const dbCheck = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );
    
    if (dbCheck.rows.length === 0) {
      console.log(`Creating database: ${dbName}...`);
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`✓ Database ${dbName} created successfully.`);
    } else {
      console.log(`✓ Database ${dbName} already exists.`);
    }
    
    // Close connection to default database
    await client.release();
    client = null; // Mark as released to prevent double release
    
    // Connect to the new database
    console.log(`\nConnecting to database "${dbName}"...`);
    const dbPool = new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: dbName,
      password: process.env.DB_PASSWORD || 'password',
      port: process.env.DB_PORT || 5432,
    });
    
    const dbClient = await dbPool.connect();
    
    try {
      console.log('✓ Connected to database');
      
      // Read and execute schema
      const schemaPath = path.join(__dirname, '../database/schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      console.log('Creating tables...');
      await dbClient.query(schema);
      console.log('✓ Tables created successfully.');
      
      // Optionally seed data
      const seedPath = path.join(__dirname, '../database/seed.sql');
      if (fs.existsSync(seedPath)) {
        console.log('\nSeeding initial data...');
        const seed = fs.readFileSync(seedPath, 'utf8');
        await dbClient.query(seed);
        console.log('✓ Initial data seeded successfully.');
      }
      
      console.log('\n✓ Database setup completed successfully!');
      console.log('\nYou can now start your backend server with: npm start\n');
    } finally {
      await dbClient.release();
      await dbPool.end();
    }
  } catch (error) {
    console.error('\n✗ Error setting up database:');
    console.error('  Error:', error.message);
    console.error('  Code:', error.code);
    
    if (error.code === '42P01') {
      console.error('\n  Table already exists or schema error. The database may already be set up.');
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

setupDatabase();

