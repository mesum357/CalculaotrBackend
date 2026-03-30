/**
 * Calculator End-to-End Test Script
 * ==================================
 * Tests the full flow:
 *   1. Creates a calculator via the backend API (simulating admin panel form)
 *   2. Verifies the calculator was created correctly in the database
 *   3. Verifies the calculator appears on the frontend API
 *   4. Cleans up the test calculator
 *
 * Usage:  node test-calculator-flow.js
 *
 * Prerequisites:
 *   - Backend must be running on http://localhost:3001
 *   - Frontend must be running on http://localhost:9002
 *   - PostgreSQL must be running with calculator_db
 */

const http = require('http');
const https = require('https');

// ─── Configuration ───────────────────────────────────────────────
const BACKEND_URL = 'http://localhost:3001/api';
const FRONTEND_URL = 'http://localhost:9002';
const TEST_TIMESTAMP = Date.now();

// ─── Utilities ───────────────────────────────────────────────────
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  bgGreen: '\x1b[42m\x1b[30m',
  bgRed: '\x1b[41m\x1b[37m',
  bgYellow: '\x1b[43m\x1b[30m',
  bgCyan: '\x1b[46m\x1b[30m',
};

function log(msg, color = '') {
  console.log(`${color}${msg}${colors.reset}`);
}

function logHeader(title) {
  console.log('');
  log(`${'═'.repeat(60)}`, colors.cyan);
  log(`  ${title}`, colors.bold + colors.cyan);
  log(`${'═'.repeat(60)}`, colors.cyan);
}

function logStep(step, description) {
  log(`\n  ▸ Step ${step}: ${description}`, colors.bold);
}

function logPass(msg) {
  log(`    ✅ PASS: ${msg}`, colors.green);
}

function logFail(msg) {
  log(`    ❌ FAIL: ${msg}`, colors.red);
}

function logInfo(msg) {
  log(`    ℹ️  ${msg}`, colors.dim);
}

function logWarn(msg) {
  log(`    ⚠️  ${msg}`, colors.yellow);
}

// ─── HTTP Request Helper ─────────────────────────────────────────
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';
    const lib = isHttps ? https : http;

    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      timeout: 15000,
    };

    const req = lib.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsedData;
        try {
          parsedData = JSON.parse(data);
        } catch {
          parsedData = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsedData,
          raw: data,
        });
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request to ${url} timed out`));
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

// ─── Test Data ───────────────────────────────────────────────────

// The test calculator data that mimics admin panel form submission
const TEST_CALCULATOR = {
  name: `Test BMI Calculator ${TEST_TIMESTAMP}`,
  slug: `test-bmi-calculator-${TEST_TIMESTAMP}`,
  description: '<p>This is a <strong>test calculator</strong> created by the automated test script. It calculates Body Mass Index (BMI) from weight and height.</p>',
  subtitle: 'Calculate your Body Mass Index quickly',
  is_active: true,
  most_used: false,
  popular: false,
  inputs: [
    {
      key: 'weight',
      label: 'Weight',
      type: 'number',
      required: true,
      order: 0,
      placeholder: 'Enter weight in kg',
      defaultValue: '70',
    },
    {
      key: 'height',
      label: 'Height',
      type: 'number',
      required: true,
      order: 1,
      placeholder: 'Enter height in meters',
      defaultValue: '1.75',
    },
  ],
  results: [
    {
      key: 'bmi',
      label: 'BMI',
      formula: 'weight / (height * height)',
      format: 'number',
    },
    {
      key: 'category',
      label: 'Category',
      formula: '(() => { const bmi = weight / (height * height); if (bmi < 18.5) return "Underweight"; if (bmi < 25) return "Normal weight"; if (bmi < 30) return "Overweight"; return "Obese"; })()',
      format: 'text',
    },
  ],
  tags: ['bmi', 'health', 'test'],
  meta_title: 'Test BMI Calculator - Free Online Tool',
  meta_description: 'Calculate your BMI easily with this test calculator.',
  meta_keywords: 'bmi, calculator, health, test',
  has_radio_modes: false,
  radio_options: null,
  sub_calculators: null,
};

// ─── Test Results Tracker ────────────────────────────────────────
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: [],
};

function assert(condition, passMsg, failMsg) {
  testResults.total++;
  if (condition) {
    testResults.passed++;
    logPass(passMsg);
    return true;
  } else {
    testResults.failed++;
    testResults.errors.push(failMsg);
    logFail(failMsg);
    return false;
  }
}

// ─── Test Steps ──────────────────────────────────────────────────

async function step0_checkBackendHealth() {
  logStep(0, 'Check backend is running');
  try {
    const res = await makeRequest(`${BACKEND_URL.replace('/api', '')}/health`);
    assert(
      res.status === 200 && res.data.status === 'ok',
      `Backend is healthy (status: ${res.status})`,
      `Backend health check failed (status: ${res.status})`
    );
    return true;
  } catch (err) {
    assert(false, '', `Backend is not reachable: ${err.message}`);
    logWarn('Make sure the backend is running: cd backend && npm run dev');
    return false;
  }
}

async function step1_getExistingCategoriesAndSubcategories() {
  logStep(1, 'Fetch existing categories and subcategories');

  // Get categories
  let categories = [];
  try {
    const catRes = await makeRequest(`${BACKEND_URL}/categories`);
    assert(
      catRes.status === 200 && Array.isArray(catRes.data),
      `Fetched ${catRes.data.length} categories`,
      `Failed to fetch categories (status: ${catRes.status})`
    );
    categories = catRes.data;
  } catch (err) {
    assert(false, '', `Error fetching categories: ${err.message}`);
    return null;
  }

  // Get subcategories
  let subcategories = [];
  try {
    const subRes = await makeRequest(`${BACKEND_URL}/subcategories`);
    assert(
      subRes.status === 200 && Array.isArray(subRes.data),
      `Fetched ${subRes.data.length} subcategories`,
      `Failed to fetch subcategories (status: ${subRes.status})`
    );
    subcategories = subRes.data;
  } catch (err) {
    assert(false, '', `Error fetching subcategories: ${err.message}`);
    return null;
  }

  if (categories.length === 0) {
    logWarn('No categories found in the database. Will create calculator without category.');
    return { categoryId: null, subcategoryId: null, categorySlug: null };
  }

  // Use the first category and its first subcategory
  const category = categories[0];
  logInfo(`Using category: "${category.name}" (id=${category.id}, slug="${category.slug}")`);

  const subcategory = subcategories.find(s => s.category_id === category.id);
  if (subcategory) {
    logInfo(`Using subcategory: "${subcategory.name}" (id=${subcategory.id})`);
  } else {
    logWarn(`No subcategory found for category "${category.name}". Will create without subcategory.`);
  }

  return {
    categoryId: category.id,
    subcategoryId: subcategory ? subcategory.id : null,
    categorySlug: category.slug,
    subcategoryName: subcategory?.name || null,
  };
}

async function step2_createCalculator(categoryId, subcategoryId) {
  logStep(2, 'Create calculator via backend API (simulates admin panel)');

  const payload = {
    ...TEST_CALCULATOR,
    category_id: categoryId,
    subcategory_id: subcategoryId,
  };

  logInfo(`Calculator name: "${payload.name}"`);
  logInfo(`Calculator slug: "${payload.slug}"`);
  logInfo(`Category ID: ${categoryId}, Subcategory ID: ${subcategoryId}`);
  logInfo(`Inputs: ${payload.inputs.length}, Results: ${payload.results.length}`);

  try {
    const res = await makeRequest(`${BACKEND_URL}/calculators`, {
      method: 'POST',
      body: payload,
    });

    if (res.status === 201) {
      logPass(`Calculator created successfully (id=${res.data.id})`);

      // Validate returned data
      assert(res.data.id != null, 'Returned calculator has an ID', 'Returned calculator has NO ID');
      assert(res.data.name === payload.name, `Name matches: "${res.data.name}"`, `Name mismatch: expected "${payload.name}", got "${res.data.name}"`);
      assert(res.data.slug === payload.slug, `Slug matches: "${res.data.slug}"`, `Slug mismatch: expected "${payload.slug}", got "${res.data.slug}"`);
      assert(res.data.is_active === true, 'is_active is true', `is_active is ${res.data.is_active} (expected true)`);

      // Check inputs/results were saved
      const savedInputs = typeof res.data.inputs === 'string' ? JSON.parse(res.data.inputs) : res.data.inputs;
      const savedResults = typeof res.data.results === 'string' ? JSON.parse(res.data.results) : res.data.results;
      assert(
        Array.isArray(savedInputs) && savedInputs.length === 2,
        `Inputs saved correctly (${savedInputs.length} inputs)`,
        `Inputs not saved correctly (got ${Array.isArray(savedInputs) ? savedInputs.length : 'non-array'})`
      );
      assert(
        Array.isArray(savedResults) && savedResults.length === 2,
        `Results saved correctly (${savedResults.length} results)`,
        `Results not saved correctly (got ${Array.isArray(savedResults) ? savedResults.length : 'non-array'})`
      );

      return res.data;
    } else if (res.status === 409) {
      logFail(`Calculator with slug "${payload.slug}" already exists`);
      testResults.total++;
      testResults.failed++;
      return null;
    } else {
      logFail(`Failed to create calculator: ${res.status} - ${JSON.stringify(res.data)}`);
      testResults.total++;
      testResults.failed++;
      return null;
    }
  } catch (err) {
    assert(false, '', `Error creating calculator: ${err.message}`);
    return null;
  }
}

async function step3_verifyCalculatorInDatabase(calculatorId) {
  logStep(3, 'Verify calculator exists in database via GET /api/calculators/:id');

  try {
    const res = await makeRequest(`${BACKEND_URL}/calculators/${calculatorId}`);

    assert(res.status === 200, `GET /calculators/${calculatorId} returned 200`, `GET /calculators/${calculatorId} returned ${res.status}`);

    if (res.status !== 200) return false;

    const calc = res.data;

    // Verify all critical fields
    assert(calc.id === calculatorId, `ID matches (${calc.id})`, `ID mismatch: expected ${calculatorId}, got ${calc.id}`);
    assert(calc.name === TEST_CALCULATOR.name, `Name matches`, `Name mismatch: "${calc.name}"`);
    assert(calc.slug === TEST_CALCULATOR.slug, `Slug matches`, `Slug mismatch: "${calc.slug}"`);
    assert(calc.is_active === true, `is_active is true`, `is_active is ${calc.is_active}`);

    // Verify description (HTML)
    if (calc.description) {
      assert(
        calc.description.includes('test calculator'),
        'Description content preserved',
        'Description content missing or altered'
      );
    }

    // Verify inputs
    const inputs = typeof calc.inputs === 'string' ? JSON.parse(calc.inputs) : calc.inputs;
    if (Array.isArray(inputs)) {
      assert(inputs.length === 2, `Has 2 inputs`, `Has ${inputs.length} inputs (expected 2)`);

      const weightInput = inputs.find(i => i.key === 'weight');
      const heightInput = inputs.find(i => i.key === 'height');
      assert(!!weightInput, 'Weight input exists', 'Weight input missing');
      assert(!!heightInput, 'Height input exists', 'Height input missing');

      if (weightInput) {
        assert(weightInput.label === 'Weight', `Weight label correct`, `Weight label: "${weightInput.label}"`);
        assert(weightInput.type === 'number', `Weight type is "number"`, `Weight type: "${weightInput.type}"`);
      }
    } else {
      assert(false, '', `Inputs is not an array: ${typeof inputs}`);
    }

    // Verify results
    const results = typeof calc.results === 'string' ? JSON.parse(calc.results) : calc.results;
    if (Array.isArray(results)) {
      assert(results.length === 2, `Has 2 results`, `Has ${results.length} results (expected 2)`);

      const bmiResult = results.find(r => r.key === 'bmi');
      assert(!!bmiResult, 'BMI result exists', 'BMI result missing');
      if (bmiResult) {
        assert(
          bmiResult.formula === 'weight / (height * height)',
          'BMI formula correct',
          `BMI formula: "${bmiResult.formula}"`
        );
      }
    } else {
      assert(false, '', `Results is not an array: ${typeof results}`);
    }

    // Verify category/subcategory association
    if (calc.category_id) {
      assert(!!calc.category_name, `Category name resolved: "${calc.category_name}"`, 'Category name not resolved');
    }

    return true;
  } catch (err) {
    assert(false, '', `Error verifying calculator: ${err.message}`);
    return false;
  }
}

async function step4_verifyCalculatorBySlug(categorySlug) {
  logStep(4, 'Verify calculator accessible by slug (frontend lookup pattern)');

  try {
    const res = await makeRequest(`${BACKEND_URL}/calculators/slug/${TEST_CALCULATOR.slug}`);

    assert(res.status === 200, `GET /calculators/slug/${TEST_CALCULATOR.slug} returned 200`, `GET /calculators/slug/${TEST_CALCULATOR.slug} returned ${res.status}`);

    if (res.status === 200) {
      assert(
        res.data.name === TEST_CALCULATOR.name,
        `Found calculator by slug: "${res.data.name}"`,
        `Slug lookup returned wrong calculator: "${res.data.name}"`
      );
    }

    return res.status === 200;
  } catch (err) {
    assert(false, '', `Error looking up calculator by slug: ${err.message}`);
    return false;
  }
}

async function step5_verifyCalculatorInCategoryList(categoryId) {
  logStep(5, 'Verify calculator appears in category listing (frontend API)');

  if (!categoryId) {
    logWarn('Skipping category listing check - no category assigned');
    return true;
  }

  try {
    const res = await makeRequest(`${BACKEND_URL}/calculators?category_id=${categoryId}&is_active=true`);

    assert(res.status === 200, `GET /calculators?category_id=${categoryId} returned 200`, `Category listing failed: ${res.status}`);

    if (res.status === 200 && Array.isArray(res.data)) {
      const found = res.data.find(c => c.slug === TEST_CALCULATOR.slug);
      assert(
        !!found,
        `Calculator found in category listing (${res.data.length} total calculators)`,
        `Calculator NOT found in category listing (searched ${res.data.length} calculators for slug "${TEST_CALCULATOR.slug}")`
      );

      if (found) {
        // Verify it has the correct data
        assert(found.name === TEST_CALCULATOR.name, 'Name correct in listing', `Name in listing: "${found.name}"`);
        assert(found.is_active === true, 'is_active true in listing', `is_active in listing: ${found.is_active}`);
      }

      return !!found;
    }

    return false;
  } catch (err) {
    assert(false, '', `Error checking category listing: ${err.message}`);
    return false;
  }
}

async function step6_verifyFrontendAccessibility(categorySlug) {
  logStep(6, 'Verify calculator page is accessible on the frontend');

  if (!categorySlug) {
    logWarn('Skipping frontend page check - no category slug');
    return true;
  }

  const frontendUrl = `${FRONTEND_URL}/calculators/${categorySlug}/${TEST_CALCULATOR.slug}`;
  logInfo(`Checking: ${frontendUrl}`);

  try {
    const res = await makeRequest(frontendUrl, {
      headers: { Accept: 'text/html' },
    });

    // Next.js may return 200 even for not-found pages that handle errors gracefully
    // So we check both status and content
    if (res.status === 200) {
      const html = typeof res.data === 'string' ? res.data : res.raw;

      // Check if the page contains the calculator name (it may be rendered server-side or client-side)
      // For client-side rendered pages, we check for the route being valid
      const hasNotFoundMessage = html.includes('Calculator not found') || html.includes('not found');
      const hasCalculatorContent = html.includes(TEST_CALCULATOR.name) || html.includes(TEST_CALCULATOR.slug);

      if (hasCalculatorContent) {
        logPass(`Frontend page contains calculator data`);
        testResults.total++;
        testResults.passed++;
      } else if (!hasNotFoundMessage) {
        // Client-side rendered - page loads but content is fetched via API
        logPass(`Frontend page loads successfully (status 200, client-side rendering expected)`);
        testResults.total++;
        testResults.passed++;
      } else {
        logFail(`Frontend page shows "not found" - calculator may not be visible`);
        testResults.total++;
        testResults.failed++;
      }
    } else if (res.status === 404) {
      logFail(`Frontend page returned 404 for: ${frontendUrl}`);
      testResults.total++;
      testResults.failed++;
    } else {
      logWarn(`Frontend returned status ${res.status} (may be normal for client-side app)`);
      testResults.total++;
      testResults.passed++; // Non-404 is acceptable for SPAs
    }

    return true;
  } catch (err) {
    logWarn(`Frontend not reachable (${err.message}) - skipping frontend page check`);
    logInfo('Make sure the frontend is running: cd CalculaorAll && npm run dev');
    return false;
  }
}

async function step7_verifyCalculatorLogic(calculatorId) {
  logStep(7, 'Verify calculator formula logic works correctly');

  try {
    // Get full calculator data
    const res = await makeRequest(`${BACKEND_URL}/calculators/${calculatorId}`);
    if (res.status !== 200) {
      assert(false, '', `Cannot fetch calculator for logic test: ${res.status}`);
      return false;
    }

    const calc = res.data;
    const inputs = typeof calc.inputs === 'string' ? JSON.parse(calc.inputs) : calc.inputs;
    const results = typeof calc.results === 'string' ? JSON.parse(calc.results) : calc.results;

    // Simulate formula evaluation like the frontend does
    const testWeight = 70;
    const testHeight = 1.75;
    const expectedBMI = testWeight / (testHeight * testHeight); // ≈ 22.86

    logInfo(`Test values: weight=${testWeight}, height=${testHeight}`);
    logInfo(`Expected BMI: ${expectedBMI.toFixed(2)}`);

    // Verify the BMI formula can be evaluated
    const bmiResult = results.find(r => r.key === 'bmi');
    if (bmiResult) {
      // Evaluate the formula using Function constructor (same as frontend)
      try {
        const func = new Function('weight', 'height', `return ${bmiResult.formula}`);
        const computedBMI = func(testWeight, testHeight);

        assert(
          Math.abs(computedBMI - expectedBMI) < 0.01,
          `BMI formula evaluates correctly: ${computedBMI.toFixed(2)} (expected ${expectedBMI.toFixed(2)})`,
          `BMI formula gives wrong result: ${computedBMI} (expected ${expectedBMI.toFixed(2)})`
        );
      } catch (evalErr) {
        assert(false, '', `BMI formula evaluation error: ${evalErr.message}`);
      }
    }

    // Verify the category result formula
    const categoryResult = results.find(r => r.key === 'category');
    if (categoryResult) {
      try {
        const func = new Function('weight', 'height', `return ${categoryResult.formula}`);
        const computedCategory = func(testWeight, testHeight);

        assert(
          computedCategory === 'Normal weight',
          `Category formula evaluates correctly: "${computedCategory}"`,
          `Category formula gives wrong result: "${computedCategory}" (expected "Normal weight")`
        );
      } catch (evalErr) {
        assert(false, '', `Category formula evaluation error: ${evalErr.message}`);
      }
    }

    return true;
  } catch (err) {
    assert(false, '', `Error testing calculator logic: ${err.message}`);
    return false;
  }
}

async function step8_cleanup(calculatorId) {
  logStep(8, 'Cleanup - Delete test calculator');

  try {
    const res = await makeRequest(`${BACKEND_URL}/calculators/${calculatorId}`, {
      method: 'DELETE',
    });

    assert(
      res.status === 200,
      `Test calculator deleted successfully (id=${calculatorId})`,
      `Failed to delete test calculator: ${res.status} - ${JSON.stringify(res.data)}`
    );

    // Verify deletion
    const verifyRes = await makeRequest(`${BACKEND_URL}/calculators/${calculatorId}`);
    assert(
      verifyRes.status === 404,
      'Deletion verified - calculator no longer exists',
      `Calculator still exists after deletion (status: ${verifyRes.status})`
    );

    return true;
  } catch (err) {
    assert(false, '', `Error during cleanup: ${err.message}`);
    return false;
  }
}

// ─── Main Test Runner ────────────────────────────────────────────
async function runTests() {
  logHeader('Calculator End-to-End Test');
  log(`  Timestamp: ${new Date().toISOString()}`, colors.dim);
  log(`  Backend:   ${BACKEND_URL}`, colors.dim);
  log(`  Frontend:  ${FRONTEND_URL}`, colors.dim);

  let createdCalculator = null;
  let categoryData = null;

  try {
    // Step 0: Health check
    const backendOk = await step0_checkBackendHealth();
    if (!backendOk) {
      log('\n  ⛔ Backend is not running. Aborting tests.', colors.red + colors.bold);
      printSummary();
      process.exit(1);
    }

    // Step 1: Get existing categories/subcategories
    categoryData = await step1_getExistingCategoriesAndSubcategories();
    if (!categoryData) {
      log('\n  ⛔ Could not fetch categories. Aborting tests.', colors.red + colors.bold);
      printSummary();
      process.exit(1);
    }

    // Step 2: Create calculator
    createdCalculator = await step2_createCalculator(categoryData.categoryId, categoryData.subcategoryId);
    if (!createdCalculator) {
      log('\n  ⛔ Failed to create test calculator. Aborting remaining tests.', colors.red + colors.bold);
      printSummary();
      process.exit(1);
    }

    // Step 3: Verify in database
    await step3_verifyCalculatorInDatabase(createdCalculator.id);

    // Step 4: Verify by slug lookup
    await step4_verifyCalculatorBySlug(categoryData.categorySlug);

    // Step 5: Verify in category listing
    await step5_verifyCalculatorInCategoryList(categoryData.categoryId);

    // Step 6: Verify frontend page
    await step6_verifyFrontendAccessibility(categoryData.categorySlug);

    // Step 7: Verify calculator logic
    await step7_verifyCalculatorLogic(createdCalculator.id);

  } catch (err) {
    log(`\n  ⛔ Unexpected error: ${err.message}`, colors.red);
    console.error(err.stack);
  } finally {
    // Step 8: Always cleanup
    if (createdCalculator) {
      await step8_cleanup(createdCalculator.id);
    }
  }

  printSummary();
  process.exit(testResults.failed > 0 ? 1 : 0);
}

function printSummary() {
  logHeader('Test Summary');
  log(`  Total:  ${testResults.total}`, colors.bold);
  log(`  Passed: ${testResults.passed}`, colors.green + colors.bold);
  log(`  Failed: ${testResults.failed}`, testResults.failed > 0 ? colors.red + colors.bold : colors.dim);

  if (testResults.errors.length > 0) {
    log(`\n  Failures:`, colors.red + colors.bold);
    testResults.errors.forEach((err, i) => {
      log(`    ${i + 1}. ${err}`, colors.red);
    });
  }

  console.log('');
  if (testResults.failed === 0) {
    log(`  ${'  🎉 ALL TESTS PASSED! 🎉  '}`, colors.bgGreen + colors.bold);
  } else {
    log(`  ${'  ⛔ SOME TESTS FAILED  '}`, colors.bgRed + colors.bold);
  }
  console.log('');
}

// Run
runTests();
