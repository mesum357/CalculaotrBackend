const pool = require('../config/database');

/**
 * Delete "Biology Calculators" and "Every Day" categories from the database
 * This will also delete all associated subcategories and calculators due to CASCADE
 * NOTE: This does NOT delete "Biology" or "Everyday" categories - only the ones with "Calculators" in the name
 */
async function deleteCategories() {
  try {
    console.log('🗑️  Starting deletion of "Biology Calculators" and "Every Day" categories...');
    
    const client = await pool.connect();
    
    try {
      // Start transaction
      await client.query('BEGIN');
      
      // Find categories by name (exact match or contains "Biology Calculators" and "Every Day")
      // Try multiple variations to catch different naming conventions
      const biologyCalculatorsResult = await client.query(
        `SELECT id, name, slug FROM categories 
         WHERE name ILIKE '%Biology%Calculators%' 
            OR name ILIKE 'Biology Calculators'
            OR slug ILIKE '%biology-calculators%'
            OR slug = 'biology-calculators'`
      );
      
      const everyDayResult = await client.query(
        `SELECT id, name, slug FROM categories 
         WHERE name ILIKE '%Every Day%' 
            OR name ILIKE 'Every Day'
            OR slug ILIKE '%every-day%'
            OR slug = 'every-day'`
      );
      
      const biologyCalculatorsCategory = biologyCalculatorsResult.rows[0];
      const everyDayCategory = everyDayResult.rows[0];
      
      if (!biologyCalculatorsCategory && !everyDayCategory) {
        console.log('ℹ️  No categories found to delete ("Biology Calculators" or "Every Day")');
        console.log('ℹ️  Searching for all categories with similar names...');
        
        // Show all categories for debugging
        const allCategories = await client.query('SELECT id, name, slug FROM categories ORDER BY name');
        console.log('📋 All categories in database:');
        allCategories.rows.forEach(cat => {
          console.log(`   - ID: ${cat.id}, Name: "${cat.name}", Slug: "${cat.slug}"`);
        });
        
        await client.query('COMMIT');
        return;
      }
      
      // Count calculators before deletion
      let biologyCalcCount = 0;
      let everyDayCalcCount = 0;
      
      if (biologyCalculatorsCategory) {
        const calcCount = await client.query(
          'SELECT COUNT(*) as count FROM calculators WHERE category_id = $1',
          [biologyCalculatorsCategory.id]
        );
        biologyCalcCount = parseInt(calcCount.rows[0].count);
        console.log(`📊 Found ${biologyCalcCount} calculators in "Biology Calculators" category`);
        console.log(`   Category: "${biologyCalculatorsCategory.name}" (slug: "${biologyCalculatorsCategory.slug}")`);
      }
      
      if (everyDayCategory) {
        const calcCount = await client.query(
          'SELECT COUNT(*) as count FROM calculators WHERE category_id = $1',
          [everyDayCategory.id]
        );
        everyDayCalcCount = parseInt(calcCount.rows[0].count);
        console.log(`📊 Found ${everyDayCalcCount} calculators in "Every Day" category`);
        console.log(`   Category: "${everyDayCategory.name}" (slug: "${everyDayCategory.slug}")`);
      }
      
      // Delete categories (CASCADE will delete subcategories and calculators)
      if (biologyCalculatorsCategory) {
        console.log(`🗑️  Deleting "Biology Calculators" category (ID: ${biologyCalculatorsCategory.id})...`);
        await client.query('DELETE FROM categories WHERE id = $1', [biologyCalculatorsCategory.id]);
        console.log(`✅ Deleted "Biology Calculators" category and ${biologyCalcCount} associated calculators`);
      }
      
      if (everyDayCategory) {
        console.log(`🗑️  Deleting "Every Day" category (ID: ${everyDayCategory.id})...`);
        await client.query('DELETE FROM categories WHERE id = $1', [everyDayCategory.id]);
        console.log(`✅ Deleted "Every Day" category and ${everyDayCalcCount} associated calculators`);
      }
      
      // Commit transaction
      await client.query('COMMIT');
      
      console.log('✅ Successfully deleted categories from database');
      console.log(`📊 Summary:`);
      if (biologyCalculatorsCategory) {
        console.log(`   - "Biology Calculators": Deleted category and ${biologyCalcCount} calculators`);
      }
      if (everyDayCategory) {
        console.log(`   - "Every Day": Deleted category and ${everyDayCalcCount} calculators`);
      }
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Error deleting categories:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
deleteCategories()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

