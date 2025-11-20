const pool = require('../config/database');

/**
 * Seed default categories and subcategories if they don't exist
 * This ensures the database always has at least some basic categories
 */
async function seedDefaultCategories() {
  try {
    console.log('🌱 Seeding default categories and subcategories...');
    
    const client = await pool.connect();
    
    try {
      // Check if categories already exist
      const categoryCount = await client.query('SELECT COUNT(*) as count FROM categories');
      const count = parseInt(categoryCount.rows[0].count);
      
      if (count > 0) {
        console.log(`✓ Categories already exist (${count} categories found). Skipping seed.`);
        return true;
      }
      
      console.log('⚠️  No categories found. Creating default categories...');
      
      // Insert default categories
      const categoryInsert = `
        INSERT INTO categories (name, slug, icon, description) VALUES
        ('Math', 'math', 'Sigma', 'Mathematical calculators for various computations'),
        ('Finance', 'finance', 'Landmark', 'Financial calculators for money-related calculations'),
        ('Physics', 'physics', 'Atom', 'Physics calculators for scientific computations'),
        ('Chemistry', 'chemistry', 'FlaskConical', 'Chemistry calculators for chemical calculations'),
        ('Biology', 'biology', 'Leaf', 'Biology calculators'),
        ('Health', 'health', 'HeartPulse', 'Health and fitness calculators'),
        ('Conversion', 'conversion', 'ArrowRightLeft', 'Unit conversion calculators'),
        ('Construction', 'construction', 'Construction', 'Construction and building calculators'),
        ('Everyday', 'everyday', 'Scale', 'Everyday life calculators'),
        ('Statistics', 'statistics', 'BarChart3', 'Statistical calculators'),
        ('Food', 'food', 'UtensilsCrossed', 'Food and nutrition calculators'),
        ('Sports', 'sports', 'Trophy', 'Sports and fitness calculators')
        ON CONFLICT (slug) DO NOTHING
        RETURNING id, name, slug;
      `;
      
      const categoryResult = await client.query(categoryInsert);
      console.log(`✓ Created ${categoryResult.rows.length} categories`);
      
      // Get all categories for subcategory creation
      const allCategories = await client.query('SELECT id, slug, name FROM categories');
      const categoryMap = {};
      allCategories.rows.forEach(cat => {
        categoryMap[cat.slug] = cat.id;
      });
      
      // Insert default subcategories for each category
      const subcategories = [
        // Math subcategories
        { categorySlug: 'math', name: 'Percentages', slug: 'percentages', description: 'Percentage-related calculators' },
        { categorySlug: 'math', name: 'Algebra', slug: 'algebra', description: 'Algebra-related calculators' },
        { categorySlug: 'math', name: 'Arithmetic', slug: 'arithmetic', description: 'Basic arithmetic calculators' },
        { categorySlug: 'math', name: 'Geometry', slug: 'geometry', description: 'Geometry calculators' },
        { categorySlug: 'math', name: 'Fractions', slug: 'fractions', description: 'Fraction-related calculators' },
        
        // Finance subcategories
        { categorySlug: 'finance', name: 'Loans', slug: 'loans', description: 'Loan calculators' },
        { categorySlug: 'finance', name: 'Investments', slug: 'investments', description: 'Investment calculators' },
        { categorySlug: 'finance', name: 'Mortgages', slug: 'mortgages', description: 'Mortgage calculators' },
        { categorySlug: 'finance', name: 'Savings', slug: 'savings', description: 'Savings calculators' },
        
        // Physics subcategories
        { categorySlug: 'physics', name: 'Motion', slug: 'motion', description: 'Motion and kinematics calculators' },
        { categorySlug: 'physics', name: 'Energy', slug: 'energy', description: 'Energy calculators' },
        { categorySlug: 'physics', name: 'Forces', slug: 'forces', description: 'Force calculators' },
        
        // Chemistry subcategories
        { categorySlug: 'chemistry', name: 'Molecular Weight', slug: 'molecular-weight', description: 'Molecular weight calculators' },
        { categorySlug: 'chemistry', name: 'Molarity', slug: 'molarity', description: 'Molarity calculators' },
        
        // Biology subcategories
        { categorySlug: 'biology', name: 'Genetics', slug: 'genetics', description: 'Genetics calculators' },
        { categorySlug: 'biology', name: 'Population', slug: 'population', description: 'Population calculators' },
        
        // Health subcategories
        { categorySlug: 'health', name: 'BMI', slug: 'bmi', description: 'BMI calculators' },
        { categorySlug: 'health', name: 'Calories', slug: 'calories', description: 'Calorie calculators' },
        { categorySlug: 'health', name: 'Body Fat', slug: 'body-fat', description: 'Body fat calculators' },
        
        // Conversion subcategories
        { categorySlug: 'conversion', name: 'Length', slug: 'length', description: 'Length conversion calculators' },
        { categorySlug: 'conversion', name: 'Weight', slug: 'weight', description: 'Weight conversion calculators' },
        { categorySlug: 'conversion', name: 'Temperature', slug: 'temperature', description: 'Temperature conversion calculators' },
        { categorySlug: 'conversion', name: 'Currency', slug: 'currency', description: 'Currency conversion calculators' },
        
        // Construction subcategories
        { categorySlug: 'construction', name: 'Area', slug: 'area', description: 'Area calculators' },
        { categorySlug: 'construction', name: 'Volume', slug: 'volume', description: 'Volume calculators' },
        
        // Everyday subcategories
        { categorySlug: 'everyday', name: 'Time', slug: 'time', description: 'Time calculators' },
        { categorySlug: 'everyday', name: 'Date', slug: 'date', description: 'Date calculators' },
        
        // Statistics subcategories
        { categorySlug: 'statistics', name: 'Probability', slug: 'probability', description: 'Probability calculators' },
        { categorySlug: 'statistics', name: 'Distributions', slug: 'distributions', description: 'Statistical distribution calculators' },
        
        // Food subcategories
        { categorySlug: 'food', name: 'Nutrition', slug: 'nutrition', description: 'Nutrition calculators' },
        { categorySlug: 'food', name: 'Recipes', slug: 'recipes', description: 'Recipe calculators' },
        
        // Sports subcategories
        { categorySlug: 'sports', name: 'Fitness', slug: 'fitness', description: 'Fitness calculators' },
        { categorySlug: 'sports', name: 'Performance', slug: 'performance', description: 'Performance calculators' },
      ];
      
      let subcategoryCount = 0;
      for (const sub of subcategories) {
        const categoryId = categoryMap[sub.categorySlug];
        if (categoryId) {
          try {
            await client.query(`
              INSERT INTO subcategories (category_id, name, slug, description)
              VALUES ($1, $2, $3, $4)
              ON CONFLICT (category_id, slug) DO NOTHING
            `, [categoryId, sub.name, sub.slug, sub.description]);
            subcategoryCount++;
          } catch (err) {
            // Ignore errors if subcategory already exists
            if (err.code !== '23505') {
              console.warn(`   Warning: Could not insert subcategory ${sub.name}:`, err.message);
            }
          }
        }
      }
      
      console.log(`✓ Created ${subcategoryCount} subcategories`);
      console.log('✓ Default categories and subcategories seeded successfully');
      return true;
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('✗ Error seeding default categories:', error.message);
    console.error('   Code:', error.code);
    // Don't fail initialization if seeding fails
    return false;
  }
}

module.exports = { seedDefaultCategories };

