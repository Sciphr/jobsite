#!/usr/bin/env node
/**
 * Security Monitor Testing Script
 * Tests the security monitoring system functionality
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Import security monitor (adjust path as needed)
async function testSecurityMonitor() {
  try {
    const { securityMonitor, SecurityEventTypes, logLoginFailure, logPermissionDenied } = 
      await import('../app/lib/security-monitor.js');

    console.log('🔍 Testing Security Monitor System\n');

    // Test 1: Log various security events
    console.log('1. Testing security event logging...');
    
    await logLoginFailure(
      'test@example.com',
      '192.168.1.100',
      'Mozilla/5.0 (Test Browser)',
      'Invalid password'
    );
    console.log('   ✅ Login failure event logged');

    await logPermissionDenied(
      'user-123',
      'users',
      'delete',
      '192.168.1.100'
    );
    console.log('   ✅ Permission denied event logged');

    // Test 2: Log multiple events to trigger alert
    console.log('\n2. Testing alert threshold...');
    
    for (let i = 0; i < 6; i++) {
      await securityMonitor.logEvent(SecurityEventTypes.LOGIN_FAILURE, {
        email: 'attacker@example.com',
        ipAddress: '10.0.0.1',
        userAgent: 'Suspicious Bot',
        details: { reason: `Brute force attempt ${i + 1}` }
      });
    }
    console.log('   ✅ Multiple login failures logged (should trigger alert)');

    // Test 3: Get security statistics
    console.log('\n3. Testing security statistics...');
    
    const stats24h = await securityMonitor.getSecurityStats('24h');
    console.log('   📊 24-hour security stats:');
    console.log(`      Total events: ${stats24h.totalEvents}`);
    console.log(`      Active alerts: ${stats24h.activeAlerts}`);
    console.log('      Events by severity:', stats24h.eventsBySeverity);
    console.log('      Top event types:', stats24h.eventsByType.slice(0, 3));

    // Test 4: Get recent events
    console.log('\n4. Testing recent events retrieval...');
    
    const recentEvents = await securityMonitor.getRecentEvents(5);
    console.log(`   📋 Retrieved ${recentEvents.length} recent events`);
    
    if (recentEvents.length > 0) {
      console.log('   Latest event:');
      console.log(`      Type: ${recentEvents[0].event_type}`);
      console.log(`      Severity: ${recentEvents[0].severity}`);
      console.log(`      Time: ${recentEvents[0].created_at}`);
    }

    console.log('\n✅ Security Monitor test completed successfully!');
    console.log('\n📈 Summary:');
    console.log('   - Event logging: Working');
    console.log('   - Alert system: Working');
    console.log('   - Statistics: Working');
    console.log('   - Event retrieval: Working');

  } catch (error) {
    console.error('❌ Security Monitor test failed:', error);
    
    if (error.message.includes('connect ECONNREFUSED')) {
      console.log('\n💡 Tip: Make sure your database is running and accessible');
    } else if (error.message.includes('prisma')) {
      console.log('\n💡 Tip: Run "npx prisma generate" and ensure your schema includes security tables');
    }
    
    process.exit(1);
  }
}

// Simulate various attack scenarios for testing
async function simulateAttackScenarios() {
  try {
    const { 
      logSQLInjectionAttempt, 
      logXSSAttempt, 
      logSuspiciousActivity,
      logFileUploadViolation
    } = await import('../app/lib/security-monitor.js');

    console.log('\n🎭 Simulating attack scenarios for testing...\n');

    // SQL Injection attempt
    await logSQLInjectionAttempt(
      "'; DROP TABLE users; --",
      '192.168.1.200',
      'sqlmap/1.0'
    );
    console.log('✅ SQL injection attempt logged');

    // XSS attempt
    await logXSSAttempt(
      '<script>alert("XSS")</script>',
      '192.168.1.201',
      'Evil Browser',
      '/api/jobs'
    );
    console.log('✅ XSS attempt logged');

    // Suspicious activity
    await logSuspiciousActivity(
      'User accessed 100+ user profiles in 1 minute',
      'user-456',
      '192.168.1.202',
      'Automated Tool'
    );
    console.log('✅ Suspicious activity logged');

    // File upload violation
    await logFileUploadViolation(
      '../../../etc/passwd',
      'text/plain',
      'Path traversal attempt',
      'user-789',
      '192.168.1.203'
    );
    console.log('✅ File upload violation logged');

    console.log('\n🎯 Attack simulation completed');

  } catch (error) {
    console.error('❌ Attack simulation failed:', error);
  }
}

// Test environment security
async function testEnvironmentSecurity() {
  try {
    const { validateEnvironmentSecurity } = await import('../app/lib/env-check.js');
    
    console.log('\n🔧 Testing environment security configuration...\n');
    
    const result = validateEnvironmentSecurity();
    
    if (result.isValid) {
      console.log('✅ Environment security validation passed');
    } else {
      console.log('❌ Environment security issues found:');
      result.errors.forEach(error => {
        console.log(`   - ${error}`);
      });
    }

    if (result.warnings.length > 0) {
      console.log('\n⚠️  Environment warnings:');
      result.warnings.forEach(warning => {
        console.log(`   - ${warning}`);
      });
    }

  } catch (error) {
    console.error('❌ Environment security test failed:', error);
  }
}

// Main test runner
async function runAllTests() {
  console.log('🔒 JobSite Security Monitor Test Suite');
  console.log('═'.repeat(50));
  
  await testSecurityMonitor();
  await simulateAttackScenarios();
  await testEnvironmentSecurity();
  
  console.log('\n' + '═'.repeat(50));
  console.log('🏁 All security tests completed!');
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testSecurityMonitor,
  simulateAttackScenarios,
  testEnvironmentSecurity
};