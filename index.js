const express = require('express');
const cors = require('cors');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const passport = require('./config/passport');
require('dotenv').config();

const pool = require('./config/database');
const { initializeDatabase } = require('./database/init');
const categoriesRouter = require('./routes/categories');
const subcategoriesRouter = require('./routes/subcategories');
const calculatorsRouter = require('./routes/calculators');
const calculatorInteractionsRouter = require('./routes/calculator-interactions');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const backupRouter = require('./routes/backup');

const app = express();
const port = process.env.PORT || 3001;

// CORS configuration - allow credentials for session cookies
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:9002',
  process.env.NEXTJS_FRONTEND_URL || 'http://localhost:9002',
  process.env.ADMIN_PANEL_URL || 'http://localhost:8080',
  'http://localhost:8080', // Admin panel (local)
  'http://localhost:3000', // Next.js frontend (local, if different)
  'http://localhost:9002', // Next.js frontend (local)
  // Production URLs - Add your Render frontend URLs here
  'https://nextjs-app.onrender.com',
  'https://admin-panel.onrender.com', // If you deploy admin panel
].filter(Boolean); // Remove undefined values

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
  exposedHeaders: ['Set-Cookie'], // Expose Set-Cookie header to frontend
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'], // Allow Cookie header
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session store configuration
const sessionStore = new pgSession({
  pool: pool,
  tableName: 'session',
  createTableIfMissing: false,
});

// Session configuration
const sessionConfig = {
  store: sessionStore,
  name: 'connect.sid',
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false, // CRITICAL: Set to false so uninitialized sessions don't get cookies
  rolling: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  },
};

app.use(session(sessionConfig));

// Middleware to prevent session regeneration and ensure cookies are set
app.use((req, res, next) => {
  // Store original session ID to detect regeneration
  const originalSessionId = req.sessionID;
  
  // Prevent session regeneration by overriding regenerate
  if (req.session && req.session.regenerate) {
    const originalRegenerate = req.session.regenerate.bind(req.session);
    req.session.regenerate = function(callback) {
      console.warn('[Session Middleware] Session regeneration prevented', {
        originalId: originalSessionId,
        currentId: req.sessionID,
        path: req.path
      });
      // Don't actually regenerate, just call callback
      if (callback) callback(null);
    };
  }
  
  // Debug: Log session state on auth requests
  if (req.path.startsWith('/api/auth')) {
    console.log('[Session Middleware] Request:', {
      path: req.path,
      method: req.method,
      sessionID: req.sessionID,
      hasPassport: !!req.session?.passport,
      hasUserId: !!req.session?.userId,
      isAuthenticated: req.isAuthenticated?.() || false,
      hasCookieHeader: !!req.headers.cookie
    });
  }
  
  // Track if response has been sent to prevent double saves
  let responseSent = false;
  let sessionSaved = false;
  const originalJson = res.json.bind(res);
  const originalEnd = res.end.bind(res);
  
  // Helper to check if session has data
  const checkHasSessionData = () => {
    return req.session && req.sessionID && 
      (req.session.passport || req.session.userId);
  };
  
  // Override res.json - check session data at response time
  res.json = function(body) {
    if (responseSent) {
      return originalJson(body);
    }
    
    // Check if session has data at response time (not request time)
    const hasSessionData = checkHasSessionData();
    
    // Only save session if it has data AND hasn't been saved yet
    if (hasSessionData && !sessionSaved) {
      responseSent = true;
      sessionSaved = true;
      
      // Save session before sending response
      req.session.save((err) => {
        if (err) {
          console.error('[Session Middleware] Error saving session:', err);
          originalJson(body);
          return;
        }
        
        // Check if cookie is set
        const setCookie = res.getHeader('Set-Cookie');
        
        if (req.path.startsWith('/api/auth')) {
          console.log('[Session Middleware] Session saved:', {
            sessionId: req.sessionID,
            originalId: originalSessionId,
            idChanged: req.sessionID !== originalSessionId,
            hasSetCookie: !!setCookie,
            path: req.path
          });
        }
        
        // If no cookie and session has data, manually set it
        if (!setCookie && hasSessionData) {
          const crypto = require('crypto');
          const secret = process.env.SESSION_SECRET || 'your-secret-key-change-in-production';
          const signature = crypto
            .createHmac('sha256', secret)
            .update(req.sessionID)
            .digest('base64')
            .replace(/=+$/, '');
          
          const cookieValue = `s:${req.sessionID}.${signature}`;
          const maxAge = Math.floor(req.session.cookie.maxAge / 1000);
          const sameSite = req.session.cookie.sameSite;
          const secure = req.session.cookie.secure;
          
          const cookieString = `connect.sid=${cookieValue}; Path=/; Max-Age=${maxAge}; HttpOnly; ${secure ? 'Secure; ' : ''}SameSite=${sameSite}`;
          res.setHeader('Set-Cookie', cookieString);
          
          if (req.path.startsWith('/api/auth')) {
            console.log('[Session Middleware] Manually set cookie for session with data');
          }
        }
        
        originalJson(body);
      });
      return res;
    }
    
    // No session data or already saved, send response normally
    responseSent = true;
    return originalJson(body);
  };
  
  // Override res.end - check session data at response time
  res.end = function(...args) {
    if (responseSent) {
      return originalEnd.apply(this, args);
    }
    
    // Check if session has data at response time
    const hasSessionData = checkHasSessionData();
    
    // Only save session if it has data AND hasn't been saved yet
    if (hasSessionData && !sessionSaved) {
      responseSent = true;
      sessionSaved = true;
      req.session.save((err) => {
        if (err) {
          console.error('[Session Middleware] Error saving session in res.end:', err);
        }
        originalEnd.apply(this, args);
      });
      return;
    }
    
    responseSent = true;
    originalEnd.apply(this, args);
  };
  
  next();
});

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Session debugging middleware (only in development or when DEBUG_SESSION is set)
if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_SESSION === 'true') {
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/auth')) {
      console.log('[Session Debug Request]', {
        path: req.path,
        method: req.method,
        sessionId: req.sessionID,
        hasSession: !!req.session,
        isAuthenticated: req.isAuthenticated(),
        userId: req.user?.id,
        cookie: req.headers.cookie ? req.headers.cookie.substring(0, 50) + '...' : 'none',
        origin: req.headers.origin,
        referer: req.headers.referer
      });
    }
    
    // Log response headers after response is sent
    const originalEnd = res.end;
    res.end = function(...args) {
      if (req.path.startsWith('/api/auth')) {
        console.log('[Session Debug Response]', {
          path: req.path,
          method: req.method,
          statusCode: res.statusCode,
          setCookie: res.getHeader('Set-Cookie'),
          headers: res.getHeaders()
        });
      }
      originalEnd.apply(this, args);
    };
    
    next();
  });
}

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
app.use('/api/users', usersRouter);
app.use('/api/backup', backupRouter);

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

// Initialize database and start server
async function startServer() {
  // Initialize database schema if needed (non-blocking)
  await initializeDatabase();
  
  // CRITICAL: Fix session table constraint if needed (for login to work)
  const { fixSessionConstraint } = require('./database/fix_session_constraint');
  try {
    await fixSessionConstraint();
  } catch (error) {
    console.warn('⚠️  Could not verify session table constraint:', error.message);
    console.warn('   Login may fail. Run: node backend/database/fix_session_constraint.js');
  }
  
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    console.log(`API endpoints available at http://localhost:${port}/api`);
  });
}

startServer();
