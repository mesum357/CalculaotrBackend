const express = require('express');
const cors = require('cors');
require('dotenv').config();

const categoriesRouter = require('./routes/categories');
const subcategoriesRouter = require('./routes/subcategories');
const calculatorsRouter = require('./routes/calculators');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// API Routes
app.use('/api/categories', categoriesRouter);
app.use('/api/subcategories', subcategoriesRouter);
app.use('/api/calculators', calculatorsRouter);

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
