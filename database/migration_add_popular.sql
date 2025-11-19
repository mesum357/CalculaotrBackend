-- Migration: Add popular column to calculators table

-- Add popular column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'calculators' AND column_name = 'popular'
    ) THEN
        ALTER TABLE calculators ADD COLUMN popular BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_calculators_popular ON calculators(popular);

