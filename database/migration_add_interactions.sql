-- Migration: Add calculator interactions (likes, ratings, comments)

-- Calculator Likes table
-- Supports both authenticated users (user_id) and anonymous users (user_ip)
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

-- Create indexes for better query performance
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

-- Trigger to update updated_at for ratings
CREATE TRIGGER update_ratings_updated_at BEFORE UPDATE ON calculator_ratings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at for comments
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON calculator_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

