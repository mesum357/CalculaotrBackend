-- Create database schema for calculators with categories and subcategories

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(255) NOT NULL UNIQUE,
    icon VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subcategories table (belongs to a category)
CREATE TABLE IF NOT EXISTS subcategories (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    icon VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category_id, slug)
);

-- Calculators table (belongs to both category and subcategory)
CREATE TABLE IF NOT EXISTS calculators (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    subcategory_id INTEGER NOT NULL REFERENCES subcategories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    href VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    inputs JSONB DEFAULT '[]'::jsonb,
    results JSONB DEFAULT '[]'::jsonb,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    most_used BOOLEAN DEFAULT false,
    popular BOOLEAN DEFAULT false,
    likes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category_id, subcategory_id, slug)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_subcategories_category_id ON subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_calculators_category_id ON calculators(category_id);
CREATE INDEX IF NOT EXISTS idx_calculators_subcategory_id ON calculators(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_calculators_slug ON calculators(slug);
CREATE INDEX IF NOT EXISTS idx_calculators_most_used ON calculators(most_used);
CREATE INDEX IF NOT EXISTS idx_calculators_popular ON calculators(popular);
CREATE INDEX IF NOT EXISTS idx_calculators_is_active ON calculators(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_subcategories_slug ON subcategories(slug);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subcategories_updated_at BEFORE UPDATE ON subcategories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calculators_updated_at BEFORE UPDATE ON calculators
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Trigger to update updated_at for users
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Session table for express-session with connect-pg-simple
-- CRITICAL: This table MUST have a primary key constraint for connect-pg-simple's ON CONFLICT to work
-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);

-- Drop and recreate primary key constraint to ensure it's correct (connect-pg-simple needs this)
ALTER TABLE "session" DROP CONSTRAINT IF EXISTS "session_pkey";
ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;

-- Create index for expire column
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

-- Calculator interactions tables (likes, ratings, comments)
-- Supports both authenticated users (user_id) and anonymous users (user_ip)

-- Calculator Likes table
CREATE TABLE IF NOT EXISTS calculator_likes (
    id SERIAL PRIMARY KEY,
    calculator_id INTEGER NOT NULL REFERENCES calculators(id) ON DELETE CASCADE,
    user_ip VARCHAR(45), -- IPv4 or IPv6 address for anonymous users
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- For authenticated users
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK ((user_id IS NOT NULL) OR (user_ip IS NOT NULL)) -- At least one must be set
);

-- Calculator Ratings table
CREATE TABLE IF NOT EXISTS calculator_ratings (
    id SERIAL PRIMARY KEY,
    calculator_id INTEGER NOT NULL REFERENCES calculators(id) ON DELETE CASCADE,
    user_ip VARCHAR(45),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- For authenticated users
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK ((user_id IS NOT NULL) OR (user_ip IS NOT NULL)) -- At least one must be set
);

-- Calculator Comments table
CREATE TABLE IF NOT EXISTS calculator_comments (
    id SERIAL PRIMARY KEY,
    calculator_id INTEGER NOT NULL REFERENCES calculators(id) ON DELETE CASCADE,
    user_ip VARCHAR(45),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- For authenticated users
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK ((user_id IS NOT NULL) OR (user_ip IS NOT NULL)) -- At least one must be set
);

-- Create indexes for calculator interactions
CREATE INDEX IF NOT EXISTS idx_calculator_likes_calculator_id ON calculator_likes(calculator_id);
CREATE INDEX IF NOT EXISTS idx_calculator_likes_user_ip ON calculator_likes(user_ip);
CREATE INDEX IF NOT EXISTS idx_calculator_likes_user_id ON calculator_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_calculator_ratings_calculator_id ON calculator_ratings(calculator_id);
CREATE INDEX IF NOT EXISTS idx_calculator_ratings_user_ip ON calculator_ratings(user_ip);
CREATE INDEX IF NOT EXISTS idx_calculator_ratings_user_id ON calculator_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_calculator_comments_calculator_id ON calculator_comments(calculator_id);
CREATE INDEX IF NOT EXISTS idx_calculator_comments_user_ip ON calculator_comments(user_ip);
CREATE INDEX IF NOT EXISTS idx_calculator_comments_user_id ON calculator_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_calculator_comments_created_at ON calculator_comments(created_at DESC);

-- Create unique indexes that work with both user_id and user_ip
-- For calculator_likes: one like per calculator per user (either user_id or user_ip)
CREATE UNIQUE INDEX IF NOT EXISTS calculator_likes_user_unique 
ON calculator_likes(calculator_id, COALESCE(user_id::text, user_ip));

-- For calculator_ratings: one rating per calculator per user (either user_id or user_ip)
CREATE UNIQUE INDEX IF NOT EXISTS calculator_ratings_user_unique 
ON calculator_ratings(calculator_id, COALESCE(user_id::text, user_ip));

-- Triggers to update updated_at for interactions
CREATE TRIGGER update_ratings_updated_at BEFORE UPDATE ON calculator_ratings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON calculator_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


