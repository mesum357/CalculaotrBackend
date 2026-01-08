-- Migration to add meta tags columns to calculators and categories tables for SEO

-- Add meta tags columns to calculators table
ALTER TABLE calculators ADD COLUMN IF NOT EXISTS meta_title VARCHAR(255);
ALTER TABLE calculators ADD COLUMN IF NOT EXISTS meta_description TEXT;
ALTER TABLE calculators ADD COLUMN IF NOT EXISTS meta_keywords TEXT;

-- Add meta tags columns to categories table  
ALTER TABLE categories ADD COLUMN IF NOT EXISTS meta_title VARCHAR(255);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS meta_description TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS meta_keywords TEXT;

-- Create indexes for meta fields (optional, for potential searches)
CREATE INDEX IF NOT EXISTS idx_calculators_meta_title ON calculators(meta_title);
CREATE INDEX IF NOT EXISTS idx_categories_meta_title ON categories(meta_title);
