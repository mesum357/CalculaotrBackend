const express = require('express');
const router = express.Router();
const passport = require('passport');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');

// Helper to prevent session regeneration
function preventSessionRegeneration(req, res, next) {
  // Store original session ID
  const originalSessionId = req.sessionID;
  
  // Override regenerate to prevent session ID change
  const originalRegenerate = req.session.regenerate;
  req.session.regenerate = function(callback) {
    console.log('[Auth] Session regeneration attempted but prevented');
    // Don't actually regenerate, just call callback with existing session
    if (callback) callback(null);
  };
  
  // Also prevent req.login from regenerating by ensuring keepSessionInfo
  const originalLogin = req.login;
  req.login = function(user, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    options.keepSessionInfo = true; // Force keepSessionInfo
    
    return originalLogin.call(this, user, options, callback);
  };
  
  next();
}

// Register (Sign Up)
router.post('/register', async (req, res) => {
  try {
    console.log('[Auth] Registration request received:', {
      email: req.body?.email,
      hasPassword: !!req.body?.password,
      hasName: !!req.body?.name,
      timestamp: new Date().toISOString()
    });
    
    const { email, password, name } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      console.log('[Auth] Registration failed - user already exists:', { email });
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, created_at',
      [email, password_hash, name]
    );

    const user = result.rows[0];
    
    console.log('[Auth] User created successfully, attempting to create session:', {
      userId: user.id,
      email: user.email,
      sessionId: req.sessionID
    });

    // Save user to session before calling req.login to avoid regeneration
    req.session.userId = user.id;
    req.session.save((saveErr) => {
      if (saveErr) {
        console.error('[Auth] Failed to save session:', {
          error: saveErr.message,
          code: saveErr.code
        });
        return res.status(500).json({ 
          error: 'Failed to save session',
          details: saveErr.message
        });
      }

      // Automatically log in the user after registration
      req.login(user, { keepSessionInfo: true }, (err) => {
      if (err) {
        console.error('[Auth] Failed to create session after registration:', {
          error: err.message,
          stack: err.stack,
          code: err.code,
          userId: user.id
        });
        
        // Check if it's a database/session table issue
        if (err.code === '42P01' || err.message.includes('relation') || err.message.includes('session')) {
          return res.status(500).json({ 
            error: 'Failed to log in after registration',
            details: 'Session table may not exist. Please check database initialization.',
            hint: 'Run: backend/database/schema.sql'
          });
        }
        
        return res.status(500).json({ 
          error: 'Failed to log in after registration',
          details: err.message,
          code: err.code
        });
      }
      
        // Save session again to ensure it's persisted
        req.session.save((finalSaveErr) => {
          if (finalSaveErr) {
            console.error('[Auth] Failed to finalize session save:', finalSaveErr.message);
          }
          
          console.log('[Auth] Registration and session creation successful:', {
            userId: user.id,
            email: user.email,
            sessionId: req.sessionID,
            isAuthenticated: req.isAuthenticated()
          });
          
          return res.status(201).json({ 
            message: 'User registered successfully',
            user: { id: user.id, email: user.email, name: user.name },
            sessionId: req.sessionID
          });
        });
      });
    });
  } catch (error) {
    console.error('[Auth] Registration error:', {
      error: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({ 
      error: 'Failed to register user',
      details: error.message,
      code: error.code
    });
  }
});

// Login
router.post('/login', preventSessionRegeneration, (req, res, next) => {
  console.log('[Auth] Login request received:', {
    email: req.body?.email,
    hasPassword: !!req.body?.password,
    sessionId: req.sessionID,
    timestamp: new Date().toISOString()
  });
  
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('[Auth] Authentication error:', {
        error: err.message,
        stack: err.stack,
        code: err.code
      });
      return res.status(500).json({ error: 'Authentication error', details: err.message });
    }
    if (!user) {
      console.log('[Auth] Authentication failed:', {
        info: info?.message,
        email: req.body?.email
      });
      return res.status(401).json({ error: info?.message || 'Invalid credentials' });
    }
    
    console.log('[Auth] Authentication successful, creating session for user:', {
      userId: user.id,
      email: user.email,
      sessionId: req.sessionID,
      hasExistingSession: !!req.session
    });
    
    // Store original session ID to prevent regeneration
    const originalSessionId = req.sessionID;
    console.log('[Auth] Original session ID:', originalSessionId);
    
    // Manually serialize user to session (avoid req.login which regenerates session)
    req.session.passport = { user: user.id };
    req.session.userId = user.id;
    
    // Save session first
    req.session.save((saveErr) => {
      if (saveErr) {
        console.error('[Auth] Failed to save session:', {
          error: saveErr.message,
          code: saveErr.code
        });
        return res.status(500).json({ 
          error: 'Failed to save session',
          details: saveErr.message
        });
      }
      
      // Now use req.login but with keepSessionInfo to prevent regeneration
      // However, we've already saved, so this should just serialize
      req.login(user, { keepSessionInfo: true }, (err) => {
        if (err) {
          console.error('[Auth] Failed to create session:', {
            error: err.message,
            stack: err.stack,
            code: err.code,
            userId: user.id,
            sessionId: req.sessionID
          });
          
          // Check if it's a database/session table issue
          if (err.code === '42P01' || err.message.includes('relation') || err.message.includes('session')) {
            return res.status(500).json({ 
              error: 'Failed to create session', 
              details: 'Session table may not exist. Please check database initialization.',
              hint: 'Run: backend/database/schema.sql'
            });
          }
          
          return res.status(500).json({ 
            error: 'Failed to create session',
            details: err.message,
            code: err.code
          });
        }
        
        // Check if session ID changed
        if (req.sessionID !== originalSessionId) {
          console.warn('[Auth] Session ID changed during login:', {
            original: originalSessionId,
            new: req.sessionID
          });
        }
        
        // Save session again to ensure it's persisted
        req.session.save((finalSaveErr) => {
          if (finalSaveErr) {
            console.error('[Auth] Failed to finalize session save:', finalSaveErr.message);
            return res.status(500).json({ 
              error: 'Failed to save session',
              details: finalSaveErr.message
            });
          }
          
          // Force session to be saved and cookie to be set
          // Touch the session to ensure it's marked as modified
          req.session.touch();
          
          // Ensure cookie is set in response
          const setCookieHeader = res.getHeader('Set-Cookie');
          console.log('[Auth] Set-Cookie header before response:', setCookieHeader);
          
          // Log all response headers for debugging
          console.log('[Auth] Response headers:', {
            'set-cookie': res.getHeader('Set-Cookie'),
            'access-control-allow-credentials': res.getHeader('Access-Control-Allow-Credentials'),
            'access-control-allow-origin': res.getHeader('Access-Control-Allow-Origin'),
            'access-control-expose-headers': res.getHeader('Access-Control-Expose-Headers')
          });
          
          // If no Set-Cookie header, try to force it
          if (!setCookieHeader) {
            console.warn('[Auth] No Set-Cookie header found, attempting to force cookie set');
            // The session middleware should handle this, but if it doesn't,
            // we need to ensure the session is saved
            req.session.save(() => {
              console.log('[Auth] Session saved, Set-Cookie should be set now');
            });
          }
          
          console.log('[Auth] Session created successfully:', {
            userId: user.id,
            email: user.email,
            sessionId: req.sessionID,
            originalSessionId: originalSessionId,
            sessionIdChanged: req.sessionID !== originalSessionId,
            isAuthenticated: req.isAuthenticated(),
            cookie: req.session.cookie,
            setCookieHeader: res.getHeader('Set-Cookie'),
            cookieString: req.session.cookie ? JSON.stringify(req.session.cookie) : 'none'
          });
          
          // Send response
          return res.json({ 
            message: 'Login successful',
            user: { id: user.id, email: user.email, name: user.name },
            sessionId: req.sessionID,
            cookieSet: !!setCookieHeader
          });
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

// Check session (get current user)
router.get('/session', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ 
      authenticated: true,
      user: { 
        id: req.user.id, 
        email: req.user.email, 
        name: req.user.name 
      }
    });
  } else {
    res.json({ authenticated: false, user: null });
  }
});

module.exports = router;

