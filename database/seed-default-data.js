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
      // Always ensure all categories exist (add missing ones)
      // This ensures all Omni Calculator categories are available
      console.log('🌱 Ensuring all categories and subcategories are available...');
      
      // Insert default categories (based on Omni Calculator structure)
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
        ('Sports', 'sports', 'Trophy', 'Sports and fitness calculators'),
        ('Ecology', 'ecology', 'Leaf', 'Ecology and environmental calculators'),
        ('Other', 'other', 'Grid3x3', 'Other calculators')
        ON CONFLICT (slug) DO NOTHING
        RETURNING id, name, slug;
      `;
      
      const categoryResult = await client.query(categoryInsert);
      const existingCategoryCount = await client.query('SELECT COUNT(*) as count FROM categories');
      const totalCount = parseInt(existingCategoryCount.rows[0].count);
      console.log(`✓ Created ${categoryResult.rows.length} new categories. Total categories: ${totalCount}`);
      
      // Get all categories for subcategory creation
      const allCategories = await client.query('SELECT id, slug, name FROM categories');
      const categoryMap = {};
      allCategories.rows.forEach(cat => {
        categoryMap[cat.slug] = cat.id;
      });
      
      // Insert comprehensive subcategories based on Omni Calculator structure
      const subcategories = [
        // Math subcategories
        { categorySlug: 'math', name: 'Percentages', slug: 'percentages', description: 'Percentage-related calculators' },
        { categorySlug: 'math', name: 'Algebra', slug: 'algebra', description: 'Algebra-related calculators' },
        { categorySlug: 'math', name: 'Arithmetic', slug: 'arithmetic', description: 'Basic arithmetic calculators' },
        { categorySlug: 'math', name: 'Coordinate Geometry', slug: 'coordinate-geometry', description: 'Coordinate geometry calculators' },
        { categorySlug: 'math', name: 'Fractions', slug: 'fractions', description: 'Fraction-related calculators' },
        { categorySlug: 'math', name: 'Linear Algebra', slug: 'linear-algebra', description: 'Linear algebra calculators' },
        { categorySlug: 'math', name: 'Trigonometry', slug: 'trigonometry', description: 'Trigonometry calculators' },
        { categorySlug: 'math', name: '2D Geometry', slug: '2d-geometry', description: '2D geometry calculators' },
        { categorySlug: 'math', name: 'Triangle', slug: 'triangle', description: 'Triangle calculators' },
        { categorySlug: 'math', name: '3D Geometry', slug: '3d-geometry', description: '3D geometry calculators' },
        { categorySlug: 'math', name: 'Sequences', slug: 'sequences', description: 'Sequences calculators' },
        { categorySlug: 'math', name: 'Exponents and Logarithms', slug: 'exponents-logarithms', description: 'Exponents and logarithms calculators' },
        { categorySlug: 'math', name: 'Binary', slug: 'binary', description: 'Binary calculators' },
        { categorySlug: 'math', name: 'Angle', slug: 'angle', description: 'Angle calculators' },
        { categorySlug: 'math', name: 'Circle', slug: 'circle', description: 'Circle calculators' },
        
        // Finance subcategories
        { categorySlug: 'finance', name: 'Business Planning', slug: 'business-planning', description: 'Business planning calculators' },
        { categorySlug: 'finance', name: 'Investment', slug: 'investment', description: 'Investment calculators' },
        { categorySlug: 'finance', name: 'Sales', slug: 'sales', description: 'Sales calculators' },
        { categorySlug: 'finance', name: 'Tax and Salary', slug: 'tax-salary', description: 'Tax and salary calculators' },
        { categorySlug: 'finance', name: 'Mortgage and Real Estate', slug: 'mortgage-real-estate', description: 'Mortgage and real estate calculators' },
        { categorySlug: 'finance', name: 'Personal Finance', slug: 'personal-finance', description: 'Personal finance calculators' },
        { categorySlug: 'finance', name: 'Debt Management', slug: 'debt-management', description: 'Debt management calculators' },
        { categorySlug: 'finance', name: 'Microeconomics', slug: 'microeconomics', description: 'Microeconomics calculators' },
        { categorySlug: 'finance', name: 'Macroeconomics', slug: 'macroeconomics', description: 'Macroeconomics calculators' },
        { categorySlug: 'finance', name: 'Retirement', slug: 'retirement', description: 'Retirement calculators' },
        { categorySlug: 'finance', name: 'Equity Investment', slug: 'equity-investment', description: 'Equity investment calculators' },
        { categorySlug: 'finance', name: 'Debt Investment', slug: 'debt-investment', description: 'Debt investment calculators' },
        { categorySlug: 'finance', name: 'Derivatives Investment', slug: 'derivatives-investment', description: 'Derivatives investment calculators' },
        { categorySlug: 'finance', name: 'General Investment', slug: 'general-investment', description: 'General investment calculators' },
        { categorySlug: 'finance', name: 'Indian Finance', slug: 'indian-finance', description: 'Indian finance calculators' },
        { categorySlug: 'finance', name: 'UK Finance', slug: 'uk-finance', description: 'UK finance calculators' },
        
        // Physics subcategories
        { categorySlug: 'physics', name: 'Kinematics', slug: 'kinematics', description: 'Kinematics calculators' },
        { categorySlug: 'physics', name: 'Dynamics', slug: 'dynamics', description: 'Dynamics calculators' },
        { categorySlug: 'physics', name: 'Statics', slug: 'statics', description: 'Statics calculators' },
        { categorySlug: 'physics', name: 'Energy, Work, and Power', slug: 'energy-work-power', description: 'Energy, work, and power calculators' },
        { categorySlug: 'physics', name: 'Rotational and Periodic Motion', slug: 'rotational-periodic-motion', description: 'Rotational and periodic motion calculators' },
        { categorySlug: 'physics', name: 'Optics and Light', slug: 'optics-light', description: 'Optics and light calculators' },
        { categorySlug: 'physics', name: 'Acoustic Waves', slug: 'acoustic-waves', description: 'Acoustic waves calculators' },
        { categorySlug: 'physics', name: 'Materials and Continuum Mechanics', slug: 'materials-continuum-mechanics', description: 'Materials and continuum mechanics calculators' },
        { categorySlug: 'physics', name: 'Machines and Mechanisms', slug: 'machines-mechanisms', description: 'Machines and mechanisms calculators' },
        { categorySlug: 'physics', name: 'Astronomy', slug: 'astronomy', description: 'Astronomy calculators' },
        { categorySlug: 'physics', name: 'Astrophysics', slug: 'astrophysics', description: 'Astrophysics calculators' },
        { categorySlug: 'physics', name: 'Relativity', slug: 'relativity', description: 'Relativity calculators' },
        { categorySlug: 'physics', name: 'Electromagnetism', slug: 'electromagnetism', description: 'Electromagnetism calculators' },
        { categorySlug: 'physics', name: 'Electronics and Circuits', slug: 'electronics-circuits', description: 'Electronics and circuits calculators' },
        { categorySlug: 'physics', name: 'Fluid Mechanics', slug: 'fluid-mechanics', description: 'Fluid mechanics calculators' },
        { categorySlug: 'physics', name: 'Atmospheric Physics', slug: 'atmospheric-physics', description: 'Atmospheric physics calculators' },
        { categorySlug: 'physics', name: 'Thermodynamics and Heat', slug: 'thermodynamics-heat', description: 'Thermodynamics and heat calculators' },
        { categorySlug: 'physics', name: 'Quantum Mechanics', slug: 'quantum-mechanics', description: 'Quantum mechanics calculators' },
        { categorySlug: 'physics', name: 'Everyday Physics and Experiments', slug: 'everyday-physics-experiments', description: 'Everyday physics and experiments calculators' },
        
        // Chemistry subcategories
        { categorySlug: 'chemistry', name: 'General Chemistry', slug: 'general-chemistry', description: 'General chemistry calculators' },
        { categorySlug: 'chemistry', name: 'Stoichiometry', slug: 'stoichiometry', description: 'Stoichiometry calculators' },
        { categorySlug: 'chemistry', name: 'Mixtures and Solutions', slug: 'mixtures-solutions', description: 'Mixtures and solutions calculators' },
        { categorySlug: 'chemistry', name: 'Chemical Reactions', slug: 'chemical-reactions', description: 'Chemical reactions calculators' },
        { categorySlug: 'chemistry', name: 'Chemical Thermodynamics', slug: 'chemical-thermodynamics', description: 'Chemical thermodynamics calculators' },
        { categorySlug: 'chemistry', name: 'Electrochemistry', slug: 'electrochemistry', description: 'Electrochemistry calculators' },
        { categorySlug: 'chemistry', name: 'Physical Chemistry', slug: 'physical-chemistry', description: 'Physical chemistry calculators' },
        { categorySlug: 'chemistry', name: 'Organic Chemistry', slug: 'organic-chemistry', description: 'Organic chemistry calculators' },
        { categorySlug: 'chemistry', name: 'Biochemistry', slug: 'biochemistry', description: 'Biochemistry calculators' },
        
        // Biology subcategories
        { categorySlug: 'biology', name: 'Gardening and Crops', slug: 'gardening-crops', description: 'Gardening and crops calculators' },
        { categorySlug: 'biology', name: 'Livestock', slug: 'livestock', description: 'Livestock calculators' },
        { categorySlug: 'biology', name: 'Dog', slug: 'dog', description: 'Dog calculators' },
        { categorySlug: 'biology', name: 'Cat', slug: 'cat', description: 'Cat calculators' },
        { categorySlug: 'biology', name: 'Animal Pregnancy', slug: 'animal-pregnancy', description: 'Animal pregnancy calculators' },
        { categorySlug: 'biology', name: 'Other Animals', slug: 'other-animals', description: 'Other animals calculators' },
        { categorySlug: 'biology', name: 'Trees & Forestry', slug: 'trees-forestry', description: 'Trees & forestry calculators' },
        { categorySlug: 'biology', name: 'Bio Laboratory', slug: 'bio-laboratory', description: 'Bio laboratory calculators' },
        { categorySlug: 'biology', name: 'Genetics', slug: 'genetics', description: 'Genetics calculators' },
        
        // Health subcategories
        { categorySlug: 'health', name: 'Body Measurements', slug: 'body-measurements', description: 'Body measurements calculators' },
        { categorySlug: 'health', name: 'BMI', slug: 'bmi', description: 'BMI calculators' },
        { categorySlug: 'health', name: 'Army', slug: 'army', description: 'Army calculators' },
        { categorySlug: 'health', name: 'Dietary', slug: 'dietary', description: 'Dietary calculators' },
        { categorySlug: 'health', name: 'Diabetes', slug: 'diabetes', description: 'Diabetes calculators' },
        { categorySlug: 'health', name: 'Metabolic Disorders', slug: 'metabolic-disorders', description: 'Metabolic disorders calculators' },
        { categorySlug: 'health', name: 'Sleep', slug: 'sleep', description: 'Sleep calculators' },
        { categorySlug: 'health', name: 'Cardiovascular System', slug: 'cardiovascular-system', description: 'Cardiovascular system calculators' },
        { categorySlug: 'health', name: 'Gynecology & Pregnancy', slug: 'gynecology-pregnancy', description: 'Gynecology & pregnancy calculators' },
        { categorySlug: 'health', name: 'Addiction Medicine', slug: 'addiction-medicine', description: 'Addiction medicine calculators' },
        { categorySlug: 'health', name: 'Urology & Nephrology', slug: 'urology-nephrology', description: 'Urology & nephrology calculators' },
        { categorySlug: 'health', name: 'Electrolytes & Fluids', slug: 'electrolytes-fluids', description: 'Electrolytes & fluids calculators' },
        { categorySlug: 'health', name: 'Hematology', slug: 'hematology', description: 'Hematology calculators' },
        { categorySlug: 'health', name: 'Percentile', slug: 'percentile', description: 'Percentile calculators' },
        { categorySlug: 'health', name: 'Pediatric', slug: 'pediatric', description: 'Pediatric calculators' },
        { categorySlug: 'health', name: 'Pediatric Dosage', slug: 'pediatric-dosage', description: 'Pediatric dosage calculators' },
        { categorySlug: 'health', name: 'Dosage', slug: 'dosage', description: 'Dosage calculators' },
        { categorySlug: 'health', name: 'Pulmonary', slug: 'pulmonary', description: 'Pulmonary calculators' },
        { categorySlug: 'health', name: 'Psychiatry & Psychology', slug: 'psychiatry-psychology', description: 'Psychiatry & psychology calculators' },
        { categorySlug: 'health', name: 'Intensive & Emergency Care', slug: 'intensive-emergency-care', description: 'Intensive & emergency care calculators' },
        { categorySlug: 'health', name: 'Digestive System', slug: 'digestive-system', description: 'Digestive system calculators' },
        { categorySlug: 'health', name: 'Epidemiology', slug: 'epidemiology', description: 'Epidemiology calculators' },
        { categorySlug: 'health', name: 'Radiology', slug: 'radiology', description: 'Radiology calculators' },
        { categorySlug: 'health', name: 'Geriatric Medicine', slug: 'geriatric-medicine', description: 'Geriatric medicine calculators' },
        { categorySlug: 'health', name: 'General Health', slug: 'general-health', description: 'General health calculators' },
        { categorySlug: 'health', name: 'Covid-19 Vaccine', slug: 'covid-19-vaccine', description: 'Covid-19 vaccine calculators' },
        
        // Conversion subcategories
        { categorySlug: 'conversion', name: 'Length and Area', slug: 'length-area', description: 'Length and area converters' },
        { categorySlug: 'conversion', name: 'Volume and Weight', slug: 'volume-weight', description: 'Volume and weight converters' },
        { categorySlug: 'conversion', name: 'Force, Pressure, and Torque', slug: 'force-pressure-torque', description: 'Force, pressure, and torque converters' },
        { categorySlug: 'conversion', name: 'Earth Measurements', slug: 'earth-measurements', description: 'Earth measurements converters' },
        { categorySlug: 'conversion', name: 'Number', slug: 'number', description: 'Number converters' },
        { categorySlug: 'conversion', name: 'Numeral Systems', slug: 'numeral-systems', description: 'Numeral systems converters' },
        { categorySlug: 'conversion', name: 'Tech and Electronics', slug: 'tech-electronics', description: 'Tech and electronics converters' },
        { categorySlug: 'conversion', name: 'Time', slug: 'time', description: 'Time converters' },
        
        // Construction subcategories
        { categorySlug: 'construction', name: 'Construction Converters', slug: 'construction-converters', description: 'Construction converters' },
        { categorySlug: 'construction', name: 'Construction Materials', slug: 'construction-materials', description: 'Construction materials calculators' },
        { categorySlug: 'construction', name: 'Cement and Concrete', slug: 'cement-concrete', description: 'Cement and concrete calculators' },
        { categorySlug: 'construction', name: 'Home and Garden', slug: 'home-garden', description: 'Home and garden calculators' },
        { categorySlug: 'construction', name: 'Roofing', slug: 'roofing', description: 'Roofing calculators' },
        { categorySlug: 'construction', name: 'Driveway', slug: 'driveway', description: 'Driveway calculators' },
        { categorySlug: 'construction', name: 'Water Tank and Vessels', slug: 'water-tank-vessels', description: 'Water tank and vessels calculators' },
        { categorySlug: 'construction', name: 'Materials Specifications', slug: 'materials-specifications', description: 'Materials specifications calculators' },
        
        // Everyday subcategories
        { categorySlug: 'everyday', name: 'Transportation', slug: 'transportation', description: 'Transportation calculators' },
        { categorySlug: 'everyday', name: 'Clothing and Sewing', slug: 'clothing-sewing', description: 'Clothing and sewing calculators' },
        { categorySlug: 'everyday', name: 'Home Economics', slug: 'home-economics', description: 'Home economics calculators' },
        { categorySlug: 'everyday', name: 'Office, School, and Productivity', slug: 'office-school-productivity', description: 'Office, school, and productivity calculators' },
        { categorySlug: 'everyday', name: 'Leisure and Fun', slug: 'leisure-fun', description: 'Leisure and fun calculators' },
        { categorySlug: 'everyday', name: 'Personal Hygiene', slug: 'personal-hygiene', description: 'Personal hygiene calculators' },
        { categorySlug: 'everyday', name: 'Time and Date', slug: 'time-date', description: 'Time and date calculators' },
        { categorySlug: 'everyday', name: 'Books and Reading', slug: 'books-reading', description: 'Books and reading calculators' },
        
        // Statistics subcategories
        { categorySlug: 'statistics', name: 'Probability Theory and Odds', slug: 'probability-theory-odds', description: 'Probability theory and odds calculators' },
        { categorySlug: 'statistics', name: 'Distributions and Plots', slug: 'distributions-plots', description: 'Distributions and plots calculators' },
        { categorySlug: 'statistics', name: 'Descriptive Statistics', slug: 'descriptive-statistics', description: 'Descriptive statistics calculators' },
        { categorySlug: 'statistics', name: 'Inference, Regression, and Statistical Tests', slug: 'inference-regression-tests', description: 'Inference, regression, and statistical tests calculators' },
        
        // Food subcategories
        { categorySlug: 'food', name: 'Cooking Converters', slug: 'cooking-converters', description: 'Cooking converters' },
        { categorySlug: 'food', name: 'Party', slug: 'party', description: 'Party calculators' },
        { categorySlug: 'food', name: 'Tea and Coffee', slug: 'tea-coffee', description: 'Tea and coffee calculators' },
        { categorySlug: 'food', name: 'Desserts and Baking', slug: 'desserts-baking', description: 'Desserts and baking calculators' },
        { categorySlug: 'food', name: 'Drinks', slug: 'drinks', description: 'Drinks calculators' },
        { categorySlug: 'food', name: 'Thanksgiving', slug: 'thanksgiving', description: 'Thanksgiving calculators' },
        { categorySlug: 'food', name: 'Pizza', slug: 'pizza', description: 'Pizza calculators' },
        
        // Sports subcategories
        { categorySlug: 'sports', name: 'Baseball', slug: 'baseball', description: 'Baseball calculators' },
        { categorySlug: 'sports', name: 'Basketball', slug: 'basketball', description: 'Basketball calculators' },
        { categorySlug: 'sports', name: 'Calories Burned', slug: 'calories-burned', description: 'Calories burned calculators' },
        { categorySlug: 'sports', name: 'Cricket', slug: 'cricket', description: 'Cricket calculators' },
        { categorySlug: 'sports', name: 'Cycling', slug: 'cycling', description: 'Cycling calculators' },
        { categorySlug: 'sports', name: 'Overall Fitness', slug: 'overall-fitness', description: 'Overall fitness calculators' },
        { categorySlug: 'sports', name: 'Performance', slug: 'performance', description: 'Performance calculators' },
        { categorySlug: 'sports', name: 'Running', slug: 'running', description: 'Running calculators' },
        { categorySlug: 'sports', name: 'Triathlon', slug: 'triathlon', description: 'Triathlon calculators' },
        { categorySlug: 'sports', name: 'Watersports', slug: 'watersports', description: 'Watersports calculators' },
        { categorySlug: 'sports', name: 'Weightlifting', slug: 'weightlifting', description: 'Weightlifting calculators' },
        
        // Ecology subcategories
        { categorySlug: 'ecology', name: 'Eco Footprint', slug: 'eco-footprint', description: 'Eco footprint calculators' },
        { categorySlug: 'ecology', name: 'Renewable Energy', slug: 'renewable-energy', description: 'Renewable energy calculators' },
        { categorySlug: 'ecology', name: 'Sustainable Living', slug: 'sustainable-living', description: 'Sustainable living calculators' },
        
        // Other subcategories
        { categorySlug: 'other', name: 'Education', slug: 'education', description: 'Education calculators' },
        { categorySlug: 'other', name: 'Photo and Video', slug: 'photo-video', description: 'Photo and video calculators' },
        { categorySlug: 'other', name: 'Music', slug: 'music', description: 'Music calculators' },
        { categorySlug: 'other', name: 'Tech and Electronics', slug: 'tech-electronics', description: 'Tech and electronics calculators' },
        { categorySlug: 'other', name: 'Internet and Network', slug: 'internet-network', description: 'Internet and network calculators' },
        { categorySlug: 'other', name: 'Video Games', slug: 'video-games', description: 'Video games calculators' },
        { categorySlug: 'other', name: 'Logistics', slug: 'logistics', description: 'Logistics calculators' },
        { categorySlug: 'other', name: 'Seasons and Holidays', slug: 'seasons-holidays', description: 'Seasons and holidays calculators' },
        { categorySlug: 'other', name: 'Earth and Weather', slug: 'earth-weather', description: 'Earth and weather calculators' },
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
      
      const existingSubcategoryCount = await client.query('SELECT COUNT(*) as count FROM subcategories');
      const totalSubcategoryCount = parseInt(existingSubcategoryCount.rows[0].count);
      console.log(`✓ Created ${subcategoryCount} new subcategories. Total subcategories in database: ${totalSubcategoryCount}`);
      console.log('✓ All categories and subcategories are now available (based on Omni Calculator structure)');
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

