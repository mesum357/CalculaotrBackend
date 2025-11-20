const express = require('express');
const router = express.Router();
const { saveCalculatorsBackup } = require('../utils/backup-calculators');

// Manual backup trigger endpoint (for testing)
router.post('/trigger', async (req, res) => {
  try {
    console.log('[Backup API] Manual backup triggered');
    const result = await saveCalculatorsBackup();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Backup created successfully',
        count: result.count,
        path: result.path,
        size: result.size
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        code: result.code
      });
    }
  } catch (error) {
    console.error('[Backup API] Error triggering backup:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// Get backup status/info
router.get('/status', async (req, res) => {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    // Use same path resolution as backup function
    const backendDir = path.resolve(__dirname, '..');
    const projectRoot = path.resolve(backendDir, '..');
    const frontendDir = path.join(projectRoot, 'Frontend');
    const dataDir = path.join(frontendDir, 'data');
    const backupFilePath = path.join(dataDir, 'calculators-backup.json');
    
    try {
      const stats = await fs.stat(backupFilePath);
      const fileContent = await fs.readFile(backupFilePath, 'utf8');
      const backupData = JSON.parse(fileContent);
      
      res.json({
        exists: true,
        path: backupFilePath,
        size: stats.size,
        lastModified: stats.mtime,
        totalCalculators: backupData.total_calculators || 0,
        version: backupData.version,
        lastUpdated: backupData.last_updated
      });
    } catch (err) {
      if (err.code === 'ENOENT') {
        res.json({
          exists: false,
          path: backupFilePath,
          message: 'Backup file does not exist yet'
        });
      } else {
        throw err;
      }
    }
  } catch (error) {
    console.error('[Backup API] Error checking backup status:', error);
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
});

module.exports = router;

