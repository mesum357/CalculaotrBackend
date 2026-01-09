-- Migration: Add radio modes support to calculators
-- This migration adds columns to support multiple calculation modes with radio options

-- Add has_radio_modes column to calculators table
ALTER TABLE calculators ADD COLUMN IF NOT EXISTS has_radio_modes BOOLEAN DEFAULT FALSE;

-- Add radio_options column to calculators table (JSONB to store array of radio options)
ALTER TABLE calculators ADD COLUMN IF NOT EXISTS radio_options JSONB DEFAULT NULL;

-- Create index for better querying of calculators with radio modes
CREATE INDEX IF NOT EXISTS idx_calculators_has_radio_modes ON calculators(has_radio_modes);

-- Comment on new columns
COMMENT ON COLUMN calculators.has_radio_modes IS 'Whether this calculator has multiple calculation modes (radio options)';
COMMENT ON COLUMN calculators.radio_options IS 'JSON array of radio options, each with id, label, inputs, and results';
