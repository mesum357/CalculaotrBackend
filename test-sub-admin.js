/**
 * Test Script: Sub-Admin Creation Flow
 * 
 * Tests:
 * 1. Admin login
 * 2. Session verification
 * 3. List admins (GET /admin/auth/admins)
 * 4. Create sub-admin (POST /admin/auth/create-sub-admin)
 * 5. Verify sub-admin appears in list
 * 6. Delete the created sub-admin (cleanup)
 * 
 * Usage:
 *   node test-sub-admin.js [base_url]
 * 
 * Examples:
 *   node test-sub-admin.js                                          # local (http://localhost:3001/api)
 *   node test-sub-admin.js https://calculaotrbackend.onrender.com/api  # production
 */

const http = require('http');
const https = require('https');

const BASE_URL = process.argv[2] || 'http://localhost:3001/api';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Test sub-admin details
const TEST_SUB_ADMIN = {
  username: `test_sub_admin_${Date.now()}`,
  password: 'TestPass123!',
  permissions: ['/', '/calculators'],
};

let sessionCookie = null;
let createdSubAdminId = null;
let testsPassed = 0;
let testsFailed = 0;

// ──────────────────────────────────────────────
// HTTP helper that manages cookies manually
// ──────────────────────────────────────────────
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${path}`);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (sessionCookie) {
      headers['Cookie'] = sessionCookie;
    }

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers,
    };

    const req = lib.request(options, (res) => {
      // Capture Set-Cookie header
      const setCookie = res.headers['set-cookie'];
      if (setCookie) {
        // Extract just the cookie name=value portion
        const cookies = setCookie.map(c => c.split(';')[0]);
        sessionCookie = cookies.join('; ');
        console.log('  📦 Session cookie captured:', sessionCookie.substring(0, 60) + '...');
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          parsed = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsed,
        });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// ──────────────────────────────────────────────
// Test helpers
// ──────────────────────────────────────────────
function pass(name, detail = '') {
  testsPassed++;
  console.log(`  ✅ PASS: ${name}${detail ? ' — ' + detail : ''}`);
}

function fail(name, detail = '') {
  testsFailed++;
  console.log(`  ❌ FAIL: ${name}${detail ? ' — ' + detail : ''}`);
}

// ──────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────
async function testAdminLogin() {
  console.log('\n── Test 1: Admin Login ──');
  const res = await makeRequest('POST', '/admin/auth/login', {
    username: ADMIN_USERNAME,
    password: ADMIN_PASSWORD,
  });

  console.log('  Status:', res.status);
  console.log('  Data:', JSON.stringify(res.data, null, 2));

  if (res.status === 200 && res.data.admin) {
    pass('Admin login', `Logged in as "${res.data.admin.username}" (role: ${res.data.admin.role})`);
    return true;
  } else {
    fail('Admin login', `Status ${res.status}: ${res.data?.error || 'unknown error'}`);
    return false;
  }
}

async function testSessionCheck() {
  console.log('\n── Test 2: Session Check ──');
  const res = await makeRequest('GET', '/admin/auth/session');

  console.log('  Status:', res.status);
  console.log('  Data:', JSON.stringify(res.data, null, 2));

  if (res.status === 200 && res.data.authenticated && res.data.admin?.role === 'admin') {
    pass('Session check', `Authenticated as "${res.data.admin.username}" (role: ${res.data.admin.role})`);
    return true;
  } else {
    fail('Session check', `authenticated=${res.data?.authenticated}, role=${res.data?.admin?.role}`);
    return false;
  }
}

async function testListAdmins() {
  console.log('\n── Test 3: List Admins ──');
  const res = await makeRequest('GET', '/admin/auth/admins');

  console.log('  Status:', res.status);

  if (res.status === 200 && res.data.admins) {
    pass('List admins', `Found ${res.data.admins.length} admin(s)`);
    res.data.admins.forEach(a => {
      console.log(`    • ${a.username} (${a.role}, active=${a.is_active})`);
    });
    return true;
  } else {
    fail('List admins', `Status ${res.status}: ${JSON.stringify(res.data)}`);
    return false;
  }
}

async function testCreateSubAdmin() {
  console.log('\n── Test 4: Create Sub-Admin ──');
  const res = await makeRequest('POST', '/admin/auth/create-sub-admin', {
    username: TEST_SUB_ADMIN.username,
    password: TEST_SUB_ADMIN.password,
    permissions: TEST_SUB_ADMIN.permissions,
  });

  console.log('  Status:', res.status);
  console.log('  Data:', JSON.stringify(res.data, null, 2));

  if (res.status === 201 && res.data.admin) {
    createdSubAdminId = res.data.admin.id;
    pass('Create sub-admin', `Created "${res.data.admin.username}" (id: ${res.data.admin.id})`);
    return true;
  } else {
    fail('Create sub-admin', `Status ${res.status}: ${res.data?.error || JSON.stringify(res.data)}`);
    return false;
  }
}

async function testVerifySubAdminInList() {
  console.log('\n── Test 5: Verify Sub-Admin in List ──');
  const res = await makeRequest('GET', '/admin/auth/admins');

  if (res.status === 200 && res.data.admins) {
    const found = res.data.admins.find(a => a.id === createdSubAdminId);
    if (found) {
      pass('Sub-admin in list', `Found "${found.username}" with role=${found.role}`);
      return true;
    } else {
      fail('Sub-admin in list', 'Created sub-admin not found in list');
      return false;
    }
  } else {
    fail('Sub-admin in list', `Status ${res.status}: ${JSON.stringify(res.data)}`);
    return false;
  }
}

async function testDeleteSubAdmin() {
  if (!createdSubAdminId) {
    console.log('\n── Test 6: Delete Sub-Admin (SKIPPED — no sub-admin created) ──');
    return false;
  }

  console.log('\n── Test 6: Delete Sub-Admin (cleanup) ──');
  const res = await makeRequest('DELETE', `/admin/auth/admins/${createdSubAdminId}`);

  console.log('  Status:', res.status);
  console.log('  Data:', JSON.stringify(res.data, null, 2));

  if (res.status === 200) {
    pass('Delete sub-admin', res.data.message);
    return true;
  } else {
    fail('Delete sub-admin', `Status ${res.status}: ${res.data?.error || JSON.stringify(res.data)}`);
    return false;
  }
}

// ──────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║       Sub-Admin Creation Test Suite              ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`  Base URL: ${BASE_URL}`);
  console.log(`  Admin:    ${ADMIN_USERNAME}`);
  console.log('');

  try {
    // Step 1: Login
    const loggedIn = await testAdminLogin();
    if (!loggedIn) {
      console.log('\n⚠️  Login failed. Is the admin user initialized?');
      console.log(`   Try: GET ${BASE_URL}/admin/auth/init-admin`);
      console.log('\n────────────────────────────────────────');
      console.log(`Results: ${testsPassed} passed, ${testsFailed} failed`);
      process.exit(1);
    }

    // Step 2: Session check
    const sessionOk = await testSessionCheck();
    if (!sessionOk) {
      console.log('\n⚠️  Session check failed. Cookie issue (trust proxy? sameSite? secure?)');
      console.log('   Check that app.set("trust proxy", 1) is set in index.js');
    }

    // Step 3: List admins
    await testListAdmins();

    // Step 4: Create sub-admin
    await testCreateSubAdmin();

    // Step 5: Verify in list
    if (createdSubAdminId) {
      await testVerifySubAdminInList();
    }

    // Step 6: Cleanup
    await testDeleteSubAdmin();

  } catch (error) {
    console.error('\n💥 Unexpected error:', error.message);
    testsFailed++;
  }

  console.log('\n════════════════════════════════════════════');
  console.log(`  Results: ${testsPassed} passed, ${testsFailed} failed`);
  console.log('════════════════════════════════════════════');
  process.exit(testsFailed > 0 ? 1 : 0);
}

main();
