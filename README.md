# Calculator Backend API

Express.js backend with PostgreSQL for managing calculators, categories, and subcategories.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up PostgreSQL database:
   - Create a database named `calculator_db` (or update the name in `.env`)
   - Run the schema file to create tables:
   ```bash
   psql -U postgres -d calculator_db -f database/schema.sql
   ```
   - (Optional) Seed initial data:
   ```bash
   psql -U postgres -d calculator_db -f database/seed.sql
   ```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Update `.env` with your database credentials.

5. Start the server:
```bash
npm start
```

## Database Schema

### Categories
- `id` (SERIAL PRIMARY KEY)
- `name` (VARCHAR)
- `slug` (VARCHAR, UNIQUE)
- `icon` (VARCHAR)
- `description` (TEXT)
- `created_at`, `updated_at` (TIMESTAMP)

### Subcategories
- `id` (SERIAL PRIMARY KEY)
- `category_id` (INTEGER, FOREIGN KEY)
- `name` (VARCHAR)
- `slug` (VARCHAR, UNIQUE per category)
- `icon` (VARCHAR)
- `description` (TEXT)
- `created_at`, `updated_at` (TIMESTAMP)

### Calculators
- `id` (SERIAL PRIMARY KEY)
- `category_id` (INTEGER, FOREIGN KEY)
- `subcategory_id` (INTEGER, FOREIGN KEY)
- `name` (VARCHAR)
- `slug` (VARCHAR, UNIQUE per category/subcategory)
- `description` (TEXT)
- `href` (VARCHAR)
- `is_active` (BOOLEAN)
- `created_at`, `updated_at` (TIMESTAMP)

## API Endpoints

### Categories
- `GET /api/categories` - Get all categories
- `GET /api/categories/:id` - Get category by ID
- `GET /api/categories/slug/:slug` - Get category by slug
- `POST /api/categories` - Create a new category
- `PUT /api/categories/:id` - Update a category
- `DELETE /api/categories/:id` - Delete a category

### Subcategories
- `GET /api/subcategories` - Get all subcategories (optional query: `?category_id=X`)
- `GET /api/subcategories/:id` - Get subcategory by ID
- `GET /api/subcategories/slug/:slug` - Get subcategory by slug (optional query: `?category_id=X`)
- `POST /api/subcategories` - Create a new subcategory
- `PUT /api/subcategories/:id` - Update a subcategory
- `DELETE /api/subcategories/:id` - Delete a subcategory

### Calculators
- `GET /api/calculators` - Get all calculators (optional queries: `?category_id=X&subcategory_id=Y&is_active=true`)
- `GET /api/calculators/:id` - Get calculator by ID
- `GET /api/calculators/slug/:slug` - Get calculator by slug (optional queries: `?category_id=X&subcategory_id=Y`)
- `POST /api/calculators` - Create a new calculator
- `PUT /api/calculators/:id` - Update a calculator
- `DELETE /api/calculators/:id` - Delete a calculator

## Example Requests

### Create a Category
```json
POST /api/categories
{
  "name": "Math",
  "slug": "math",
  "icon": "Sigma",
  "description": "Mathematical calculators"
}
```

### Create a Subcategory
```json
POST /api/subcategories
{
  "category_id": 1,
  "name": "Percentages calculators",
  "slug": "percentages-calculators",
  "icon": "Percent",
  "description": "Percentage-related calculators"
}
```

### Create a Calculator
```json
POST /api/calculators
{
  "category_id": 1,
  "subcategory_id": 1,
  "name": "Average Percentage Calculator",
  "slug": "average-percentage-calculator",
  "description": "Calculate the average of multiple percentages",
  "href": "/calculators/math/average-percentage-calculator",
  "is_active": true
}
```

