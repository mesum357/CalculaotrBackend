const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get all calculators
router.get('/', async (req, res) => {
  try {
    const { category_id, subcategory_id, is_active } = req.query;
    let query = `SELECT calc.*, 
                        cat.name as category_name, cat.slug as category_slug,
                        sub.name as subcategory_name, sub.slug as subcategory_slug
                 FROM calculators calc
                 JOIN categories cat ON calc.category_id = cat.id
                 JOIN subcategories sub ON calc.subcategory_id = sub.id
                 WHERE 1=1`;
    const params = [];
    let paramCount = 0;
    
    if (category_id) {
      paramCount++;
      query += ` AND calc.category_id = $${paramCount}`;
      params.push(category_id);
    }
    
    if (subcategory_id) {
      paramCount++;
      query += ` AND calc.subcategory_id = $${paramCount}`;
      params.push(subcategory_id);
    }
    
    if (is_active !== undefined) {
      paramCount++;
      query += ` AND calc.is_active = $${paramCount}`;
      params.push(is_active === 'true');
    }
    
    query += ' ORDER BY calc.name ASC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching calculators:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get calculator by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT calc.*, 
              cat.name as category_name, cat.slug as category_slug,
              sub.name as subcategory_name, sub.slug as subcategory_slug
       FROM calculators calc
       JOIN categories cat ON calc.category_id = cat.id
       JOIN subcategories sub ON calc.subcategory_id = sub.id
       WHERE calc.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Calculator not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching calculator:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get calculator by slug
router.get('/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { category_id, subcategory_id } = req.query;
    
    let query = `SELECT calc.*, 
                        cat.name as category_name, cat.slug as category_slug,
                        sub.name as subcategory_name, sub.slug as subcategory_slug
                 FROM calculators calc
                 JOIN categories cat ON calc.category_id = cat.id
                 JOIN subcategories sub ON calc.subcategory_id = sub.id
                 WHERE calc.slug = $1`;
    const params = [slug];
    let paramCount = 1;
    
    if (category_id) {
      paramCount++;
      query += ` AND calc.category_id = $${paramCount}`;
      params.push(category_id);
    }
    
    if (subcategory_id) {
      paramCount++;
      query += ` AND calc.subcategory_id = $${paramCount}`;
      params.push(subcategory_id);
    }
    
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Calculator not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching calculator:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new calculator
router.post('/', async (req, res) => {
  try {
    const { category_id, subcategory_id, name, slug, description, href, is_active } = req.body;
    
    if (!category_id || !subcategory_id || !name || !slug) {
      return res.status(400).json({ error: 'Category ID, subcategory ID, name, and slug are required' });
    }
    
    // Verify category exists
    const categoryCheck = await pool.query(
      'SELECT id FROM categories WHERE id = $1',
      [category_id]
    );
    
    if (categoryCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    // Verify subcategory exists and belongs to category
    const subcategoryCheck = await pool.query(
      'SELECT id FROM subcategories WHERE id = $1 AND category_id = $2',
      [subcategory_id, category_id]
    );
    
    if (subcategoryCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Subcategory not found or does not belong to the specified category' });
    }
    
    const result = await pool.query(
      'INSERT INTO calculators (category_id, subcategory_id, name, slug, description, href, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [category_id, subcategory_id, name, slug, description, href, is_active !== undefined ? is_active : true]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Calculator with this slug already exists in this category and subcategory' });
    }
    console.error('Error creating calculator:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a calculator
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { category_id, subcategory_id, name, slug, description, href, is_active } = req.body;
    
    const result = await pool.query(
      'UPDATE calculators SET category_id = $1, subcategory_id = $2, name = $3, slug = $4, description = $5, href = $6, is_active = $7, updated_at = CURRENT_TIMESTAMP WHERE id = $8 RETURNING *',
      [category_id, subcategory_id, name, slug, description, href, is_active, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Calculator not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Calculator with this slug already exists in this category and subcategory' });
    }
    console.error('Error updating calculator:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a calculator
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM calculators WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Calculator not found' });
    }
    
    res.json({ message: 'Calculator deleted successfully' });
  } catch (error) {
    console.error('Error deleting calculator:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

