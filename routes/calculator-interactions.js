const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// ========== LIKES ==========

// Get like count for a calculator
router.get('/likes/:calculatorId', async (req, res) => {
  try {
    const { calculatorId } = req.params;

    // Get total like count
    const countResult = await pool.query(
      'SELECT COUNT(*) as count FROM calculator_likes WHERE calculator_id = $1',
      [calculatorId]
    );
    const likeCount = parseInt(countResult.rows[0].count);

    // Check if current user has liked (only if authenticated)
    let isLiked = false;
    if (req.isAuthenticated() && req.user) {
      const userLikeResult = await pool.query(
        'SELECT id FROM calculator_likes WHERE calculator_id = $1 AND user_id = $2',
        [calculatorId, req.user.id]
      );
      isLiked = userLikeResult.rows.length > 0;
    }

    res.json({ likeCount, isLiked });
  } catch (error) {
    console.error('Error fetching likes:', error);
    res.status(500).json({ error: 'Failed to fetch likes' });
  }
});

// Toggle like for a calculator
router.post('/likes/:calculatorId', async (req, res) => {
  // Require authentication
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: 'Authentication required. Please log in to like calculators.' });
  }

  try {
    const { calculatorId } = req.params;
    const userId = req.user.id;

    // Check if already liked
    let existingLike;
    if (userId) {
      existingLike = await pool.query(
        'SELECT id FROM calculator_likes WHERE calculator_id = $1 AND user_id = $2',
        [calculatorId, userId]
      );
    } else {
      existingLike = await pool.query(
        'SELECT id FROM calculator_likes WHERE calculator_id = $1 AND user_ip = $2',
        [calculatorId, userIP]
      );
    }

    if (existingLike.rows.length > 0) {
      // Unlike: remove the like
      await pool.query(
        'DELETE FROM calculator_likes WHERE calculator_id = $1 AND user_id = $2',
        [calculatorId, userId]
      );
      
      // Update calculator likes count
      await pool.query(
        'UPDATE calculators SET likes = GREATEST(0, likes - 1) WHERE id = $1',
        [calculatorId]
      );

      res.json({ liked: false, message: 'Like removed' });
    } else {
      // Like: add the like
      await pool.query(
        'INSERT INTO calculator_likes (calculator_id, user_id) VALUES ($1, $2)',
        [calculatorId, userId]
      );
      
      // Update calculator likes count
      await pool.query(
        'UPDATE calculators SET likes = COALESCE(likes, 0) + 1 WHERE id = $1',
        [calculatorId]
      );

      res.json({ liked: true, message: 'Like added' });
    }
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

// ========== RATINGS ==========

// Get rating statistics for a calculator
router.get('/ratings/:calculatorId', async (req, res) => {
  try {
    const { calculatorId } = req.params;

    // Get average rating and total count
    const statsResult = await pool.query(
      `SELECT 
        COALESCE(AVG(rating), 0) as average_rating,
        COUNT(*) as total_ratings
       FROM calculator_ratings 
       WHERE calculator_id = $1`,
      [calculatorId]
    );
    
    const averageRating = parseFloat(statsResult.rows[0].average_rating) || 0;
    const totalRatings = parseInt(statsResult.rows[0].total_ratings) || 0;

    // Get user's current rating (only if authenticated)
    let userRating = null;
    if (req.isAuthenticated() && req.user) {
      const userRatingResult = await pool.query(
        'SELECT rating FROM calculator_ratings WHERE calculator_id = $1 AND user_id = $2',
        [calculatorId, req.user.id]
      );
      userRating = userRatingResult.rows.length > 0 ? userRatingResult.rows[0].rating : null;
    }

    res.json({ 
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      totalRatings,
      userRating 
    });
  } catch (error) {
    console.error('Error fetching ratings:', error);
    res.status(500).json({ error: 'Failed to fetch ratings' });
  }
});

// Submit or update a rating
router.post('/ratings/:calculatorId', async (req, res) => {
  // Require authentication
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: 'Authentication required. Please log in to rate calculators.' });
  }

  try {
    const { calculatorId } = req.params;
    const { rating } = req.body;
    const userId = req.user.id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Check if user already rated
    const existingRating = await pool.query(
      'SELECT id FROM calculator_ratings WHERE calculator_id = $1 AND user_id = $2',
      [calculatorId, userId]
    );

    if (existingRating.rows.length > 0) {
      // Update existing rating
      await pool.query(
        'UPDATE calculator_ratings SET rating = $1, updated_at = CURRENT_TIMESTAMP WHERE calculator_id = $2 AND user_id = $3',
        [rating, calculatorId, userId]
      );
      res.json({ message: 'Rating updated', rating });
    } else {
      // Insert new rating
      await pool.query(
        'INSERT INTO calculator_ratings (calculator_id, user_id, rating) VALUES ($1, $2, $3)',
        [calculatorId, userId, rating]
      );
      res.json({ message: 'Rating submitted', rating });
    }
  } catch (error) {
    console.error('Error submitting rating:', error);
    res.status(500).json({ error: 'Failed to submit rating' });
  }
});

// ========== COMMENTS ==========

// Get comments for a calculator
router.get('/comments/:calculatorId', async (req, res) => {
  try {
    const { calculatorId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const result = await pool.query(
      `SELECT 
        c.id, 
        c.comment, 
        c.created_at, 
        c.updated_at, 
        c.user_id,
        c.user_ip,
        u.name as user_name
       FROM calculator_comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.calculator_id = $1 
       ORDER BY c.created_at DESC 
       LIMIT $2 OFFSET $3`,
      [calculatorId, limit, offset]
    );

    // Format comments (show user name if authenticated, otherwise show partial IP)
    const comments = result.rows.map(row => ({
      id: row.id,
      comment: row.comment,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      userName: row.user_name || (row.user_ip ? row.user_ip.split('.').slice(0, 2).join('.') + '.***' : 'Anonymous'),
      isAuthenticated: !!row.user_id
    }));

    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Submit a comment
router.post('/comments/:calculatorId', async (req, res) => {
  // Require authentication
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: 'Authentication required. Please log in to comment.' });
  }

  try {
    const { calculatorId } = req.params;
    const { comment } = req.body;
    const userId = req.user.id;

    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({ error: 'Comment cannot be empty' });
    }

    if (comment.length > 1000) {
      return res.status(400).json({ error: 'Comment is too long (max 1000 characters)' });
    }

    const result = await pool.query(
      `INSERT INTO calculator_comments (calculator_id, user_id, comment) 
       VALUES ($1, $2, $3) 
       RETURNING id, comment, created_at, updated_at, user_id`,
      [calculatorId, userId, comment.trim()]
    );

    const newComment = result.rows[0];
    res.json({
      id: newComment.id,
      comment: newComment.comment,
      createdAt: newComment.created_at,
      updatedAt: newComment.updated_at,
      userName: req.user.name,
      isAuthenticated: true
    });
  } catch (error) {
    console.error('Error submitting comment:', error);
    res.status(500).json({ error: 'Failed to submit comment' });
  }
});

module.exports = router;

