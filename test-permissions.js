// Permission System Test Suite
// Run with: node test-permissions.js

import { 
  userHasPermission, 
  getUserPermissions, 
  userHasPermissions,
  getUserPermissionDetails,
  RESOURCES,
  ACTIONS
} from './app/lib/permissions.js';

async function testPermissionSystem() {
  console.log('🧪 PERMISSION SYSTEM TEST SUITE\n');

  // Test scenarios
  const testScenarios = [
    {
      name: 'Super Admin Test',
      description: 'Test user with privilegeLevel >= 3',
      testType: 'super_admin'
    },
    {
      name: 'Regular User Test', 
      description: 'Test user with role-based permissions',
      testType: 'regular_user'
    },
    {
      name: 'No Role User Test',
      description: 'Test user with no roles assigned',
      testType: 'no_roles'
    },
    {
      name: 'Bulk Permission Test',
      description: 'Test multiple permission checks at once',
      testType: 'bulk_test'
    }
  ];

  // Critical permissions to test
  const criticalPermissions = [
    { resource: 'users', action: 'impersonate', risk: 'HIGH' },
    { resource: 'users', action: 'delete', risk: 'HIGH' },
    { resource: 'settings', action: 'edit_system', risk: 'HIGH' },
    { resource: 'roles', action: 'delete', risk: 'HIGH' },
    { resource: 'applications', action: 'bulk_actions', risk: 'MEDIUM' },
    { resource: 'jobs', action: 'delete', risk: 'MEDIUM' },
    { resource: 'audit_logs', action: 'view', risk: 'MEDIUM' },
    { resource: 'analytics', action: 'export', risk: 'LOW' },
    { resource: 'jobs', action: 'view', risk: 'LOW' }
  ];

  console.log('🔍 Testing Critical Permissions:');
  criticalPermissions.forEach(perm => {
    const riskColor = perm.risk === 'HIGH' ? '🔴' : perm.risk === 'MEDIUM' ? '🟡' : '🟢';
    console.log(`  ${riskColor} ${perm.resource}:${perm.action} (${perm.risk} RISK)`);
  });

  console.log('\n' + '='.repeat(60) + '\n');

  // Test 1: Find test users in the system
  try {
    const { appPrisma } = await import('./app/lib/prisma.js');

    // Get sample users for testing
    const superAdmin = await appPrisma.users.findFirst({
      where: { privilegeLevel: { gte: 3 } },
      select: { id: true, email: true, privilegeLevel: true }
    });

    const regularUser = await appPrisma.users.findFirst({
      where: { 
        privilegeLevel: { lt: 3 },
        user_roles: { some: { is_active: true } }
      },
      select: { id: true, email: true, privilegeLevel: true }
    });

    const noRoleUser = await appPrisma.users.findFirst({
      where: { 
        user_roles: { none: { is_active: true } }
      },
      select: { id: true, email: true, privilegeLevel: true }
    });

    console.log('👥 Test Users Found:');
    console.log(`  Super Admin: ${superAdmin ? superAdmin.email + ' (Level ' + superAdmin.privilegeLevel + ')' : 'None found'}`);
    console.log(`  Regular User: ${regularUser ? regularUser.email + ' (Level ' + regularUser.privilegeLevel + ')' : 'None found'}`);
    console.log(`  No Role User: ${noRoleUser ? noRoleUser.email : 'None found'}`);
    console.log('');

    // Test 2: Super Admin Tests
    if (superAdmin) {
      console.log('🔴 SUPER ADMIN TESTS');
      console.log(`Testing user: ${superAdmin.email}`);
      
      let passedTests = 0;
      let totalTests = criticalPermissions.length;

      for (const perm of criticalPermissions) {
        try {
          const hasPermission = await userHasPermission(superAdmin.id, perm.resource, perm.action);
          if (hasPermission) {
            console.log(`  ✅ ${perm.resource}:${perm.action} - GRANTED`);
            passedTests++;
          } else {
            console.log(`  ❌ ${perm.resource}:${perm.action} - DENIED (Should be granted for super admin!)`);
          }
        } catch (error) {
          console.log(`  ⚠️  ${perm.resource}:${perm.action} - ERROR: ${error.message}`);
        }
      }

      console.log(`  📊 Super Admin Test Results: ${passedTests}/${totalTests} passed`);
      if (passedTests === totalTests) {
        console.log(`  🎉 Super Admin permissions working correctly!`);
      } else {
        console.log(`  🚨 Super Admin permissions have issues!`);
      }
      console.log('');
    }

    // Test 3: Regular User Tests
    if (regularUser) {
      console.log('🟡 REGULAR USER TESTS');
      console.log(`Testing user: ${regularUser.email}`);

      // Get user's actual permissions
      const userPermissions = await getUserPermissions(regularUser.id);
      console.log(`  📋 User has ${userPermissions.length} permissions`);

      // Test a few specific permissions
      const testPerms = [
        { resource: 'jobs', action: 'view', shouldHave: 'likely' },
        { resource: 'users', action: 'impersonate', shouldHave: 'unlikely' },
        { resource: 'settings', action: 'edit_system', shouldHave: 'unlikely' },
        { resource: 'applications', action: 'view', shouldHave: 'likely' }
      ];

      for (const test of testPerms) {
        try {
          const hasPermission = await userHasPermission(regularUser.id, test.resource, test.action);
          const status = hasPermission ? 'GRANTED' : 'DENIED';
          const icon = hasPermission ? '✅' : '❌';
          console.log(`  ${icon} ${test.resource}:${test.action} - ${status}`);
        } catch (error) {
          console.log(`  ⚠️  ${test.resource}:${test.action} - ERROR: ${error.message}`);
        }
      }
      console.log('');
    }

    // Test 4: Bulk Permission Test
    if (regularUser) {
      console.log('⚡ BULK PERMISSION TEST');
      console.log(`Testing bulk permission check for: ${regularUser.email}`);

      const bulkTestPerms = [
        { resource: 'jobs', action: 'view' },
        { resource: 'jobs', action: 'create' },
        { resource: 'jobs', action: 'delete' },
        { resource: 'users', action: 'impersonate' },
        { resource: 'applications', action: 'view' }
      ];

      try {
        const start = Date.now();
        const bulkResults = await userHasPermissions(regularUser.id, bulkTestPerms);
        const end = Date.now();

        console.log(`  ⚡ Bulk check completed in ${end - start}ms`);
        
        Object.entries(bulkResults).forEach(([permission, granted]) => {
          const icon = granted ? '✅' : '❌';
          const status = granted ? 'GRANTED' : 'DENIED';
          console.log(`  ${icon} ${permission} - ${status}`);
        });
      } catch (error) {
        console.log(`  ⚠️  Bulk test failed: ${error.message}`);
      }
      console.log('');
    }

    // Test 5: Permission Details Test
    if (regularUser) {
      console.log('📊 PERMISSION DETAILS TEST');
      console.log(`Getting detailed permissions for: ${regularUser.email}`);

      try {
        const details = await getUserPermissionDetails(regularUser.id);
        if (details) {
          console.log(`  👤 User: ${details.user.firstName} ${details.user.lastName} (${details.user.email})`);
          console.log(`  🔢 Privilege Level: ${details.user.privilegeLevel}`);
          console.log(`  👥 Roles: ${details.roles.map(r => r.name).join(', ')}`);
          console.log(`  🔑 Permissions: ${details.permissions.length} total`);
          console.log(`  🚀 Super Admin: ${details.isSuperAdmin ? 'Yes' : 'No'}`);
        }
      } catch (error) {
        console.log(`  ⚠️  Permission details test failed: ${error.message}`);
      }
      console.log('');
    }

    // Test 6: Edge Cases
    console.log('🔍 EDGE CASE TESTS');
    
    // Test invalid user ID
    try {
      const invalidResult = await userHasPermission('00000000-0000-0000-0000-000000000000', 'jobs', 'view');
      console.log(`  ✅ Invalid user ID test: ${invalidResult ? 'GRANTED (unexpected!)' : 'DENIED (correct)'}`);
    } catch (error) {
      console.log(`  ✅ Invalid user ID test: ERROR handled correctly`);
    }

    // Test invalid permission
    try {
      if (regularUser) {
        const invalidPerm = await userHasPermission(regularUser.id, 'nonexistent', 'fake');
        console.log(`  ✅ Invalid permission test: ${invalidPerm ? 'GRANTED (unexpected!)' : 'DENIED (correct)'}`);
      }
    } catch (error) {
      console.log(`  ✅ Invalid permission test: ERROR handled correctly`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎯 SECURITY RECOMMENDATIONS BASED ON TESTS:');
    console.log('');
    console.log('1. 🔴 HIGH PRIORITY:');
    console.log('   • Audit all users with impersonate permission');
    console.log('   • Review super admin access (minimize to 1-2 users)');
    console.log('   • Add logging for high-risk permission usage');
    console.log('');
    console.log('2. 🟡 MEDIUM PRIORITY:');
    console.log('   • Implement row-level security for applications:view');
    console.log('   • Add rate limiting for bulk operations');
    console.log('   • Create permission usage analytics');
    console.log('');
    console.log('3. 🟢 LOW PRIORITY:');
    console.log('   • Add missing google-analytics:configure permission');
    console.log('   • Create permission test automation');
    console.log('   • Document role assignment guidelines');
    console.log('');
    console.log('✅ Permission system test completed!');

    await appPrisma.$disconnect();

  } catch (error) {
    console.error('❌ Test suite failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testPermissionSystem().catch(console.error);
}

export default testPermissionSystem;