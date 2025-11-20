const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get all users
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    console.error('Error details:', error.message, error.code);
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        error: 'Database connection failed',
        hint: 'Please check if the database is running and connection details are correct'
      });
    }
    
    if (error.code === '42P01') {
      return res.status(500).json({ 
        error: 'Users table does not exist',
        hint: 'Please run the database schema initialization: backend/database/schema.sql'
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch users',
      details: error.message,
      code: error.code
    });
  }
});

// Get users count
router.get('/count', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM users');
    res.json({ count: parseInt(result.rows[0].count, 10) });
  } catch (error) {
    console.error('Error fetching users count:', error);
    console.error('Error details:', error.message, error.code);
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        error: 'Database connection failed',
        hint: 'Please check if the database is running and connection details are correct'
      });
    }
    
    if (error.code === '42P01') {
      return res.status(500).json({ 
        error: 'Users table does not exist',
        hint: 'Please run the database schema initialization: backend/database/schema.sql'
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch users count',
      details: error.message,
      code: error.code
    });
  }
});

module.exports = router;

