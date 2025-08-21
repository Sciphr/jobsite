#!/usr/bin/env node
/**
 * Security Headers Testing Script
 * Tests if all required security headers are properly configured
 */

const https = require('https');
const http = require('http');

// Configuration
const TEST_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const REQUIRED_HEADERS = {
  'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff',
  'x-xss-protection': '1; mode=block',
  'strict-transport-security': /.+/,
  'content-security-policy': /.+/,
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': /.+/
};

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    
    const req = client.request(url, (res) => {
      resolve({
        statusCode: res.statusCode,
        headers: res.headers
      });
    });

    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.abort();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

async function testSecurityHeaders() {
  console.log('🔒 Testing Security Headers Configuration\n');
  console.log(`Target URL: ${TEST_URL}\n`);

  try {
    const response = await makeRequest(TEST_URL);
    
    console.log(`Response Status: ${response.statusCode}\n`);
    
    let allPassed = true;
    const results = [];

    // Test each required header
    for (const [headerName, expectedValue] of Object.entries(REQUIRED_HEADERS)) {
      const actualValue = response.headers[headerName.toLowerCase()];
      let passed = false;
      
      if (actualValue) {
        if (expectedValue instanceof RegExp) {
          passed = expectedValue.test(actualValue);
        } else {
          passed = actualValue === expectedValue;
        }
      }

      results.push({
        header: headerName,
        expected: expectedValue instanceof RegExp ? 'Pattern match' : expectedValue,
        actual: actualValue || 'Missing',
        passed
      });

      if (!passed) allPassed = false;
    }

    // Display results
    console.log('Security Headers Test Results:');
    console.log('═'.repeat(80));
    
    results.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${result.header}`);
      console.log(`   Expected: ${result.expected}`);
      console.log(`   Actual:   ${result.actual}`);
      console.log('');
    });

    // Additional security checks
    console.log('Additional Security Checks:');
    console.log('═'.repeat(50));
    
    // Check if server header is hidden
    const serverHeader = response.headers['server'];
    if (serverHeader) {
      if (serverHeader === 'JobSite') {
        console.log('✅ PASS Server header customized');
      } else {
        console.log(`⚠️  WARN Server header present: ${serverHeader}`);
      }
    } else {
      console.log('✅ PASS Server header hidden');
    }

    // Check for X-Request-ID
    const requestIdHeader = response.headers['x-request-id'];
    if (requestIdHeader) {
      console.log('✅ PASS X-Request-ID header present');
    } else {
      console.log('⚠️  WARN X-Request-ID header missing');
    }

    console.log('\n' + '═'.repeat(80));
    
    if (allPassed) {
      console.log('🎉 All security headers are properly configured!');
      process.exit(0);
    } else {
      console.log('🚨 Some security headers are missing or misconfigured.');
      console.log('Please check your next.config.js and middleware.js files.');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error testing security headers:', error.message);
    console.log('\nPossible causes:');
    console.log('- Application is not running');
    console.log('- Network connectivity issues');
    console.log('- Invalid NEXTAUTH_URL configuration');
    process.exit(1);
  }
}

// Additional CSP testing
async function testCSPDirectives() {
  console.log('\n🛡️  Testing Content Security Policy Directives\n');
  
  try {
    const response = await makeRequest(TEST_URL);
    const csp = response.headers['content-security-policy'];
    
    if (!csp) {
      console.log('❌ No CSP header found');
      return;
    }

    const directives = csp.split(';').map(d => d.trim());
    const expectedDirectives = [
      'default-src',
      'script-src',
      'style-src',
      'img-src',
      'font-src',
      'connect-src',
      'frame-src',
      'object-src',
      'base-uri',
      'form-action'
    ];

    console.log('CSP Directives Check:');
    expectedDirectives.forEach(directive => {
      const found = directives.some(d => d.startsWith(directive));
      const status = found ? '✅' : '⚠️ ';
      console.log(`${status} ${directive}`);
    });

    // Check for unsafe directives
    console.log('\nUnsafe Directive Check:');
    const unsafePatterns = [
      'unsafe-inline',
      'unsafe-eval',
      'data:',
      '*'
    ];

    unsafePatterns.forEach(pattern => {
      if (csp.includes(pattern)) {
        console.log(`⚠️  WARNING: Found potentially unsafe directive: ${pattern}`);
      }
    });

  } catch (error) {
    console.error('Error testing CSP:', error.message);
  }
}

// Run the tests
if (require.main === module) {
  testSecurityHeaders().then(() => {
    return testCSPDirectives();
  });
}

module.exports = { testSecurityHeaders, testCSPDirectives };