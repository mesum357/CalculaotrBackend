-- Migration: Add sub_calculators column to calculators table
-- This allows a single calculator page to contain multiple independent calculator sections

ALTER TABLE calculators ADD COLUMN IF NOT EXISTS sub_calculators JSONB;

-- Each sub_calculator is stored as a JSON array of objects:
-- [
--   {
--     "id": "sub_1716000000",
--     "name": "Sub Calculator Name",
--     "inputs": [{ "key": "...", "label": "...", "type": "number", ... }],
--     "results": [{ "key": "...", "label": "...", "formula": "...", "format": "number" }]
--   }
-- ]
