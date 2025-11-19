const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'calculator_db',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
  // Add connection timeout and retry logic
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  // SSL configuration for production (Render requires SSL)
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
});

// Test database connection on startup
async function testConnection() {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✓ Connected to PostgreSQL database successfully');
    return true;
  } catch (error) {
    console.error('\n✗ Database Connection Error:');
    console.error('  Error:', error.message);
    console.error('  Code:', error.code);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n  PostgreSQL is not running or not accessible.');
      console.error('  Please ensure:');
      console.error('    1. PostgreSQL is installed');
      console.error('    2. PostgreSQL service is running');
      console.error('    3. Connection settings in .env are correct');
      console.error('\n  To start PostgreSQL on Windows:');
      console.error('    - Open Services (services.msc)');
      console.error('    - Find "postgresql-x64-XX" service');
      console.error('    - Start the service');
      console.error('\n  Or check your .env file in the backend directory:');
      console.error('    DB_HOST=' + (process.env.DB_HOST || 'localhost'));
      console.error('    DB_PORT=' + (process.env.DB_PORT || 5432));
      console.error('    DB_NAME=' + (process.env.DB_NAME || 'calculator_db'));
    } else if (error.code === '28P01') {
      console.error('\n  ✗ Password authentication failed!');
      console.error('\n  The password in your .env file does not match your PostgreSQL password.');
      console.error('\n  To fix this:');
      console.error('    1. Create a .env file in the backend directory (if it doesn\'t exist)');
      console.error('    2. Add your PostgreSQL password:');
      console.error('       DB_PASSWORD=your_actual_postgres_password');
      console.error('\n  If you forgot your PostgreSQL password, you can reset it:');
      console.error('    Option A: Use pgAdmin (GUI tool) to change the password');
      console.error('    Option B: Edit pg_hba.conf to allow local connections without password');
      console.error('    Option C: Reset via command line (requires admin access)');
      console.error('\n  Current connection settings:');
      console.error('    DB_USER=' + (process.env.DB_USER || 'postgres'));
      console.error('    DB_HOST=' + (process.env.DB_HOST || 'localhost'));
      console.error('    DB_NAME=' + (process.env.DB_NAME || 'calculator_db'));
      console.error('    DB_PASSWORD=' + (process.env.DB_PASSWORD ? '***' : 'NOT SET (using default: "password")'));
      console.error('    DB_PORT=' + (process.env.DB_PORT || 5432));
    } else if (error.code === '3D000') {
      console.error('\n  ✗ Database "calculator_db" does not exist!');
      console.error('\n  To fix this, run one of the following:');
      console.error('\n  Option 1: Use the setup script (Recommended):');
      console.error('    npm run setup-db');
      console.error('\n  Option 2: Create manually via psql:');
      console.error('    psql -U postgres -c "CREATE DATABASE calculator_db;"');
      console.error('    Then run the schema:');
      console.error('    psql -U postgres -d calculator_db -f database/schema.sql');
      console.error('\n  Option 3: Use pgAdmin:');
      console.error('    1. Open pgAdmin');
      console.error('    2. Right-click "Databases" → Create → Database');
      console.error('    3. Name: calculator_db');
      console.error('    4. Then run the schema file');
    }
    
    console.error('\n  The server will continue to run, but database operations will fail.');
    console.error('  Fix the connection issue and restart the server.\n');
    return false;
  }
}

// Test connection on module load
testConnection();

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  // Don't exit the process, just log the error
});

module.exports = pool;

