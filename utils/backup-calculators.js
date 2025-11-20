const fs = require('fs').promises;
const path = require('path');
const pool = require('../config/database');

/**
 * Saves all calculators to a JSON backup file in the Frontend directory
 */
async function saveCalculatorsBackup() {
  try {
    // Get all calculators with their category and subcategory info
    
    // Check if new columns exist
    let hasNewColumns = false;
    let hasPopular = false;
    try {
      await pool.query('SELECT most_used FROM calculators LIMIT 1');
      hasNewColumns = true;
      try {
        await pool.query('SELECT popular FROM calculators LIMIT 1');
        hasPopular = true;
      } catch (e) {
        hasPopular = false;
      }
    } catch (e) {
      hasNewColumns = false;
    }
    
    // Check if subtitle column exists
    let hasSubtitle = false;
    try {
      await pool.query('SELECT subtitle FROM calculators LIMIT 1');
      hasSubtitle = true;
    } catch (e) {
      hasSubtitle = false;
    }
    
    // Build SELECT clause
    let selectClause = `SELECT calc.id, calc.category_id, calc.subcategory_id, 
                               calc.name, calc.slug, calc.description, calc.href, 
                               calc.is_active, calc.created_at, calc.updated_at`;
    
    if (hasSubtitle) {
      selectClause += `, calc.subtitle`;
    }
    
    if (hasNewColumns) {
      selectClause += `, calc.inputs, calc.results, calc.tags, calc.most_used, calc.likes`;
      if (hasPopular) {
        selectClause += `, calc.popular`;
      }
    }
    
    selectClause += `, cat.name as category_name, cat.slug as category_slug,
                            sub.name as subcategory_name, sub.slug as subcategory_slug`;
    
    const query = `${selectClause}
                 FROM calculators calc
                 LEFT JOIN categories cat ON calc.category_id = cat.id
                 LEFT JOIN subcategories sub ON calc.subcategory_id = sub.id
                 ORDER BY calc.name ASC`;
    
    const result = await pool.query(query);
    
    // Format calculators for backup (remove database-specific fields and format for easy restoration)
    const calculatorsBackup = result.rows.map(calc => {
      const backupCalc = {
        name: calc.name,
        slug: calc.slug,
        description: calc.description || null,
        href: calc.href || null,
        is_active: calc.is_active !== undefined ? calc.is_active : true,
      };
      
      // Add category and subcategory as strings (names) for easier restoration
      if (calc.category_name) {
        backupCalc.category = calc.category_name;
      }
      if (calc.subcategory_name) {
        backupCalc.subcategory = calc.subcategory_name;
      }
      
      // Add subtitle if exists
      if (hasSubtitle && calc.subtitle) {
        backupCalc.subtitle = calc.subtitle;
      }
      
      // Add extended fields if they exist
      if (hasNewColumns) {
        backupCalc.inputs = calc.inputs || [];
        backupCalc.results = calc.results || [];
        backupCalc.tags = calc.tags || [];
        backupCalc.most_used = calc.most_used || false;
        backupCalc.likes = calc.likes || 0;
        
        if (hasPopular) {
          backupCalc.popular = calc.popular || false;
        }
      }
      
      return backupCalc;
    });
    
    // Create backup object with metadata
    const backup = {
      version: '1.0',
      last_updated: new Date().toISOString(),
      total_calculators: calculatorsBackup.length,
      calculators: calculatorsBackup
    };
    
    // Determine the path to Frontend directory
    // Backend is in backend/, so we go up one level and into Frontend
    const backendDir = path.resolve(__dirname, '..');
    const projectRoot = path.resolve(backendDir, '..');
    const frontendDir = path.join(projectRoot, 'Frontend');
    const dataDir = path.join(frontendDir, 'data');
    const backupFilePath = path.join(dataDir, 'calculators-backup.json');
    
    // Create data directory if it doesn't exist
    try {
      await fs.mkdir(dataDir, { recursive: true });
    } catch (err) {
      // Directory might already exist, that's fine
      if (err.code !== 'EEXIST') {
        console.warn('Warning: Could not create data directory:', err.message);
      }
    }
    
    // Write backup file
    await fs.writeFile(backupFilePath, JSON.stringify(backup, null, 2), 'utf8');
    
    console.log(`✓ Backup saved: ${calculatorsBackup.length} calculators saved to ${backupFilePath}`);
    return { success: true, count: calculatorsBackup.length, path: backupFilePath };
  } catch (error) {
    console.error('Error saving calculators backup:', error);
    // Don't throw - we don't want backup failures to break the main operation
    return { success: false, error: error.message };
  }
}

module.exports = { saveCalculatorsBackup };

