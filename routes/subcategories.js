const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get all subcategories
router.get('/', async (req, res) => {
  try {
    const { category_id } = req.query;
    let query = 'SELECT s.*, c.name as category_name, c.slug as category_slug FROM subcategories s JOIN categories c ON s.category_id = c.id';
    const params = [];
    
    if (category_id) {
      query += ' WHERE s.category_id = $1';
      params.push(category_id);
    }
    
    query += ' ORDER BY s.name ASC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching subcategories:', error);
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
    
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      code: error.code
    });
  }
});

// Get subcategory by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT s.*, c.name as category_name, c.slug as category_slug 
       FROM subcategories s 
       JOIN categories c ON s.category_id = c.id 
       WHERE s.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subcategory not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching subcategory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get subcategory by slug
router.get('/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { category_id } = req.query;
    
    let query = `SELECT s.*, c.name as category_name, c.slug as category_slug 
                 FROM subcategories s 
                 JOIN categories c ON s.category_id = c.id 
                 WHERE s.slug = $1`;
    const params = [slug];
    
    if (category_id) {
      query += ' AND s.category_id = $2';
      params.push(category_id);
    }
    
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subcategory not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching subcategory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new subcategory
router.post('/', async (req, res) => {
  try {
    const { category_id, name, slug, icon, description } = req.body;
    
    if (!category_id || !name || !slug) {
      return res.status(400).json({ error: 'Category ID, name, and slug are required' });
    }
    
    // Verify category exists
    const categoryCheck = await pool.query(
      'SELECT id FROM categories WHERE id = $1',
      [category_id]
    );
    
    if (categoryCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    const result = await pool.query(
      'INSERT INTO subcategories (category_id, name, slug, icon, description) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [category_id, name, slug, icon, description]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Subcategory with this slug already exists in this category' });
    }
    console.error('Error creating subcategory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a subcategory
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { category_id, name, slug, icon, description } = req.body;
    
    const result = await pool.query(
      'UPDATE subcategories SET category_id = $1, name = $2, slug = $3, icon = $4, description = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
      [category_id, name, slug, icon, description, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subcategory not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Subcategory with this slug already exists in this category' });
    }
    console.error('Error updating subcategory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a subcategory
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM subcategories WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subcategory not found' });
    }
    
    res.json({ message: 'Subcategory deleted successfully' });
  } catch (error) {
    console.error('Error deleting subcategory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

