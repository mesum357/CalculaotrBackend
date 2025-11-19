# Database Setup Instructions

## Quick Setup

If you're getting 500 errors from the API, you need to set up your database first.

### Step 1: Make sure PostgreSQL is running

Ensure PostgreSQL is installed and running on your system.

### Step 2: Create the database (if it doesn't exist)

```bash
# Connect to PostgreSQL
psql -U postgres

# Create the database
CREATE DATABASE calculator_db;

# Exit psql
\q
```

### Step 3: Run the schema

```bash
# Run the full schema (for new databases)
psql -U postgres -d calculator_db -f backend/database/schema.sql
```

### Step 4: (Optional) Run the migration (if you have an existing database)

If you already have a database with the old schema, run the migration:

```bash
psql -U postgres -d calculator_db -f backend/database/migration_add_calculator_fields.sql
```

### Step 5: Configure environment variables

Create a `.env` file in the `backend` directory:

```env
DB_USER=postgres
DB_HOST=localhost
DB_NAME=calculator_db
DB_PASSWORD=your_password
DB_PORT=5432
PORT=3001
```

### Step 6: Restart the backend server

After setting up the database, restart your backend server:

```bash
cd backend
npm start
```

## Troubleshooting

### Error: "relation does not exist" or "table does not exist"

This means the database tables haven't been created. Run Step 3 above.

### Error: "column does not exist"

This means you need to run the migration script (Step 4).

### Error: "password authentication failed"

Check your `.env` file and make sure the database credentials are correct.

### Check backend logs

The backend console will show detailed error messages. Check there for specific issues.

## Verify Setup

After setup, you can verify by:

1. Check if the backend is running: `http://localhost:3001/health`
2. Check if categories endpoint works: `http://localhost:3001/api/categories`
3. Check if calculators endpoint works: `http://localhost:3001/api/calculators`


