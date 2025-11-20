-- Migration: Add subtitle column to calculators table
-- This column is optional and used for popular calculators

-- Add subtitle column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'calculators' AND column_name = 'subtitle'
    ) THEN
        ALTER TABLE calculators ADD COLUMN subtitle TEXT;
        RAISE NOTICE 'Added subtitle column to calculators table';
    ELSE
        RAISE NOTICE 'subtitle column already exists in calculators table';
    END IF;
END $$;

