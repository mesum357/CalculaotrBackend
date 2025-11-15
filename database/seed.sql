-- Seed data for categories, subcategories, and calculators
-- This is example data based on the existing structure

-- Insert categories
INSERT INTO categories (name, slug, icon, description) VALUES
('Math', 'math', 'Sigma', 'Mathematical calculators for various computations'),
('Finance', 'finance', 'Landmark', 'Financial calculators for money-related calculations'),
('Physics', 'physics', 'Atom', 'Physics calculators for scientific computations'),
('Chemistry', 'chemistry', 'FlaskConical', 'Chemistry calculators for chemical calculations'),
('Engineering', 'engineering', 'Cog', 'Engineering calculators for technical computations'),
('Health & Fitness', 'health', 'HeartPulse', 'Health and fitness calculators'),
('Conversion', 'conversion', 'ArrowRightLeft', 'Unit conversion calculators'),
('Construction', 'construction', 'Construction', 'Construction and building calculators'),
('Everyday Life', 'everyday', 'Scale', 'Everyday life calculators'),
('Computer Science', 'cs', 'CodeXml', 'Computer science calculators'),
('Statistics', 'statistics', 'BarChart3', 'Statistical calculators'),
('Automotive', 'automotive', 'Car', 'Automotive calculators')
ON CONFLICT (slug) DO NOTHING;

-- Insert subcategories for Math
INSERT INTO subcategories (category_id, name, slug, icon, description)
SELECT c.id, 'Percentages calculators', 'percentages-calculators', 'Percent', 'Percentage-related calculators'
FROM categories c WHERE c.slug = 'math'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO subcategories (category_id, name, slug, icon, description)
SELECT c.id, 'Algebra calculators', 'algebra-calculators', 'Calculator', 'Algebra-related calculators'
FROM categories c WHERE c.slug = 'math'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO subcategories (category_id, name, slug, icon, description)
SELECT c.id, 'Arithmetic calculators', 'arithmetic-calculators', 'Divide', 'Basic arithmetic calculators'
FROM categories c WHERE c.slug = 'math'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO subcategories (category_id, name, slug, icon, description)
SELECT c.id, 'Coordinate geometry calculators', 'coordinate-geometry-calculators', 'AreaChart', 'Coordinate geometry calculators'
FROM categories c WHERE c.slug = 'math'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO subcategories (category_id, name, slug, icon, description)
SELECT c.id, 'Fractions calculators', 'fractions-calculators', 'Sigma', 'Fraction-related calculators'
FROM categories c WHERE c.slug = 'math'
ON CONFLICT (category_id, slug) DO NOTHING;

-- Insert sample calculators
INSERT INTO calculators (category_id, subcategory_id, name, slug, description, href)
SELECT 
    cat.id,
    sub.id,
    'Average Percentage Calculator',
    'average-percentage-calculator',
    'Calculate the average of multiple percentages',
    '/calculators/math/average-percentage-calculator'
FROM categories cat
JOIN subcategories sub ON sub.category_id = cat.id
WHERE cat.slug = 'math' AND sub.slug = 'percentages-calculators'
ON CONFLICT (category_id, subcategory_id, slug) DO NOTHING;

INSERT INTO calculators (category_id, subcategory_id, name, slug, description, href)
SELECT 
    cat.id,
    sub.id,
    'Percentage Calculator',
    'percentage-calculator',
    'Calculate percentages',
    '/calculators/math/percentage-calculator'
FROM categories cat
JOIN subcategories sub ON sub.category_id = cat.id
WHERE cat.slug = 'math' AND sub.slug = 'percentages-calculators'
ON CONFLICT (category_id, subcategory_id, slug) DO NOTHING;

