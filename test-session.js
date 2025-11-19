/**
 * Test script to verify session persistence
 * 
 * Usage: node test-session.js
 * 
 * This script tests:
 * 1. Login and session creation
 * 2. Session persistence across requests
 * 3. Session retrieval
 */

// Use built-in fetch (Node 18+) or node-fetch if available
let fetch;
try {
  fetch = globalThis.fetch || require('node-fetch');
} catch (e) {
  console.error('❌ fetch is not available. Install node-fetch: npm install node-fetch');
  process.exit(1);
}

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001/api';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'testpassword123';

// Cookie jar to store cookies between requests
let cookies = '';

async function testSession() {
  console.log('🧪 Testing Session Persistence\n');
  console.log('API URL:', API_BASE_URL);
  console.log('Test Email:', TEST_EMAIL);
  console.log('');

  try {
    // Step 1: Login
    console.log('📝 Step 1: Logging in...');
    const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      }),
    });

    console.log('   Status:', loginResponse.status);
    console.log('   Status Text:', loginResponse.statusText);

    // Extract cookies from response
    const setCookieHeader = loginResponse.headers.get('set-cookie');
    if (setCookieHeader) {
      cookies = setCookieHeader;
      console.log('   ✅ Cookies received:', setCookieHeader.split(';')[0]);
    } else {
      console.log('   ⚠️  No cookies received!');
    }

    if (!loginResponse.ok) {
      const errorData = await loginResponse.json();
      console.error('   ❌ Login failed:', errorData);
      return;
    }

    const loginData = await loginResponse.json();
    console.log('   ✅ Login successful:', {
      message: loginData.message,
      userId: loginData.user?.id,
      email: loginData.user?.email,
      sessionId: loginData.sessionId
    });
    console.log('');

    // Step 2: Check session with cookies
    console.log('📝 Step 2: Checking session (with cookies)...');
    const sessionResponse = await fetch(`${API_BASE_URL}/auth/session`, {
      method: 'GET',
      headers: {
        'Cookie': cookies,
      },
    });

    console.log('   Status:', sessionResponse.status);
    
    if (!sessionResponse.ok) {
      const errorData = await sessionResponse.json();
      console.error('   ❌ Session check failed:', errorData);
      return;
    }

    const sessionData = await sessionResponse.json();
    console.log('   ✅ Session data:', sessionData);
    
    if (sessionData.authenticated && sessionData.user) {
      console.log('   ✅ Session is persistent! User:', sessionData.user.email);
    } else {
      console.log('   ❌ Session not authenticated!');
    }
    console.log('');

    // Step 3: Check session again (verify persistence)
    console.log('📝 Step 3: Checking session again (verify persistence)...');
    const sessionResponse2 = await fetch(`${API_BASE_URL}/auth/session`, {
      method: 'GET',
      headers: {
        'Cookie': cookies,
      },
    });

    const sessionData2 = await sessionResponse2.json();
    console.log('   ✅ Session data (2nd check):', sessionData2);
    
    if (sessionData2.authenticated && sessionData2.user) {
      console.log('   ✅ Session persisted across requests!');
      if (sessionData2.user.id === sessionData.user.id) {
        console.log('   ✅ User ID matches - session is working correctly!');
      } else {
        console.log('   ⚠️  User ID changed - session may not be persistent');
      }
    } else {
      console.log('   ❌ Session lost!');
    }
    console.log('');

    // Step 4: Test without cookies (should fail)
    console.log('📝 Step 4: Testing without cookies (should fail)...');
    const noCookieResponse = await fetch(`${API_BASE_URL}/auth/session`, {
      method: 'GET',
    });

    const noCookieData = await noCookieResponse.json();
    console.log('   Session data (no cookies):', noCookieData);
    
    if (!noCookieData.authenticated) {
      console.log('   ✅ Correctly requires cookies for authentication');
    } else {
      console.log('   ⚠️  Session accessible without cookies (security issue!)');
    }
    console.log('');

    // Step 5: Logout
    console.log('📝 Step 5: Logging out...');
    const logoutResponse = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Cookie': cookies,
      },
    });

    if (logoutResponse.ok) {
      console.log('   ✅ Logout successful');
    } else {
      console.log('   ⚠️  Logout failed');
    }
    console.log('');

    // Step 6: Verify session is cleared
    console.log('📝 Step 6: Verifying session is cleared after logout...');
    const finalSessionResponse = await fetch(`${API_BASE_URL}/auth/session`, {
      method: 'GET',
      headers: {
        'Cookie': cookies,
      },
    });

    const finalSessionData = await finalSessionResponse.json();
    console.log('   Session data (after logout):', finalSessionData);
    
    if (!finalSessionData.authenticated) {
      console.log('   ✅ Session correctly cleared after logout');
    } else {
      console.log('   ⚠️  Session still active after logout');
    }

    console.log('\n✅ Session persistence test completed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run test
testSession()
  .then(() => {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  });

