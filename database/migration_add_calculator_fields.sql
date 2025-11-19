-- Migration script to add new fields to calculators table
-- Run this if you have an existing database

-- Add new columns if they don't exist
DO $$ 
BEGIN
    -- Add inputs column (JSONB)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'calculators' AND column_name = 'inputs') THEN
        ALTER TABLE calculators ADD COLUMN inputs JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- Add results column (JSONB)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'calculators' AND column_name = 'results') THEN
        ALTER TABLE calculators ADD COLUMN results JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- Add tags column (TEXT[])
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'calculators' AND column_name = 'tags') THEN
        ALTER TABLE calculators ADD COLUMN tags TEXT[] DEFAULT ARRAY[]::TEXT[];
    END IF;

    -- Add most_used column (BOOLEAN)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'calculators' AND column_name = 'most_used') THEN
        ALTER TABLE calculators ADD COLUMN most_used BOOLEAN DEFAULT false;
    END IF;

    -- Add likes column (INTEGER)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'calculators' AND column_name = 'likes') THEN
        ALTER TABLE calculators ADD COLUMN likes INTEGER DEFAULT 0;
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_calculators_most_used ON calculators(most_used);
CREATE INDEX IF NOT EXISTS idx_calculators_is_active ON calculators(is_active);

