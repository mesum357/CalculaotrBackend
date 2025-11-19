const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'calculator_db',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

// Subcategories organized by category slug - Comprehensive list based on omnicalculator.com
const subcategoriesByCategory = {
  'math': [
    ['Percentages calculators', 'percentages-calculators', 'Percent', 'Percentage-related calculators'],
    ['Algebra calculators', 'algebra-calculators', 'Calculator', 'Algebra-related calculators'],
    ['Arithmetic calculators', 'arithmetic-calculators', 'Divide', 'Basic arithmetic calculators'],
    ['Coordinate geometry calculators', 'coordinate-geometry-calculators', 'AreaChart', 'Coordinate geometry calculators'],
    ['Fractions calculators', 'fractions-calculators', 'Sigma', 'Fraction-related calculators'],
    ['Linear algebra calculators', 'linear-algebra-calculators', 'Grid', 'Linear algebra calculators'],
    ['Trigonometry calculators', 'trigonometry-calculators', 'Triangle', 'Trigonometry calculators'],
    ['2D geometry calculators', '2d-geometry-calculators', 'Shapes', '2D geometry calculators'],
    ['Triangle calculators', 'triangle-calculators', 'Triangle', 'Triangle calculators'],
    ['3D geometry calculators', '3d-geometry-calculators', 'Box', '3D geometry calculators'],
    ['Sequences calculators', 'sequences-calculators', 'List', 'Sequence calculators'],
    ['Exponents and logarithms calculators', 'exponents-logarithms-calculators', 'Function', 'Exponents and logarithms calculators'],
    ['Binary calculators', 'binary-calculators', 'Binary', 'Binary calculators'],
    ['Angle calculators', 'angle-calculators', 'Angle', 'Angle calculators'],
    ['Circle calculators', 'circle-calculators', 'Circle', 'Circle calculators'],
    ['Calculus calculators', 'calculus-calculators', 'Function', 'Calculus calculators'],
    ['Number theory calculators', 'number-theory-calculators', 'Hash', 'Number theory calculators'],
    ['Matrix calculators', 'matrix-calculators', 'Grid', 'Matrix calculators'],
    ['Geometry calculators', 'geometry-calculators', 'Shapes', 'Geometry-related calculators']
  ],
  'finance': [
    ['Loan calculators', 'loan-calculators', 'CreditCard', 'Loan and credit calculators'],
    ['Investment calculators', 'investment-calculators', 'TrendingUp', 'Investment calculators'],
    ['Savings calculators', 'savings-calculators', 'PiggyBank', 'Savings calculators'],
    ['Tax calculators', 'tax-calculators', 'Receipt', 'Tax calculators'],
    ['Currency calculators', 'currency-calculators', 'DollarSign', 'Currency conversion calculators'],
    ['Budget calculators', 'budget-calculators', 'Wallet', 'Budget calculators'],
    ['Retirement calculators', 'retirement-calculators', 'Calendar', 'Retirement planning calculators'],
    ['Mortgage calculators', 'mortgage-calculators', 'Home', 'Mortgage calculators'],
    ['Credit card calculators', 'credit-card-calculators', 'CreditCard', 'Credit card calculators'],
    ['Interest calculators', 'interest-calculators', 'Percent', 'Interest calculators'],
    ['Compound interest calculators', 'compound-interest-calculators', 'TrendingUp', 'Compound interest calculators'],
    ['Annuity calculators', 'annuity-calculators', 'Calendar', 'Annuity calculators'],
    ['Present value calculators', 'present-value-calculators', 'DollarSign', 'Present value calculators'],
    ['Future value calculators', 'future-value-calculators', 'TrendingUp', 'Future value calculators'],
    ['NPV calculators', 'npv-calculators', 'Calculator', 'Net present value calculators'],
    ['IRR calculators', 'irr-calculators', 'Percent', 'Internal rate of return calculators'],
    ['Payback period calculators', 'payback-period-calculators', 'Calendar', 'Payback period calculators'],
    ['Debt calculators', 'debt-calculators', 'CreditCard', 'Debt calculators'],
    ['Salary calculators', 'salary-calculators', 'DollarSign', 'Salary calculators'],
    ['Paycheck calculators', 'paycheck-calculators', 'Receipt', 'Paycheck calculators']
  ],
  'physics': [
    ['Kinematics calculators', 'kinematics-calculators', 'Gauge', 'How things move'],
    ['Dynamics calculators', 'dynamics-calculators', 'Zap', 'Why things move'],
    ['Statics calculators', 'statics-calculators', 'Building', 'When things don\'t move'],
    ['Energy, work, and power calculators', 'energy-work-power-calculators', 'Battery', 'Energy, work, and power calculators'],
    ['Rotational and periodic motion calculators', 'rotational-periodic-motion-calculators', 'Circle', 'Rotational and periodic motion calculators'],
    ['Optics and light calculators', 'optics-light-calculators', 'Eye', 'Optics and light calculators'],
    ['Acoustic waves calculators', 'acoustic-waves-calculators', 'Waves', 'Acoustic waves calculators'],
    ['Materials and continuum mechanics calculators', 'materials-continuum-mechanics-calculators', 'Box', 'Materials and continuum mechanics calculators'],
    ['Machines and mechanisms calculators', 'machines-mechanisms-calculators', 'Cog', 'Machines and mechanisms calculators'],
    ['Astronomy calculators', 'astronomy-calculators', 'Star', 'Astronomy calculators'],
    ['Astrophysics calculators', 'astrophysics-calculators', 'Rocket', 'Astrophysics calculators'],
    ['Relativity calculators', 'relativity-calculators', 'Atom', 'Relativity calculators'],
    ['Electromagnetism calculators', 'electromagnetism-calculators', 'Magnet', 'Electromagnetism calculators'],
    ['Electronics and circuits calculators', 'electronics-circuits-calculators', 'Zap', 'Electronics and circuits calculators'],
    ['Fluid mechanics calculators', 'fluid-mechanics-calculators', 'Droplet', 'Fluid mechanics calculators'],
    ['Atmospheric physics calculators', 'atmospheric-physics-calculators', 'Cloud', 'Atmospheric physics calculators'],
    ['Thermodynamics and heat calculators', 'thermodynamics-heat-calculators', 'Thermometer', 'Thermodynamics and heat calculators'],
    ['Mechanics calculators', 'mechanics-calculators', 'Gauge', 'Mechanics calculators'],
    ['Wave calculators', 'wave-calculators', 'Waves', 'Wave calculators']
  ],
  'chemistry': [
    ['Molar mass calculators', 'molar-mass-calculators', 'Scale', 'Molar mass calculators'],
    ['Stoichiometry calculators', 'stoichiometry-calculators', 'FlaskConical', 'Stoichiometry calculators'],
    ['pH calculators', 'ph-calculators', 'Droplet', 'pH calculators'],
    ['Solution calculators', 'solution-calculators', 'Beaker', 'Solution calculators'],
    ['Reaction calculators', 'reaction-calculators', 'Flame', 'Chemical reaction calculators'],
    ['Concentration calculators', 'concentration-calculators', 'TestTube', 'Concentration calculators'],
    ['Dilution calculators', 'dilution-calculators', 'Droplet', 'Dilution calculators'],
    ['Titration calculators', 'titration-calculators', 'FlaskConical', 'Titration calculators'],
    ['Buffer calculators', 'buffer-calculators', 'Beaker', 'Buffer calculators'],
    ['Equilibrium calculators', 'equilibrium-calculators', 'Scale', 'Equilibrium calculators'],
    ['Thermodynamics calculators', 'thermodynamics-calculators', 'Thermometer', 'Chemical thermodynamics calculators'],
    ['Kinetics calculators', 'kinetics-calculators', 'Timer', 'Chemical kinetics calculators'],
    ['Electrochemistry calculators', 'electrochemistry-calculators', 'Battery', 'Electrochemistry calculators'],
    ['Organic chemistry calculators', 'organic-chemistry-calculators', 'FlaskConical', 'Organic chemistry calculators'],
    ['Gas calculators', 'gas-calculators', 'Wind', 'Gas law calculators']
  ],
  'engineering': [
    ['Structural calculators', 'structural-calculators', 'Building', 'Structural engineering calculators'],
    ['Electrical calculators', 'electrical-calculators', 'Zap', 'Electrical engineering calculators'],
    ['Mechanical calculators', 'mechanical-calculators', 'Cog', 'Mechanical engineering calculators'],
    ['Civil calculators', 'civil-calculators', 'Road', 'Civil engineering calculators'],
    ['Chemical calculators', 'chemical-calculators', 'FlaskConical', 'Chemical engineering calculators'],
    ['Materials calculators', 'materials-calculators', 'Box', 'Materials calculators']
  ],
  'health': [
    ['BMI calculators', 'bmi-calculators', 'Scale', 'Body Mass Index calculators'],
    ['Calorie calculators', 'calorie-calculators', 'Flame', 'Calorie calculators'],
    ['Exercise calculators', 'exercise-calculators', 'Dumbbell', 'Exercise calculators'],
    ['Body fat calculators', 'body-fat-calculators', 'Activity', 'Body fat calculators'],
    ['Fitness calculators', 'fitness-calculators', 'HeartPulse', 'Fitness calculators'],
    ['Workout calculators', 'workout-calculators', 'Trophy', 'Workout calculators'],
    ['BMR calculators', 'bmr-calculators', 'Flame', 'Basal metabolic rate calculators'],
    ['TDEE calculators', 'tdee-calculators', 'Activity', 'Total daily energy expenditure calculators'],
    ['Macro calculators', 'macro-calculators', 'PieChart', 'Macronutrient calculators'],
    ['Running calculators', 'running-calculators', 'Timer', 'Running calculators'],
    ['Cycling calculators', 'cycling-calculators', 'Bike', 'Cycling calculators'],
    ['Swimming calculators', 'swimming-calculators', 'Waves', 'Swimming calculators'],
    ['Weight loss calculators', 'weight-loss-calculators', 'TrendingDown', 'Weight loss calculators'],
    ['Muscle mass calculators', 'muscle-mass-calculators', 'Dumbbell', 'Muscle mass calculators'],
    ['Body water calculators', 'body-water-calculators', 'Droplet', 'Body water calculators']
  ],
  'health-care': [
    ['Medical calculators', 'medical-calculators', 'Stethoscope', 'Medical calculators'],
    ['Dosage calculators', 'dosage-calculators', 'Pill', 'Medication dosage calculators'],
    ['Pediatric dosage calculators', 'pediatric-dosage-calculators', 'Baby', 'Pediatric dosage calculators'],
    ['Heart rate calculators', 'heart-rate-calculators', 'Heart', 'Heart rate calculators'],
    ['Blood pressure calculators', 'blood-pressure-calculators', 'Activity', 'Blood pressure calculators'],
    ['Health assessment calculators', 'health-assessment-calculators', 'Clipboard', 'Health assessment calculators'],
    ['Gynecology & pregnancy calculators', 'gynecology-pregnancy-calculators', 'Heart', 'Gynecology & pregnancy calculators'],
    ['Addiction medicine calculators', 'addiction-medicine-calculators', 'Pill', 'Addiction medicine calculators'],
    ['Urology & nephrology calculators', 'urology-nephrology-calculators', 'Droplet', 'Urology & nephrology calculators'],
    ['Electrolytes & fluids calculators', 'electrolytes-fluids-calculators', 'Droplet', 'Electrolytes & fluids calculators'],
    ['Hematology calculators', 'hematology-calculators', 'Droplet', 'Hematology calculators'],
    ['Percentile calculators', 'percentile-calculators', 'BarChart', 'Percentile calculators'],
    ['Pediatric calculators', 'pediatric-calculators', 'Baby', 'Pediatric calculators'],
    ['Pulmonary calculators', 'pulmonary-calculators', 'Wind', 'Pulmonary calculators'],
    ['Psychiatry & psychology calculators', 'psychiatry-psychology-calculators', 'Brain', 'Psychiatry & psychology calculators'],
    ['Intensive & emergency care calculators', 'intensive-emergency-care-calculators', 'AlertCircle', 'Intensive & emergency care calculators'],
    ['Digestive system calculators', 'digestive-system-calculators', 'Stomach', 'Digestive system calculators'],
    ['Epidemiology calculators', 'epidemiology-calculators', 'Users', 'Epidemiology calculators'],
    ['Radiology calculators', 'radiology-calculators', 'Scan', 'Radiology calculators'],
    ['Geriatric medicine calculators', 'geriatric-medicine-calculators', 'User', 'Geriatric medicine calculators'],
    ['General health calculators', 'general-health-calculators', 'HeartPulse', 'General health calculators'],
    ['COVID-19 vaccine calculators', 'covid19-vaccine-calculators', 'Shield', 'COVID-19 vaccine calculators']
  ],
  'food': [
    ['Calorie calculators', 'calorie-calculators', 'Flame', 'Calorie calculators'],
    ['Recipe calculators', 'recipe-calculators', 'ChefHat', 'Recipe calculators'],
    ['Nutrition calculators', 'nutrition-calculators', 'Apple', 'Nutrition calculators'],
    ['Cooking calculators', 'cooking-calculators', 'UtensilsCrossed', 'Cooking calculators'],
    ['Diet calculators', 'diet-calculators', 'Salad', 'Diet calculators'],
    ['Macro calculators', 'macro-calculators', 'PieChart', 'Macronutrient calculators'],
    ['Meal planning calculators', 'meal-planning-calculators', 'Calendar', 'Meal planning calculators'],
    ['Portion calculators', 'portion-calculators', 'Scale', 'Portion calculators'],
    ['Food cost calculators', 'food-cost-calculators', 'DollarSign', 'Food cost calculators'],
    ['Baking calculators', 'baking-calculators', 'ChefHat', 'Baking calculators'],
    ['Cooking time calculators', 'cooking-time-calculators', 'Timer', 'Cooking time calculators'],
    ['Food storage calculators', 'food-storage-calculators', 'Box', 'Food storage calculators'],
    ['Nutritional value calculators', 'nutritional-value-calculators', 'Apple', 'Nutritional value calculators'],
    ['Allergen calculators', 'allergen-calculators', 'AlertCircle', 'Allergen calculators']
  ],
  'ecology': [
    ['Carbon footprint calculators', 'carbon-footprint-calculators', 'Leaf', 'Carbon footprint calculators'],
    ['Energy calculators', 'energy-calculators', 'Battery', 'Energy calculators'],
    ['Water calculators', 'water-calculators', 'Droplet', 'Water calculators'],
    ['Waste calculators', 'waste-calculators', 'Trash', 'Waste calculators'],
    ['Environmental calculators', 'environmental-calculators', 'TreePine', 'Environmental calculators'],
    ['Sustainability calculators', 'sustainability-calculators', 'Recycle', 'Sustainability calculators'],
    ['Emission calculators', 'emission-calculators', 'Cloud', 'Emission calculators'],
    ['Recycling calculators', 'recycling-calculators', 'Recycle', 'Recycling calculators'],
    ['Compost calculators', 'compost-calculators', 'Leaf', 'Compost calculators'],
    ['Solar calculators', 'solar-calculators', 'Sun', 'Solar calculators'],
    ['Wind energy calculators', 'wind-energy-calculators', 'Wind', 'Wind energy calculators'],
    ['Water footprint calculators', 'water-footprint-calculators', 'Droplet', 'Water footprint calculators'],
    ['Biodiversity calculators', 'biodiversity-calculators', 'TreePine', 'Biodiversity calculators'],
    ['Ecosystem calculators', 'ecosystem-calculators', 'Leaf', 'Ecosystem calculators']
  ],
  'conversion': [
    ['Length converters', 'length-converters', 'Ruler', 'Length conversion calculators'],
    ['Weight converters', 'weight-converters', 'Scale', 'Weight conversion calculators'],
    ['Volume converters', 'volume-converters', 'Beaker', 'Volume conversion calculators'],
    ['Temperature converters', 'temperature-converters', 'Thermometer', 'Temperature conversion calculators'],
    ['Area converters', 'area-converters', 'Square', 'Area conversion calculators'],
    ['Speed converters', 'speed-converters', 'Gauge', 'Speed conversion calculators'],
    ['Time converters', 'time-converters', 'Clock', 'Time conversion calculators'],
    ['Energy converters', 'energy-converters', 'Battery', 'Energy conversion calculators'],
    ['Pressure converters', 'pressure-converters', 'Gauge', 'Pressure conversion calculators'],
    ['Force converters', 'force-converters', 'Zap', 'Force conversion calculators'],
    ['Power converters', 'power-converters', 'Battery', 'Power conversion calculators'],
    ['Data converters', 'data-converters', 'Database', 'Data conversion calculators'],
    ['Angle converters', 'angle-converters', 'Angle', 'Angle conversion calculators'],
    ['Frequency converters', 'frequency-converters', 'Waves', 'Frequency conversion calculators'],
    ['Torque converters', 'torque-converters', 'Cog', 'Torque conversion calculators'],
    ['Density converters', 'density-converters', 'Box', 'Density conversion calculators'],
    ['Fuel economy converters', 'fuel-economy-converters', 'Fuel', 'Fuel economy conversion calculators']
  ],
  'construction': [
    ['Area calculators', 'area-calculators', 'Square', 'Area calculators'],
    ['Volume calculators', 'volume-calculators', 'Box', 'Volume calculators'],
    ['Materials calculators', 'materials-calculators', 'Hammer', 'Materials calculators'],
    ['Cost calculators', 'cost-calculators', 'DollarSign', 'Construction cost calculators'],
    ['Measurement calculators', 'measurement-calculators', 'Ruler', 'Measurement calculators'],
    ['Structural calculators', 'structural-calculators', 'Building', 'Structural calculators'],
    ['Concrete calculators', 'concrete-calculators', 'Building', 'Concrete calculators'],
    ['Steel calculators', 'steel-calculators', 'Building', 'Steel calculators'],
    ['Lumber calculators', 'lumber-calculators', 'TreePine', 'Lumber calculators'],
    ['Roof calculators', 'roof-calculators', 'Home', 'Roof calculators'],
    ['Floor calculators', 'floor-calculators', 'Square', 'Floor calculators'],
    ['Paint calculators', 'paint-calculators', 'Palette', 'Paint calculators'],
    ['Tile calculators', 'tile-calculators', 'Square', 'Tile calculators'],
    ['Insulation calculators', 'insulation-calculators', 'Home', 'Insulation calculators'],
    ['Foundation calculators', 'foundation-calculators', 'Building', 'Foundation calculators']
  ],
  'everyday': [
    ['Age calculators', 'age-calculators', 'Calendar', 'Age calculators'],
    ['Date calculators', 'date-calculators', 'Calendar', 'Date calculators'],
    ['Time calculators', 'time-calculators', 'Clock', 'Time calculators'],
    ['Percentage calculators', 'percentage-calculators', 'Percent', 'Percentage calculators'],
    ['Tip calculators', 'tip-calculators', 'DollarSign', 'Tip calculators'],
    ['Discount calculators', 'discount-calculators', 'Tag', 'Discount calculators'],
    ['Split bill calculators', 'split-bill-calculators', 'Users', 'Split bill calculators'],
    ['Unit price calculators', 'unit-price-calculators', 'DollarSign', 'Unit price calculators'],
    ['Markup calculators', 'markup-calculators', 'Percent', 'Markup calculators'],
    ['Sales tax calculators', 'sales-tax-calculators', 'Receipt', 'Sales tax calculators'],
    ['Gratuity calculators', 'gratuity-calculators', 'DollarSign', 'Gratuity calculators'],
    ['Fuel cost calculators', 'fuel-cost-calculators', 'Fuel', 'Fuel cost calculators'],
    ['Parking calculators', 'parking-calculators', 'Car', 'Parking calculators'],
    ['Laundry calculators', 'laundry-calculators', 'Shirt', 'Laundry calculators']
  ],
  'cs': [
    ['Binary calculators', 'binary-calculators', 'Binary', 'Binary calculators'],
    ['Hex calculators', 'hex-calculators', 'Hash', 'Hexadecimal calculators'],
    ['Encoding calculators', 'encoding-calculators', 'Code', 'Encoding calculators'],
    ['Network calculators', 'network-calculators', 'Network', 'Network calculators'],
    ['Data calculators', 'data-calculators', 'Database', 'Data calculators'],
    ['Algorithm calculators', 'algorithm-calculators', 'CodeXml', 'Algorithm calculators'],
    ['IP calculators', 'ip-calculators', 'Network', 'IP address calculators'],
    ['Subnet calculators', 'subnet-calculators', 'Network', 'Subnet calculators'],
    ['Bandwidth calculators', 'bandwidth-calculators', 'Gauge', 'Bandwidth calculators'],
    ['Hash calculators', 'hash-calculators', 'Hash', 'Hash calculators'],
    ['Base64 calculators', 'base64-calculators', 'Code', 'Base64 calculators'],
    ['URL calculators', 'url-calculators', 'Link', 'URL calculators'],
    ['Password calculators', 'password-calculators', 'Lock', 'Password calculators'],
    ['File size calculators', 'file-size-calculators', 'File', 'File size calculators']
  ],
  'statistics': [
    ['Mean calculators', 'mean-calculators', 'BarChart3', 'Mean calculators'],
    ['Median calculators', 'median-calculators', 'BarChart3', 'Median calculators'],
    ['Standard deviation calculators', 'standard-deviation-calculators', 'TrendingUp', 'Standard deviation calculators'],
    ['Probability calculators', 'probability-calculators', 'Dice', 'Probability calculators'],
    ['Distribution calculators', 'distribution-calculators', 'BarChart', 'Distribution calculators'],
    ['Regression calculators', 'regression-calculators', 'LineChart', 'Regression calculators'],
    ['Variance calculators', 'variance-calculators', 'BarChart3', 'Variance calculators'],
    ['Mode calculators', 'mode-calculators', 'BarChart3', 'Mode calculators'],
    ['Range calculators', 'range-calculators', 'BarChart3', 'Range calculators'],
    ['Z-score calculators', 'z-score-calculators', 'BarChart3', 'Z-score calculators'],
    ['T-test calculators', 't-test-calculators', 'BarChart3', 'T-test calculators'],
    ['Chi-square calculators', 'chi-square-calculators', 'BarChart3', 'Chi-square calculators'],
    ['ANOVA calculators', 'anova-calculators', 'BarChart3', 'ANOVA calculators'],
    ['Correlation calculators', 'correlation-calculators', 'LineChart', 'Correlation calculators'],
    ['Confidence interval calculators', 'confidence-interval-calculators', 'BarChart3', 'Confidence interval calculators']
  ],
  'automotive': [
    ['Fuel calculators', 'fuel-calculators', 'Fuel', 'Fuel calculators'],
    ['Speed calculators', 'speed-calculators', 'Gauge', 'Speed calculators'],
    ['Distance calculators', 'distance-calculators', 'MapPin', 'Distance calculators'],
    ['Maintenance calculators', 'maintenance-calculators', 'Wrench', 'Maintenance calculators'],
    ['Cost calculators', 'cost-calculators', 'DollarSign', 'Automotive cost calculators'],
    ['Performance calculators', 'performance-calculators', 'Gauge', 'Performance calculators'],
    ['MPG calculators', 'mpg-calculators', 'Fuel', 'Miles per gallon calculators'],
    ['Tire calculators', 'tire-calculators', 'Circle', 'Tire calculators'],
    ['Engine calculators', 'engine-calculators', 'Cog', 'Engine calculators'],
    ['Brake calculators', 'brake-calculators', 'AlertCircle', 'Brake calculators'],
    ['Transmission calculators', 'transmission-calculators', 'Cog', 'Transmission calculators'],
    ['Battery calculators', 'battery-calculators', 'Battery', 'Battery calculators'],
    ['Insurance calculators', 'insurance-calculators', 'Shield', 'Car insurance calculators'],
    ['Depreciation calculators', 'depreciation-calculators', 'TrendingDown', 'Car depreciation calculators']
  ],
  'education': [
    ['Grade calculators', 'grade-calculators', 'GraduationCap', 'Grade calculators'],
    ['GPA calculators', 'gpa-calculators', 'Award', 'GPA calculators'],
    ['Test score calculators', 'test-score-calculators', 'Clipboard', 'Test score calculators'],
    ['Study calculators', 'study-calculators', 'Book', 'Study calculators'],
    ['Scholarship calculators', 'scholarship-calculators', 'DollarSign', 'Scholarship calculators'],
    ['Final grade calculators', 'final-grade-calculators', 'GraduationCap', 'Final grade calculators'],
    ['Weighted grade calculators', 'weighted-grade-calculators', 'BarChart3', 'Weighted grade calculators'],
    ['Letter grade calculators', 'letter-grade-calculators', 'Award', 'Letter grade calculators'],
    ['Class rank calculators', 'class-rank-calculators', 'TrendingUp', 'Class rank calculators'],
    ['Credit calculators', 'credit-calculators', 'GraduationCap', 'Credit calculators'],
    ['Tuition calculators', 'tuition-calculators', 'DollarSign', 'Tuition calculators'],
    ['Student loan calculators', 'student-loan-calculators', 'CreditCard', 'Student loan calculators']
  ],
  'sports': [
    ['Pace calculators', 'pace-calculators', 'Timer', 'Pace calculators'],
    ['Score calculators', 'score-calculators', 'Trophy', 'Score calculators'],
    ['Distance calculators', 'distance-calculators', 'MapPin', 'Distance calculators'],
    ['Training calculators', 'training-calculators', 'Dumbbell', 'Training calculators'],
    ['Performance calculators', 'performance-calculators', 'TrendingUp', 'Performance calculators'],
    ['Running pace calculators', 'running-pace-calculators', 'Timer', 'Running pace calculators'],
    ['Marathon calculators', 'marathon-calculators', 'Timer', 'Marathon calculators'],
    ['Basketball calculators', 'basketball-calculators', 'Trophy', 'Basketball calculators'],
    ['Football calculators', 'football-calculators', 'Trophy', 'Football calculators'],
    ['Baseball calculators', 'baseball-calculators', 'Trophy', 'Baseball calculators'],
    ['Golf calculators', 'golf-calculators', 'Trophy', 'Golf calculators'],
    ['Tennis calculators', 'tennis-calculators', 'Trophy', 'Tennis calculators'],
    ['Swimming calculators', 'swimming-calculators', 'Waves', 'Swimming calculators'],
    ['Cycling calculators', 'cycling-calculators', 'Bike', 'Cycling calculators']
  ],
  'travel': [
    ['Distance calculators', 'distance-calculators', 'MapPin', 'Distance calculators'],
    ['Time calculators', 'time-calculators', 'Clock', 'Travel time calculators'],
    ['Cost calculators', 'cost-calculators', 'DollarSign', 'Travel cost calculators'],
    ['Currency calculators', 'currency-calculators', 'DollarSign', 'Currency calculators'],
    ['Route calculators', 'route-calculators', 'Route', 'Route calculators'],
    ['Flight calculators', 'flight-calculators', 'Plane', 'Flight calculators'],
    ['Hotel calculators', 'hotel-calculators', 'Home', 'Hotel calculators'],
    ['Gas cost calculators', 'gas-cost-calculators', 'Fuel', 'Gas cost calculators'],
    ['Mileage calculators', 'mileage-calculators', 'Gauge', 'Mileage calculators'],
    ['Time zone calculators', 'time-zone-calculators', 'Globe', 'Time zone calculators'],
    ['Baggage calculators', 'baggage-calculators', 'Luggage', 'Baggage calculators'],
    ['Travel budget calculators', 'travel-budget-calculators', 'Wallet', 'Travel budget calculators']
  ],
  'real-estate': [
    ['Mortgage calculators', 'mortgage-calculators', 'Home', 'Mortgage calculators'],
    ['ROI calculators', 'roi-calculators', 'TrendingUp', 'Return on investment calculators'],
    ['Property value calculators', 'property-value-calculators', 'Home', 'Property value calculators'],
    ['Rent calculators', 'rent-calculators', 'DollarSign', 'Rent calculators'],
    ['Tax calculators', 'tax-calculators', 'Receipt', 'Property tax calculators'],
    ['Down payment calculators', 'down-payment-calculators', 'DollarSign', 'Down payment calculators'],
    ['Affordability calculators', 'affordability-calculators', 'Home', 'Affordability calculators'],
    ['Refinance calculators', 'refinance-calculators', 'Home', 'Refinance calculators'],
    ['Rental yield calculators', 'rental-yield-calculators', 'TrendingUp', 'Rental yield calculators'],
    ['Capital gains calculators', 'capital-gains-calculators', 'TrendingUp', 'Capital gains calculators'],
    ['Home equity calculators', 'home-equity-calculators', 'Home', 'Home equity calculators'],
    ['Closing cost calculators', 'closing-cost-calculators', 'Receipt', 'Closing cost calculators']
  ],
  'business': [
    ['Profit calculators', 'profit-calculators', 'TrendingUp', 'Profit calculators'],
    ['Loss calculators', 'loss-calculators', 'TrendingDown', 'Loss calculators'],
    ['ROI calculators', 'roi-calculators', 'TrendingUp', 'Return on investment calculators'],
    ['Margin calculators', 'margin-calculators', 'Percent', 'Margin calculators'],
    ['Revenue calculators', 'revenue-calculators', 'DollarSign', 'Revenue calculators'],
    ['Cost calculators', 'cost-calculators', 'Calculator', 'Cost calculators'],
    ['Break-even calculators', 'break-even-calculators', 'TrendingUp', 'Break-even calculators'],
    ['Markup calculators', 'markup-calculators', 'Percent', 'Markup calculators'],
    ['Gross profit calculators', 'gross-profit-calculators', 'TrendingUp', 'Gross profit calculators'],
    ['Net profit calculators', 'net-profit-calculators', 'TrendingUp', 'Net profit calculators'],
    ['EBITDA calculators', 'ebitda-calculators', 'TrendingUp', 'EBITDA calculators'],
    ['Payroll calculators', 'payroll-calculators', 'Users', 'Payroll calculators'],
    ['Depreciation calculators', 'depreciation-calculators', 'TrendingDown', 'Depreciation calculators'],
    ['Inventory calculators', 'inventory-calculators', 'Box', 'Inventory calculators']
  ],
  'biology': [
    ['Gardening and crops calculators', 'gardening-crops-calculators', 'Leaf', 'Gardening and crops calculators'],
    ['Livestock calculators', 'livestock-calculators', 'Cow', 'Livestock calculators'],
    ['Dog calculators', 'dog-calculators', 'Dog', 'Dog calculators'],
    ['Cat calculators', 'cat-calculators', 'Cat', 'Cat calculators'],
    ['Genetics calculators', 'genetics-calculators', 'Dna', 'Genetics calculators'],
    ['Population calculators', 'population-calculators', 'Users', 'Population calculators'],
    ['Growth calculators', 'growth-calculators', 'TrendingUp', 'Growth calculators'],
    ['Cell calculators', 'cell-calculators', 'Circle', 'Cell calculators'],
    ['Evolution calculators', 'evolution-calculators', 'TreePine', 'Evolution calculators'],
    ['Ecology calculators', 'ecology-calculators', 'Leaf', 'Ecology calculators'],
    ['Microbiology calculators', 'microbiology-calculators', 'Microscope', 'Microbiology calculators'],
    ['Botany calculators', 'botany-calculators', 'Flower', 'Botany calculators'],
    ['Zoology calculators', 'zoology-calculators', 'PawPrint', 'Zoology calculators'],
    ['Anatomy calculators', 'anatomy-calculators', 'Heart', 'Anatomy calculators'],
    ['Physiology calculators', 'physiology-calculators', 'Activity', 'Physiology calculators'],
    ['Biochemistry calculators', 'biochemistry-calculators', 'FlaskConical', 'Biochemistry calculators'],
    ['Molecular biology calculators', 'molecular-biology-calculators', 'Dna', 'Molecular biology calculators'],
    ['Bioinformatics calculators', 'bioinformatics-calculators', 'Code', 'Bioinformatics calculators']
  ],
  'science': [
    ['General science calculators', 'general-science-calculators', 'Microscope', 'General science calculators'],
    ['Measurement calculators', 'measurement-calculators', 'Ruler', 'Measurement calculators'],
    ['Unit calculators', 'unit-calculators', 'ArrowRightLeft', 'Unit calculators'],
    ['Astronomy calculators', 'astronomy-calculators', 'Star', 'Astronomy calculators'],
    ['Geology calculators', 'geology-calculators', 'Mountain', 'Geology calculators'],
    ['Meteorology calculators', 'meteorology-calculators', 'Cloud', 'Meteorology calculators'],
    ['Oceanography calculators', 'oceanography-calculators', 'Waves', 'Oceanography calculators']
  ],
  'weather': [
    ['Temperature calculators', 'temperature-calculators', 'Thermometer', 'Temperature calculators'],
    ['Humidity calculators', 'humidity-calculators', 'Droplet', 'Humidity calculators'],
    ['Wind calculators', 'wind-calculators', 'Wind', 'Wind calculators'],
    ['Pressure calculators', 'pressure-calculators', 'Gauge', 'Pressure calculators'],
    ['Climate calculators', 'climate-calculators', 'Cloud', 'Climate calculators'],
    ['Heat index calculators', 'heat-index-calculators', 'Thermometer', 'Heat index calculators'],
    ['Wind chill calculators', 'wind-chill-calculators', 'Wind', 'Wind chill calculators'],
    ['Dew point calculators', 'dew-point-calculators', 'Droplet', 'Dew point calculators'],
    ['UV index calculators', 'uv-index-calculators', 'Sun', 'UV index calculators'],
    ['Precipitation calculators', 'precipitation-calculators', 'CloudRain', 'Precipitation calculators']
  ],
  'time': [
    ['Age calculators', 'age-calculators', 'Calendar', 'Age calculators'],
    ['Date difference calculators', 'date-difference-calculators', 'Calendar', 'Date difference calculators'],
    ['Time zone calculators', 'time-zone-calculators', 'Globe', 'Time zone calculators'],
    ['Duration calculators', 'duration-calculators', 'Timer', 'Duration calculators'],
    ['Countdown calculators', 'countdown-calculators', 'Clock', 'Countdown calculators'],
    ['Time addition calculators', 'time-addition-calculators', 'Plus', 'Time addition calculators'],
    ['Time subtraction calculators', 'time-subtraction-calculators', 'Minus', 'Time subtraction calculators'],
    ['Work hours calculators', 'work-hours-calculators', 'Clock', 'Work hours calculators'],
    ['Overtime calculators', 'overtime-calculators', 'Clock', 'Overtime calculators'],
    ['Time conversion calculators', 'time-conversion-calculators', 'ArrowRightLeft', 'Time conversion calculators']
  ],
  'text': [
    ['Word count calculators', 'word-count-calculators', 'Type', 'Word count calculators'],
    ['Character count calculators', 'character-count-calculators', 'Hash', 'Character count calculators'],
    ['Text analysis calculators', 'text-analysis-calculators', 'FileText', 'Text analysis calculators'],
    ['String calculators', 'string-calculators', 'Type', 'String calculators'],
    ['Paragraph count calculators', 'paragraph-count-calculators', 'FileText', 'Paragraph count calculators'],
    ['Sentence count calculators', 'sentence-count-calculators', 'FileText', 'Sentence count calculators'],
    ['Reading time calculators', 'reading-time-calculators', 'Clock', 'Reading time calculators'],
    ['Text similarity calculators', 'text-similarity-calculators', 'FileText', 'Text similarity calculators'],
    ['Text compression calculators', 'text-compression-calculators', 'File', 'Text compression calculators']
  ],
  'image': [
    ['Size calculators', 'size-calculators', 'Ruler', 'Image size calculators'],
    ['Resolution calculators', 'resolution-calculators', 'Monitor', 'Resolution calculators'],
    ['Format calculators', 'format-calculators', 'Image', 'Image format calculators'],
    ['Compression calculators', 'compression-calculators', 'FileImage', 'Compression calculators'],
    ['Aspect ratio calculators', 'aspect-ratio-calculators', 'Square', 'Aspect ratio calculators'],
    ['DPI calculators', 'dpi-calculators', 'Monitor', 'DPI calculators'],
    ['Image resize calculators', 'image-resize-calculators', 'Maximize', 'Image resize calculators'],
    ['Color depth calculators', 'color-depth-calculators', 'Palette', 'Color depth calculators']
  ],
  'color': [
    ['RGB calculators', 'rgb-calculators', 'Palette', 'RGB calculators'],
    ['HEX calculators', 'hex-calculators', 'Hash', 'HEX calculators'],
    ['HSL calculators', 'hsl-calculators', 'Palette', 'HSL calculators'],
    ['Color converter calculators', 'color-converter-calculators', 'Palette', 'Color converter calculators'],
    ['HSV calculators', 'hsv-calculators', 'Palette', 'HSV calculators'],
    ['CMYK calculators', 'cmyk-calculators', 'Palette', 'CMYK calculators'],
    ['Color picker calculators', 'color-picker-calculators', 'Palette', 'Color picker calculators'],
    ['Color harmony calculators', 'color-harmony-calculators', 'Palette', 'Color harmony calculators'],
    ['Color contrast calculators', 'color-contrast-calculators', 'Palette', 'Color contrast calculators']
  ]
};

async function addSubcategories() {
  console.log('\n=== Adding Subcategories ===\n');
  
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
    // Get all categories
    const categoriesResult = await client.query('SELECT id, slug FROM categories');
    const categories = {};
    categoriesResult.rows.forEach(row => {
      categories[row.slug] = row.id;
    });

    console.log('Adding subcategories...\n');
    let totalAdded = 0;
    let totalSkipped = 0;

    for (const [categorySlug, subcategories] of Object.entries(subcategoriesByCategory)) {
      const categoryId = categories[categorySlug];
      
      if (!categoryId) {
        console.log(`⊘ Category "${categorySlug}" not found, skipping...`);
        continue;
      }

      console.log(`\nCategory: ${categorySlug}`);
      
      for (const [name, slug, icon, description] of subcategories) {
        try {
          const result = await client.query(
            `INSERT INTO subcategories (category_id, name, slug, icon, description) 
             VALUES ($1, $2, $3, $4, $5) 
             ON CONFLICT (category_id, slug) DO NOTHING 
             RETURNING id`,
            [categoryId, name, slug, icon, description]
          );
          
          if (result.rows.length > 0) {
            console.log(`  ✓ Added: ${name}`);
            totalAdded++;
          } else {
            console.log(`  ⊘ Skipped: ${name} (already exists)`);
            totalSkipped++;
          }
        } catch (error) {
          console.error(`  ✗ Error adding ${name}:`, error.message);
        }
      }
    }

    console.log(`\n✓ Completed! Added ${totalAdded} subcategories, skipped ${totalSkipped} existing subcategories.`);
    console.log('\nYou can now see all subcategories in the admin panel.\n');
  } catch (error) {
    console.error('\n✗ Error adding subcategories:');
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

addSubcategories();

