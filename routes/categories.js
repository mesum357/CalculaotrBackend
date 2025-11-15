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
    res.status(500).json({ error: 'Internal server error' });
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
    const { name, slug, icon, description } = req.body;
    
    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug are required' });
    }
    
    const result = await pool.query(
      'INSERT INTO categories (name, slug, icon, description) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, slug, icon, description]
    );
    
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
    const { name, slug, icon, description } = req.body;
    
    const result = await pool.query(
      'UPDATE categories SET name = $1, slug = $2, icon = $3, description = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *',
      [name, slug, icon, description, id]
    );
    
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

