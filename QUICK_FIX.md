# Quick Fix: PostgreSQL Connection Error

## The Problem
You're seeing `ECONNREFUSED` errors because **PostgreSQL is not running**.

## Solution

### Option 1: Start PostgreSQL Service (Windows)

1. Press `Win + R` to open Run dialog
2. Type `services.msc` and press Enter
3. Find the PostgreSQL service (usually named `postgresql-x64-XX` or similar)
4. Right-click and select **Start**
5. Wait for it to start (status should change to "Running")
6. Restart your backend server

### Option 2: Start PostgreSQL from Command Line (Windows)

```powershell
# Find the service name first
Get-Service | Where-Object {$_.Name -like "*postgres*"}

# Start the service (replace with actual service name)
Start-Service postgresql-x64-14
```

### Option 3: Check if PostgreSQL is Installed

If you don't see a PostgreSQL service, you may need to install it:

1. Download from: https://www.postgresql.org/download/windows/
2. Install PostgreSQL
3. During installation, note the password you set for the `postgres` user
4. Update your `.env` file with the correct password

### Option 4: Use a Different Database

If you prefer not to use PostgreSQL locally, you can:
- Use a cloud database (like Supabase, Railway, or Render)
- Use Docker to run PostgreSQL
- Use SQLite (requires code changes)

## After Starting PostgreSQL

1. Make sure your `.env` file in the `backend` directory has correct settings:
   ```env
   DB_USER=postgres
   DB_HOST=localhost
   DB_NAME=calculator_db
   DB_PASSWORD=your_postgres_password
   DB_PORT=5432
   ```

2. Create the database (if it doesn't exist):
   ```bash
   psql -U postgres -c "CREATE DATABASE calculator_db;"
   ```

3. Run the schema:
   ```bash
   psql -U postgres -d calculator_db -f backend/database/schema.sql
   ```

4. Restart your backend server

## Verify It's Working

After starting PostgreSQL and restarting the backend, you should see:
```
✓ Connected to PostgreSQL database successfully
```

Instead of connection errors.


