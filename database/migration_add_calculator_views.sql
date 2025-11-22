-- Migration: Add calculator views tracking table

-- Calculator Views table
-- Tracks when users view calculators (for recently viewed feature)
CREATE TABLE IF NOT EXISTS calculator_views (
    id SERIAL PRIMARY KEY,
    calculator_id INTEGER NOT NULL REFERENCES calculators(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- For authenticated users only
    user_ip VARCHAR(45), -- For anonymous users
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK ((user_id IS NOT NULL) OR (user_ip IS NOT NULL)) -- At least one must be set
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_calculator_views_calculator_id ON calculator_views(calculator_id);
CREATE INDEX IF NOT EXISTS idx_calculator_views_user_id ON calculator_views(user_id);
CREATE INDEX IF NOT EXISTS idx_calculator_views_user_ip ON calculator_views(user_ip);
CREATE INDEX IF NOT EXISTS idx_calculator_views_viewed_at ON calculator_views(viewed_at DESC);

-- Create unique index to prevent duplicate views within a short time (optional - can be removed if you want to track every view)
-- This ensures we only track one view per user per calculator per hour
CREATE UNIQUE INDEX IF NOT EXISTS calculator_views_user_unique 
ON calculator_views(calculator_id, COALESCE(user_id::text, user_ip), DATE_TRUNC('hour', viewed_at));

