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
        // Find admin by username
        const result = await pool.query(
          'SELECT * FROM admins WHERE username = $1 AND is_active = true',
          [username]
        );
        
        if (result.rows.length === 0) {
          return done(null, false, { message: 'Incorrect username or password.' });
        }

        const admin = result.rows[0];

        // Compare password
        const isMatch = await bcrypt.compare(password, admin.password_hash);
        
        if (!isMatch) {
          return done(null, false, { message: 'Incorrect username or password.' });
        }

        // Remove password hash from admin object
        const { password_hash, ...adminWithoutPassword } = admin;
        return done(null, adminWithoutPassword);
      } catch (error) {
        return done(error);
      }
    }
  )
);

// Note: Serialize/deserialize is handled in passport.js to avoid conflicts

module.exports = passport;

