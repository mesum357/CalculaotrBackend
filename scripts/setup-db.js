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
  const client = await pool.connect();
  
  try {
    const dbName = process.env.DB_NAME || 'calculator_db';
    
    // Check if database exists
    const dbCheck = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );
    
    if (dbCheck.rows.length === 0) {
      console.log(`Creating database: ${dbName}...`);
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`Database ${dbName} created successfully.`);
    } else {
      console.log(`Database ${dbName} already exists.`);
    }
    
    // Close connection to default database
    await client.release();
    
    // Connect to the new database
    const dbPool = new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: dbName,
      password: process.env.DB_PASSWORD || 'password',
      port: process.env.DB_PORT || 5432,
    });
    
    const dbClient = await dbPool.connect();
    
    try {
      // Read and execute schema
      const schemaPath = path.join(__dirname, '../database/schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      console.log('Creating tables...');
      await dbClient.query(schema);
      console.log('Tables created successfully.');
      
      // Optionally seed data
      const seedPath = path.join(__dirname, '../database/seed.sql');
      if (fs.existsSync(seedPath)) {
        console.log('Seeding initial data...');
        const seed = fs.readFileSync(seedPath, 'utf8');
        await dbClient.query(seed);
        console.log('Initial data seeded successfully.');
      }
      
      console.log('Database setup completed!');
    } finally {
      await dbClient.release();
      await dbPool.end();
    }
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupDatabase();

