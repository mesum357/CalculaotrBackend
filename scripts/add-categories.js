const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'calculator_db',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function addCategories() {
  console.log('\n=== Adding Categories ===\n');
  
  let client;
  try {
    client = await pool.connect();
    console.log('✓ Connected to database');
  } catch (error) {
    console.error('\n✗ Failed to connect to database:');
    console.error('  Error:', error.message);
    if (error.code === '28P01') {
      console.error('\n  Password authentication failed. Check your .env file.');
      console.error('  Run: npm run setup-env');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n  PostgreSQL is not running. Start the PostgreSQL service.');
    } else if (error.code === '3D000') {
      console.error('\n  Database does not exist. Run: npm run setup-db');
    }
    process.exit(1);
  }
  
  try {
    // New categories to add
    const newCategories = [
      ['Biology', 'biology', 'Leaf', 'Biology calculators'],
      ['Health', 'health-care', 'Activity', 'Health and medical calculators'],
      ['Food & Nutrition', 'food', 'UtensilsCrossed', 'Food and nutrition calculators'],
      ['Ecology', 'ecology', 'Leaf', 'Ecology and environmental calculators'],
      ['Education', 'education', 'GraduationCap', 'Educational calculators'],
      ['Sports', 'sports', 'Trophy', 'Sports and fitness calculators'],
      ['Travel', 'travel', 'Plane', 'Travel and distance calculators'],
      ['Real Estate', 'real-estate', 'Home', 'Real estate and property calculators'],
      ['Business', 'business', 'Briefcase', 'Business and commerce calculators'],
      ['Science', 'science', 'Microscope', 'General science calculators'],
      ['Weather', 'weather', 'Cloud', 'Weather and climate calculators'],
      ['Time', 'time', 'Clock', 'Time and date calculators'],
      ['Text', 'text', 'Type', 'Text and string calculators'],
      ['Image', 'image', 'Image', 'Image and graphics calculators'],
      ['Color', 'color', 'Palette', 'Color calculators and converters']
    ];

    console.log('Adding categories...\n');
    let added = 0;
    let skipped = 0;

    for (const [name, slug, icon, description] of newCategories) {
      try {
        const result = await client.query(
          `INSERT INTO categories (name, slug, icon, description) 
           VALUES ($1, $2, $3, $4) 
           ON CONFLICT (slug) DO NOTHING 
           RETURNING id`,
          [name, slug, icon, description]
        );
        
        if (result.rows.length > 0) {
          console.log(`✓ Added: ${name}`);
          added++;
        } else {
          console.log(`⊘ Skipped: ${name} (already exists)`);
          skipped++;
        }
      } catch (error) {
        console.error(`✗ Error adding ${name}:`, error.message);
      }
    }

    console.log(`\n✓ Completed! Added ${added} categories, skipped ${skipped} existing categories.`);
    console.log('\nYou can now see all categories in the admin panel.\n');
  } catch (error) {
    console.error('\n✗ Error adding categories:');
    console.error('  Error:', error.message);
    console.error('  Code:', error.code);
    process.exit(1);
  } finally {
    if (client) {
      await client.release();
    }
    await pool.end();
  }
}

addCategories();

