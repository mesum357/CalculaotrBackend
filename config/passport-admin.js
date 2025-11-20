const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const pool = require('./database');

// Configure Passport Local Strategy for Admin
passport.use(
  'admin-local',
  new LocalStrategy(
    {
      usernameField: 'username',
      passwordField: 'password',
    },
    async (username, password, done) => {
      try {
        // Find admin by username (trim whitespace)
        const trimmedUsername = username.trim();
        console.log('[Passport Admin] Looking for admin with username:', trimmedUsername);
        
        const result = await pool.query(
          'SELECT * FROM admins WHERE username = $1 AND is_active = true',
          [trimmedUsername]
        );
        
        console.log('[Passport Admin] Query result:', {
          found: result.rows.length > 0,
          rowCount: result.rows.length,
          hasUsername: result.rows.length > 0 ? !!result.rows[0].username : false,
          hasPasswordHash: result.rows.length > 0 ? !!result.rows[0].password_hash : false,
        });
        
        if (result.rows.length === 0) {
          // Check if any admin exists at all
          const allAdmins = await pool.query('SELECT username, role, is_active FROM admins LIMIT 5');
          console.log('[Passport Admin] No admin found. Existing admins in database:', allAdmins.rows);
          return done(null, false, { message: 'Incorrect username or password.' });
        }

        const admin = result.rows[0];

        // Compare password
        const isMatch = await bcrypt.compare(password, admin.password_hash);
        
        console.log('[Passport Admin] Password comparison:', {
          username: admin.username,
          passwordMatch: isMatch,
          hasPasswordHash: !!admin.password_hash,
        });
        
        if (!isMatch) {
          return done(null, false, { message: 'Incorrect username or password.' });
        }

        // Remove password hash from admin object
        const { password_hash, ...adminWithoutPassword } = admin;
        console.log('[Passport Admin] Authentication successful for:', admin.username);
        return done(null, adminWithoutPassword);
      } catch (error) {
        console.error('[Passport Admin] Authentication error:', error);
        return done(error);
      }
    }
  )
);

// Note: Serialize/deserialize is handled in passport.js to avoid conflicts

module.exports = passport;

