const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

// Run subtitle migration
router.post('/subtitle', async (req, res) => {
  try {
    console.log('[Migration] Starting subtitle column migration...');
    
    // Read migration file
    const migrationPath = path.join(__dirname, '../database/migration_add_subtitle.sql');
    const migration = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute migration
    await pool.query(migration);
    
    console.log('[Migration] Subtitle column migration completed successfully');
    
    res.json({ 
      success: true, 
      message: 'Subtitle column migration completed successfully' 
    });
  } catch (error) {
    console.error('[Migration] Error running subtitle migration:', error);
    
    // If column already exists, that's okay
    if (error.message && error.message.includes('already exists')) {
      return res.json({ 
        success: true, 
        message: 'Subtitle column already exists' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: error.message,
      code: error.code 
    });
  }
});

// Check if subtitle column exists
router.get('/subtitle/check', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'calculators' AND column_name = 'subtitle'
    `);
    
    const exists = result.rows.length > 0;
    
    res.json({ 
      exists,
      message: exists 
        ? 'Subtitle column exists' 
        : 'Subtitle column does not exist' 
    });
  } catch (error) {
    console.error('[Migration] Error checking subtitle column:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;

