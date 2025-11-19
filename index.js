const express = require('express');
const cors = require('cors');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const passport = require('./config/passport');
require('dotenv').config();

const pool = require('./config/database');
const categoriesRouter = require('./routes/categories');
const subcategoriesRouter = require('./routes/subcategories');
const calculatorsRouter = require('./routes/calculators');
const calculatorInteractionsRouter = require('./routes/calculator-interactions');
const authRouter = require('./routes/auth');

const app = express();
const port = process.env.PORT || 3001;

// CORS configuration - allow credentials for session cookies
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:9002',
  'http://localhost:8080', // Admin panel
  'http://localhost:3000', // Next.js frontend (if different)
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins in development
      // In production, you might want to uncomment the line below:
      // callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(
  session({
    store: new pgSession({
      pool: pool,
      tableName: 'session', // Use default table name 'session'
      createTableIfMissing: true, // Automatically create table if it doesn't exist
    }),
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production (HTTPS)
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: 'lax',
    },
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// API Routes
app.use('/api/categories', categoriesRouter);
app.use('/api/subcategories', subcategoriesRouter);
app.use('/api/calculators', calculatorsRouter);
app.use('/api/calculator-interactions', calculatorInteractionsRouter);
app.use('/api/auth', authRouter);

// Legacy endpoint for average percentage calculator (for backward compatibility)
app.get('/api/calculators/average-percentage', async (req, res) => {
  const { values } = req.query;
  if (!values) {
    return res.json({ result: null });
  }
  
  const numericValues = values.split(',').map(v => parseFloat(v)).filter(v => !isNaN(v));
  if (numericValues.length > 0) {
    const sum = numericValues.reduce((acc, val) => acc + val, 0);
    const avg = sum / numericValues.length;
    res.json({ result: avg });
  } else {
    res.json({ result: null });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Don't send response if headers already sent
  if (res.headersSent) {
    return next(err);
  }
  
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log(`API endpoints available at http://localhost:${port}/api`);
});
