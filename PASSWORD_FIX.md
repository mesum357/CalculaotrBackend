# Fix PostgreSQL Password Authentication Error

## The Problem
You're seeing `password authentication failed for user "postgres"` because the password in your `.env` file doesn't match your PostgreSQL password.

## Solution

### Step 1: Create a `.env` file

Create a file named `.env` in the `backend` directory with the following content:

```env
DB_USER=postgres
DB_HOST=localhost
DB_NAME=calculator_db
DB_PASSWORD=your_actual_postgres_password_here
DB_PORT=5432
PORT=3001
NODE_ENV=development
```

### Step 2: Find Your PostgreSQL Password

You need to use the password you set when you installed PostgreSQL. If you forgot it, try these options:

#### Option A: Check if you saved it somewhere
- Check your notes or password manager
- Check installation notes

#### Option B: Reset the password using pgAdmin
1. Open pgAdmin
2. Connect to your PostgreSQL server
3. Right-click on the server → Properties
4. Go to the "Connection" tab
5. You can see/change the password there

#### Option C: Reset password via command line (Windows)

1. Open Command Prompt as Administrator
2. Navigate to PostgreSQL bin directory (usually `C:\Program Files\PostgreSQL\XX\bin`)
3. Run:
   ```cmd
   psql -U postgres
   ```
   If it asks for a password and you don't know it, continue to Option D

#### Option D: Reset password by editing pg_hba.conf (Advanced)

1. Find `pg_hba.conf` file (usually in `C:\Program Files\PostgreSQL\XX\data\`)
2. Find the line that says:
   ```
   host    all             all             127.0.0.1/32            md5
   ```
3. Temporarily change `md5` to `trust`:
   ```
   host    all             all             127.0.0.1/32            trust
   ```
4. Restart PostgreSQL service
5. Connect without password:
   ```cmd
   psql -U postgres
   ```
6. Change the password:
   ```sql
   ALTER USER postgres WITH PASSWORD 'new_password';
   ```
7. Change `pg_hba.conf` back to `md5`
8. Restart PostgreSQL service
9. Update your `.env` file with the new password

### Step 3: Update `.env` file

Replace `your_actual_postgres_password_here` with your actual PostgreSQL password.

### Step 4: Restart the backend server

After updating the `.env` file, restart your backend server. You should see:
```
✓ Connected to PostgreSQL database successfully
```

## Quick Test

To test if your password is correct, try connecting manually:

```cmd
psql -U postgres -d calculator_db
```

If it asks for a password and accepts it, that's the password you need in your `.env` file.

## Default Passwords

Some common default passwords (if you didn't change it during installation):
- `postgres`
- `admin`
- `password`
- (empty/no password)

Try these if you're not sure what you set.


