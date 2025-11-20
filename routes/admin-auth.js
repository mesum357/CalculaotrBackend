const express = require('express');
const router = express.Router();
const passport = require('passport');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
require('../config/passport-admin'); // Load admin passport strategy

// Helper to prevent session regeneration
function preventSessionRegeneration(req, res, next) {
  const originalSessionId = req.sessionID;
  
  const originalRegenerate = req.session.regenerate;
  req.session.regenerate = function(callback) {
    console.log('[Admin Auth] Session regeneration attempted but prevented');
    if (callback) callback(null);
  };
  
  const originalLogin = req.login;
  req.login = function(user, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    options.keepSessionInfo = true;
    
    return originalLogin.call(this, user, options, callback);
  };
  
  next();
}

// Admin Login
router.post('/login', preventSessionRegeneration, (req, res, next) => {
  console.log('[Admin Auth] Login request received:', {
    username: req.body?.username,
    hasPassword: !!req.body?.password,
    sessionId: req.sessionID,
    timestamp: new Date().toISOString()
  });
  
  passport.authenticate('admin-local', (err, admin, info) => {
    if (err) {
      console.error('[Admin Auth] Authentication error:', {
        error: err.message,
        stack: err.stack,
      });
      return res.status(500).json({ error: 'Authentication error', details: err.message });
    }
    if (!admin) {
      console.log('[Admin Auth] Authentication failed:', {
        info: info?.message,
        username: req.body?.username
      });
      return res.status(401).json({ error: info?.message || 'Invalid credentials' });
    }
    
    console.log('[Admin Auth] Authentication successful, creating session for admin:', {
      adminId: admin.id,
      username: admin.username,
      role: admin.role,
      sessionId: req.sessionID,
    });
    
    // Store original session ID to prevent regeneration
    const originalSessionId = req.sessionID;
    
    // Manually serialize admin to session
    req.session.passport = { user: { id: admin.id, type: 'admin' } };
    req.session.adminId = admin.id;
    
    // Save session first
    req.session.save((saveErr) => {
      if (saveErr) {
        console.error('[Admin Auth] Failed to save session:', {
          error: saveErr.message,
          code: saveErr.code
        });
        return res.status(500).json({ 
          error: 'Failed to save session',
          details: saveErr.message
        });
      }
      
      // Use req.login with keepSessionInfo
      req.login(admin, { keepSessionInfo: true }, (err) => {
        if (err) {
          console.error('[Admin Auth] Failed to create session:', {
            error: err.message,
            stack: err.stack,
            adminId: admin.id,
          });
          
          return res.status(500).json({ 
            error: 'Failed to create session',
            details: err.message
          });
        }
        
        console.log('[Admin Auth] Session configured:', {
          sessionId: req.sessionID,
          adminId: admin.id,
          role: admin.role,
          isAuthenticated: req.isAuthenticated()
        });
        
        return res.json({ 
          message: 'Login successful',
          admin: { 
            id: admin.id, 
            username: admin.username,
            role: admin.role,
            permissions: admin.permissions || []
          },
          sessionId: req.sessionID
        });
      });
    });
  })(req, res, next);
});

// Logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to destroy session' });
      }
      res.clearCookie('connect.sid');
      res.json({ message: 'Logout successful' });
    });
  });
});

// Check session (get current admin)
router.get('/session', (req, res) => {
  if (req.isAuthenticated() && req.user && req.user.role) {
    res.json({ 
      authenticated: true,
      admin: { 
        id: req.user.id, 
        username: req.user.username,
        role: req.user.role,
        permissions: req.user.permissions || []
      }
    });
  } else {
    res.json({ authenticated: false, admin: null });
  }
});

// Change password (for authenticated admin)
router.post('/change-password', async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user || !req.user.role) {
      return res.status(401).json({ error: 'Not authenticated as admin' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    // Get admin with password hash
    const result = await pool.query(
      'SELECT password_hash FROM admins WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const admin = result.rows[0];

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.query(
      'UPDATE admins SET password_hash = $1 WHERE id = $2',
      [passwordHash, req.user.id]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('[Admin Auth] Change password error:', error);
    res.status(500).json({ error: 'Failed to change password', details: error.message });
  }
});

// Create sub-admin (only for admin role)
router.post('/create-sub-admin', async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can create sub-admins' });
    }

    const { username, password, permissions } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check if username already exists
    const existingAdmin = await pool.query(
      'SELECT id FROM admins WHERE username = $1',
      [username]
    );
    
    if (existingAdmin.rows.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Default permissions if not provided
    const adminPermissions = permissions && Array.isArray(permissions) 
      ? permissions 
      : [];

    // Create sub-admin
    const result = await pool.query(
      `INSERT INTO admins (username, password_hash, role, permissions, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, username, role, permissions, is_active, created_at`,
      [
        username,
        passwordHash,
        'sub_admin',
        JSON.stringify(adminPermissions),
        true,
        req.user.id
      ]
    );

    const newAdmin = result.rows[0];
    
    res.status(201).json({
      message: 'Sub-admin created successfully',
      admin: {
        id: newAdmin.id,
        username: newAdmin.username,
        role: newAdmin.role,
        permissions: newAdmin.permissions
      }
    });
  } catch (error) {
    console.error('[Admin Auth] Create sub-admin error:', error);
    res.status(500).json({ error: 'Failed to create sub-admin', details: error.message });
  }
});

// Get all admins (only for admin role)
router.get('/admins', async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can view all admins' });
    }

    const result = await pool.query(
      `SELECT id, username, role, permissions, is_active, created_at, created_by
       FROM admins
       ORDER BY created_at DESC`
    );

    res.json({ admins: result.rows });
  } catch (error) {
    console.error('[Admin Auth] Get admins error:', error);
    res.status(500).json({ error: 'Failed to fetch admins', details: error.message });
  }
});

module.exports = router;

