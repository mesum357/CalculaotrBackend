const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get all categories
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM categories ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
    console.error('Error details:', error.message, error.code);
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        error: 'Database connection failed',
        message: 'Cannot connect to PostgreSQL database',
        hint: 'Make sure PostgreSQL is running. On Windows, start the PostgreSQL service from Services (services.msc)'
      });
    }
    
    if (error.code === '28P01') {
      return res.status(503).json({ 
        error: 'Database authentication failed',
        message: 'Password authentication failed for user "postgres"',
        hint: 'Check your DB_PASSWORD in the .env file. It must match your PostgreSQL password. Create backend/.env with: DB_PASSWORD=your_password'
      });
    }
    
    if (error.code === '3D000') {
      return res.status(503).json({ 
        error: 'Database does not exist',
        message: 'Database "calculator_db" does not exist',
        hint: 'Run: npm run setup-db (in the backend directory) to create the database and tables'
      });
    }
    
    // Check if table doesn't exist
    if (error.code === '42P01') {
      return res.status(500).json({ 
        error: 'Database table not found',
        message: 'The categories table does not exist. Please run the database schema setup.',
        hint: 'Run: npm run setup-db'
      });
    }
    
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      code: error.code
    });
  }
});

// Get category by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM categories WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get category by slug
router.get('/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const result = await pool.query(
      'SELECT * FROM categories WHERE slug = $1',
      [slug]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new category
router.post('/', async (req, res) => {
  try {
    const { name, slug, icon, description, meta_title, meta_description, meta_keywords } = req.body;
    
    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug are required' });
    }
    
    // Check if meta tags columns exist
    let hasMetaTags = false;
    try {
      await pool.query('SELECT meta_title FROM categories LIMIT 1');
      hasMetaTags = true;
    } catch (e) {
      hasMetaTags = false;
    }
    
    let result;
    if (hasMetaTags) {
      result = await pool.query(
        'INSERT INTO categories (name, slug, icon, description, meta_title, meta_description, meta_keywords) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [name, slug, icon, description, meta_title || null, meta_description || null, meta_keywords || null]
      );
    } else {
      result = await pool.query(
        'INSERT INTO categories (name, slug, icon, description) VALUES ($1, $2, $3, $4) RETURNING *',
        [name, slug, icon, description]
      );
    }
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'Category with this name or slug already exists' });
    }
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a category
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, icon, description, meta_title, meta_description, meta_keywords } = req.body;
    
    // Check if meta tags columns exist
    let hasMetaTags = false;
    try {
      await pool.query('SELECT meta_title FROM categories LIMIT 1');
      hasMetaTags = true;
    } catch (e) {
      hasMetaTags = false;
    }
    
    let result;
    if (hasMetaTags) {
      result = await pool.query(
        'UPDATE categories SET name = $1, slug = $2, icon = $3, description = $4, meta_title = $5, meta_description = $6, meta_keywords = $7, updated_at = CURRENT_TIMESTAMP WHERE id = $8 RETURNING *',
        [name, slug, icon, description, meta_title || null, meta_description || null, meta_keywords || null, id]
      );
    } else {
      result = await pool.query(
        'UPDATE categories SET name = $1, slug = $2, icon = $3, description = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *',
        [name, slug, icon, description, id]
      );
    }
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Category with this name or slug already exists' });
    }
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a category
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM categories WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

