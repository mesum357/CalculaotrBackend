# Backend Setup Guide

## Prerequisites
- Node.js installed
- PostgreSQL installed and running

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create a `.env` file in the backend directory:**
   ```env
   DB_USER=postgres
   DB_HOST=localhost
   DB_NAME=calculator_db
   DB_PASSWORD=your_password_here
   DB_PORT=5432
   PORT=3001
   NODE_ENV=development
   ```

3. **Set up the database:**
   ```bash
   npm run setup-db
   ```
   
   Or manually:
   ```bash
   # Create database
   createdb calculator_db
   
   # Run schema
   psql -U postgres -d calculator_db -f database/schema.sql
   
   # (Optional) Seed data
   psql -U postgres -d calculator_db -f database/seed.sql
   ```

4. **Start the server:**
   ```bash
   npm start
   ```

The server will run on `http://localhost:3001`

## Database Schema

The database has three main tables:

1. **categories** - Top-level calculator categories (Math, Finance, etc.)
2. **subcategories** - Subcategories within each category (Percentages, Algebra, etc.)
3. **calculators** - Individual calculators that belong to both a category and subcategory

## Testing the API

You can test the API endpoints using curl or any API client:

```bash
# Get all categories
curl http://localhost:3001/api/categories

# Get all subcategories for a category
curl http://localhost:3001/api/subcategories?category_id=1

# Get all calculators
curl http://localhost:3001/api/calculators

# Get calculators by category
curl http://localhost:3001/api/calculators?category_id=1
```

## API Documentation

See `README.md` for complete API documentation.

