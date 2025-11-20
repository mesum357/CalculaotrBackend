const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const pool = require('./database');

// Configure Passport Local Strategy
passport.use(
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
    },
    async (email, password, done) => {
      try {
        // Find user by email
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        
        if (result.rows.length === 0) {
          return done(null, false, { message: 'Incorrect email or password.' });
        }

        const user = result.rows[0];

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        
        if (!isMatch) {
          return done(null, false, { message: 'Incorrect email or password.' });
        }

        // Remove password hash from user object
        const { password_hash, ...userWithoutPassword } = user;
        return done(null, userWithoutPassword);
      } catch (error) {
        return done(error);
      }
    }
  )
);

// Serialize user/admin for session
passport.serializeUser((user, done) => {
  // Check if it's an admin (has role field) or regular user
  if (user.role) {
    // Admin user
    done(null, { id: user.id, type: 'admin' });
  } else {
    // Regular user
    done(null, { id: user.id, type: 'user' });
  }
});

// Deserialize user/admin from session
passport.deserializeUser(async (serialized, done) => {
  try {
    // Handle both old format (just id) and new format (object with id and type)
    let id, type;
    if (typeof serialized === 'object' && serialized.id) {
      id = serialized.id;
      type = serialized.type;
    } else {
      // Legacy format: just id
      id = serialized;
      type = null; // Will try both
    }

    if (type === 'admin') {
      // Load admin
      const result = await pool.query(
        'SELECT id, username, role, permissions, is_active, created_at FROM admins WHERE id = $1 AND is_active = true',
        [id]
      );
      
      if (result.rows.length > 0) {
        const admin = result.rows[0];
        return done(null, admin);
      }
    } else if (type === 'user') {
      // Load regular user
      const result = await pool.query(
        'SELECT id, email, name, created_at FROM users WHERE id = $1',
        [id]
      );
      
      if (result.rows.length > 0) {
        const user = result.rows[0];
        return done(null, user);
      }
    } else {
      // Legacy: Try admin first, then user
      const adminResult = await pool.query(
        'SELECT id, username, role, permissions, is_active, created_at FROM admins WHERE id = $1 AND is_active = true',
        [id]
      );
      
      if (adminResult.rows.length > 0) {
        const admin = adminResult.rows[0];
        return done(null, admin);
      }
      
      const userResult = await pool.query(
        'SELECT id, email, name, created_at FROM users WHERE id = $1',
        [id]
      );
      
      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        return done(null, user);
      }
    }

    return done(null, false);
  } catch (error) {
    done(error);
  }
});

module.exports = passport;

