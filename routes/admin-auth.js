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
  req.session.regenerate = function (callback) {
    console.log('[Admin Auth] Session regeneration attempted but prevented');
    if (callback) callback(null);
  };

  const originalLogin = req.login;
  req.login = function (user, options, callback) {
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
  // Trim whitespace from username
  if (req.body?.username) {
    req.body.username = req.body.username.trim();
  }

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

// Update sub-admin (only for admin role)
router.put('/admins/:id', async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can update sub-admins' });
    }

    const adminId = parseInt(req.params.id);
    const { username, permissions, password, is_active } = req.body;

    // Cannot edit yourself through this route
    if (adminId === req.user.id) {
      return res.status(400).json({ error: 'Cannot edit your own account through this route. Use change-password instead.' });
    }

    // Check if the target admin exists and is a sub_admin
    const targetAdmin = await pool.query('SELECT id, role FROM admins WHERE id = $1', [adminId]);
    if (targetAdmin.rows.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    if (targetAdmin.rows[0].role === 'admin') {
      return res.status(400).json({ error: 'Cannot edit the main admin account' });
    }

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (username !== undefined) {
      // Check for duplicate username
      const existing = await pool.query('SELECT id FROM admins WHERE username = $1 AND id != $2', [username, adminId]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'Username already exists' });
      }
      updates.push(`username = $${paramIndex++}`);
      values.push(username);
    }

    if (permissions !== undefined) {
      updates.push(`permissions = $${paramIndex++}`);
      values.push(JSON.stringify(permissions));
    }

    if (password !== undefined && password.length > 0) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
      }
      const passwordHash = await bcrypt.hash(password, 10);
      updates.push(`password_hash = $${paramIndex++}`);
      values.push(passwordHash);
    }

    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(adminId);
    const result = await pool.query(
      `UPDATE admins SET ${updates.join(', ')} WHERE id = $${paramIndex}
       RETURNING id, username, role, permissions, is_active, created_at`,
      values
    );

    res.json({
      message: 'Sub-admin updated successfully',
      admin: result.rows[0]
    });
  } catch (error) {
    console.error('[Admin Auth] Update sub-admin error:', error);
    res.status(500).json({ error: 'Failed to update sub-admin', details: error.message });
  }
});

// Delete sub-admin (only for admin role)
router.delete('/admins/:id', async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can delete sub-admins' });
    }

    const adminId = parseInt(req.params.id);

    // Cannot delete yourself
    if (adminId === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Check if the target admin exists and is a sub_admin
    const targetAdmin = await pool.query('SELECT id, role, username FROM admins WHERE id = $1', [adminId]);
    if (targetAdmin.rows.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    if (targetAdmin.rows[0].role === 'admin') {
      return res.status(400).json({ error: 'Cannot delete the main admin account' });
    }

    await pool.query('DELETE FROM admins WHERE id = $1', [adminId]);

    res.json({
      message: `Sub-admin "${targetAdmin.rows[0].username}" deleted successfully`
    });
  } catch (error) {
    console.error('[Admin Auth] Delete sub-admin error:', error);
    res.status(500).json({ error: 'Failed to delete sub-admin', details: error.message });
  }
});

// Utility endpoint to check/initialize admin user (for troubleshooting)
// This endpoint can be called without authentication to verify admin setup
// Supports both GET (for browser) and POST (for curl/API calls)
const initAdminHandler = async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');

    // Check if admins table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'admins'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      return res.status(500).json({
        error: 'Admins table does not exist',
        hint: 'Run the database migration first'
      });
    }

    // Check if admin user exists
    const adminCheck = await pool.query(
      'SELECT id, username, role, is_active FROM admins WHERE username = $1',
      ['admin']
    );

    if (adminCheck.rows.length > 0) {
      const admin = adminCheck.rows[0];
      return res.json({
        exists: true,
        admin: {
          id: admin.id,
          username: admin.username,
          role: admin.role,
          is_active: admin.is_active
        },
        message: 'Admin user already exists'
      });
    }

    // Create admin user if it doesn't exist
    const passwordHash = await bcrypt.hash('admin123', 10);

    const result = await pool.query(
      `INSERT INTO admins (username, password_hash, role, permissions, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, role, is_active, created_at`,
      [
        'admin',
        passwordHash,
        'admin',
        JSON.stringify(['/', '/calculators', '/users', '/settings']),
        true
      ]
    );

    res.json({
      exists: false,
      created: true,
      admin: {
        id: result.rows[0].id,
        username: result.rows[0].username,
        role: result.rows[0].role,
        is_active: result.rows[0].is_active
      },
      message: 'Admin user created successfully',
      credentials: {
        username: 'admin',
        password: 'admin123'
      }
    });
  } catch (error) {
    console.error('[Admin Auth] Init admin error:', error);
    res.status(500).json({
      error: 'Failed to initialize admin user',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Allow both GET and POST for easier access
router.get('/init-admin', initAdminHandler);
router.post('/init-admin', initAdminHandler);

module.exports = router;

