const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createEnvFile() {
  console.log('\n=== PostgreSQL Configuration Setup ===\n');
  
  const dbUser = await question('PostgreSQL username (default: postgres): ') || 'postgres';
  const dbHost = await question('PostgreSQL host (default: localhost): ') || 'localhost';
  const dbName = await question('Database name (default: calculator_db): ') || 'calculator_db';
  const dbPassword = await question('PostgreSQL password (required): ');
  
  if (!dbPassword) {
    console.error('\n✗ Password is required!');
    rl.close();
    process.exit(1);
  }
  
  const dbPort = await question('PostgreSQL port (default: 5432): ') || '5432';
  const serverPort = await question('Backend server port (default: 3001): ') || '3001';
  
  const envContent = `# Database Configuration
DB_USER=${dbUser}
DB_HOST=${dbHost}
DB_NAME=${dbName}
DB_PASSWORD=${dbPassword}
DB_PORT=${dbPort}

# Server Configuration
PORT=${serverPort}
NODE_ENV=development
`;

  const envPath = path.join(__dirname, '.env');
  
  try {
    fs.writeFileSync(envPath, envContent);
    console.log('\n✓ .env file created successfully!');
    console.log(`  Location: ${envPath}`);
    console.log('\nYou can now start your backend server with: npm start\n');
  } catch (error) {
    console.error('\n✗ Error creating .env file:', error.message);
    process.exit(1);
  }
  
  rl.close();
}

createEnvFile();


