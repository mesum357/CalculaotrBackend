const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get all calculators
router.get('/', async (req, res) => {
  try {
    const { category_id, subcategory_id, is_active, most_used, popular } = req.query;
    
    // Check if new columns exist by trying to query them
    let hasNewColumns = false;
    let hasPopular = false;
    try {
      await pool.query('SELECT most_used FROM calculators LIMIT 1');
      hasNewColumns = true;
      // Check for popular column
      try {
        await pool.query('SELECT popular FROM calculators LIMIT 1');
        hasPopular = true;
      } catch (e) {
        hasPopular = false;
      }
    } catch (e) {
      hasNewColumns = false;
    }
    
    // Build SELECT clause - use explicit columns to avoid issues with missing columns
    let selectClause = `SELECT calc.id, calc.category_id, calc.subcategory_id, 
                               calc.name, calc.slug, calc.description, calc.href, 
                               calc.is_active, calc.created_at, calc.updated_at`;
    
    if (hasNewColumns) {
      selectClause += `, calc.inputs, calc.results, calc.tags, calc.most_used, calc.likes`;
      if (hasPopular) {
        selectClause += `, calc.popular`;
      } else {
        selectClause += `, false as popular`;
      }
    } else {
      // Provide defaults for missing columns
      selectClause += `, '[]'::jsonb as inputs, '[]'::jsonb as results, 
                              ARRAY[]::TEXT[] as tags, false as most_used, 0 as likes, false as popular`;
    }
    
    selectClause += `, cat.name as category_name, cat.slug as category_slug,
                            sub.name as subcategory_name, sub.slug as subcategory_slug`;
    
    let query = `${selectClause}
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
    
    if (most_used !== undefined && hasNewColumns) {
      paramCount++;
      query += ` AND calc.most_used = $${paramCount}`;
      params.push(most_used === 'true');
    } else if (most_used !== undefined && !hasNewColumns) {
      // If most_used column doesn't exist, return empty result when filtering by most_used
      query += ` AND 1=0`;
    }
    
    if (popular !== undefined && hasPopular) {
      paramCount++;
      query += ` AND calc.popular = $${paramCount}`;
      params.push(popular === 'true');
    } else if (popular !== undefined && !hasPopular) {
      // If popular column doesn't exist, return empty result when filtering by popular
      query += ` AND 1=0`;
    }
    
    query += ' ORDER BY calc.name ASC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching calculators:', error);
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
      code: error.code,
      hint: error.code === '42P01' 
        ? 'Database tables do not exist. Run: npm run setup-db'
        : 'Make sure you have run the database migration script to add the new columns (inputs, results, tags, most_used, likes). Run: psql -U postgres -d calculator_db -f backend/database/migration_add_calculator_fields.sql'
    });
  }
});

// Get calculator by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Check if new columns exist
    let hasNewColumns = false;
    try {
      await pool.query('SELECT most_used FROM calculators LIMIT 1');
      hasNewColumns = true;
    } catch (e) {
      hasNewColumns = false;
    }
    
    let selectClause = `SELECT calc.id, calc.category_id, calc.subcategory_id, 
                               calc.name, calc.slug, calc.description, calc.href, 
                               calc.is_active, calc.created_at, calc.updated_at`;
    
    if (hasNewColumns) {
      selectClause += `, calc.inputs, calc.results, calc.tags, calc.most_used, calc.likes`;
    } else {
      selectClause += `, '[]'::jsonb as inputs, '[]'::jsonb as results, 
                              ARRAY[]::TEXT[] as tags, false as most_used, 0 as likes`;
    }
    
    selectClause += `, cat.name as category_name, cat.slug as category_slug,
                            sub.name as subcategory_name, sub.slug as subcategory_slug`;
    
    const result = await pool.query(
      `${selectClause}
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
    console.error('Error details:', error.message, error.code);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      code: error.code
    });
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
    const { 
      category_id, 
      subcategory_id, 
      name, 
      slug, 
      description, 
      href, 
      is_active,
      inputs,
      results,
      tags,
      most_used,
      popular
    } = req.body;
    
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
    
    // Check if new columns exist
    let hasNewColumns = false;
    let hasPopular = false;
    try {
      await pool.query('SELECT most_used FROM calculators LIMIT 1');
      hasNewColumns = true;
      // Check for popular column
      try {
        await pool.query('SELECT popular FROM calculators LIMIT 1');
        hasPopular = true;
      } catch (e) {
        hasPopular = false;
      }
    } catch (e) {
      hasNewColumns = false;
    }
    
    // Build INSERT query dynamically based on available columns
    let insertColumns = `category_id, subcategory_id, name, slug, description, href, is_active`;
    let insertValues = `$1, $2, $3, $4, $5, $6, $7`;
    const params = [
      category_id, 
      subcategory_id, 
      name, 
      slug, 
      description || null, 
      href || null, 
      is_active !== undefined ? is_active : true
    ];
    let paramCount = 7;
    
    if (hasNewColumns) {
      insertColumns += `, inputs, results, tags, most_used`;
      insertValues += `, $${++paramCount}, $${++paramCount}, $${++paramCount}, $${++paramCount}`;
      params.push(
        JSON.stringify(inputs || []),
        JSON.stringify(results || []),
        tags || [],
        most_used || false
      );
      
      if (hasPopular) {
        insertColumns += `, popular`;
        insertValues += `, $${++paramCount}`;
        params.push(popular || false);
      }
    }
    
    const result = await pool.query(
      `INSERT INTO calculators (${insertColumns}) VALUES (${insertValues}) RETURNING *`,
      params
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Calculator with this slug already exists in this category and subcategory' });
    }
    if (error.code === '42703') {
      return res.status(500).json({ 
        error: 'Database schema mismatch',
        message: error.message,
        hint: 'The database may have an old schema. Run the migration script: psql -U postgres -d calculator_db -f backend/database/migration_add_calculator_fields.sql'
      });
    }
    console.error('Error creating calculator:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Update a calculator
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      category_id, 
      subcategory_id, 
      name, 
      slug, 
      description, 
      href, 
      is_active,
      inputs,
      results,
      tags,
      most_used,
      popular
    } = req.body;
    
    // Check if new columns exist
    let hasNewColumns = false;
    let hasPopular = false;
    try {
      await pool.query('SELECT most_used FROM calculators LIMIT 1');
      hasNewColumns = true;
      // Check for popular column
      try {
        await pool.query('SELECT popular FROM calculators LIMIT 1');
        hasPopular = true;
      } catch (e) {
        hasPopular = false;
      }
    } catch (e) {
      hasNewColumns = false;
    }
    
    // Build UPDATE query dynamically based on available columns
    let updateClause = `UPDATE calculators SET 
        category_id = $1, 
        subcategory_id = $2, 
        name = $3, 
        slug = $4, 
        description = $5, 
        href = $6, 
        is_active = $7`;
    const params = [
      category_id, 
      subcategory_id, 
      name, 
      slug, 
      description, 
      href, 
      is_active
    ];
    let paramCount = 7;
    
    if (hasNewColumns) {
      updateClause += `,
        inputs = $${++paramCount},
        results = $${++paramCount},
        tags = $${++paramCount},
        most_used = $${++paramCount}`;
      params.push(
        JSON.stringify(inputs || []),
        JSON.stringify(results || []),
        tags || [],
        most_used || false
      );
      
      if (hasPopular) {
        updateClause += `,
        popular = $${++paramCount}`;
        params.push(popular || false);
      }
    }
    
    updateClause += `,
        updated_at = CURRENT_TIMESTAMP 
      WHERE id = $${++paramCount} RETURNING *`;
    params.push(id);
    
    const result = await pool.query(updateClause, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Calculator not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Calculator with this slug already exists in this category and subcategory' });
    }
    if (error.code === '42703') {
      return res.status(500).json({ 
        error: 'Database schema mismatch',
        message: error.message,
        hint: 'The database may have an old schema. Run the migration script: psql -U postgres -d calculator_db -f backend/database/migration_add_calculator_fields.sql'
      });
    }
    console.error('Error updating calculator:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
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

