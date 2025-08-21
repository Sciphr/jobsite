// Comprehensive Permission-to-Route Audit Script
// This will check all API routes against your 58 permissions

import fs from 'fs';
import path from 'path';

// Your 58 permissions from the CSV
const PERMISSIONS = [
  { resource: "analytics", action: "advanced", description: "Access advanced analytics features" },
  { resource: "analytics", action: "export", description: "Export analytics data" },
  { resource: "analytics", action: "view", description: "View analytics dashboard" },
  { resource: "applications", action: "approve_hire", description: "Approve hiring decisions for applications" },
  { resource: "applications", action: "assign", description: "Assign applications to reviewers" },
  { resource: "applications", action: "bulk_actions", description: "Perform bulk operations on applications" },
  { resource: "applications", action: "create", description: "Create applications (for users)" },
  { resource: "applications", action: "delete", description: "Delete applications" },
  { resource: "applications", action: "edit", description: "Edit application details" },
  { resource: "applications", action: "export", description: "Export application data" },
  { resource: "applications", action: "notes", description: "Add/edit application notes" },
  { resource: "applications", action: "status_change", description: "Change application status" },
  { resource: "applications", action: "view", description: "View job applications" },
  { resource: "audit_logs", action: "export", description: "Export audit log data" },
  { resource: "audit_logs", action: "view", description: "View system audit logs" },
  { resource: "emails", action: "automation", description: "Set up email automation rules" },
  { resource: "emails", action: "create", description: "Create email campaigns" },
  { resource: "emails", action: "send", description: "Send emails to applicants" },
  { resource: "emails", action: "templates", description: "Manage email templates" },
  { resource: "emails", action: "view", description: "View email campaigns and history" },
  { resource: "google-analytics", action: "view", description: "View Google Analytics data and reports" },
  { resource: "interviews", action: "calendar", description: "Manage interview calendar integration" },
  { resource: "interviews", action: "create", description: "Schedule new interviews" },
  { resource: "interviews", action: "delete", description: "Cancel/delete interviews" },
  { resource: "interviews", action: "edit", description: "Modify interview details" },
  { resource: "interviews", action: "notes", description: "Add interview feedback/notes" },
  { resource: "interviews", action: "reschedule", description: "Reschedule interviews" },
  { resource: "interviews", action: "view", description: "View interview schedules" },
  { resource: "jobs", action: "approve", description: "Approve jobs for publishing" },
  { resource: "jobs", action: "clone", description: "Duplicate existing jobs" },
  { resource: "jobs", action: "create", description: "Create new job postings" },
  { resource: "jobs", action: "delete", description: "Delete job postings" },
  { resource: "jobs", action: "edit", description: "Edit existing jobs" },
  { resource: "jobs", action: "export", description: "Export job data" },
  { resource: "jobs", action: "feature", description: "Mark jobs as featured" },
  { resource: "jobs", action: "publish", description: "Publish/unpublish jobs" },
  { resource: "jobs", action: "view", description: "View job listings and details" },
  { resource: "roles", action: "assign", description: "Assign roles to users" },
  { resource: "roles", action: "create", description: "Create new roles" },
  { resource: "roles", action: "delete", description: "Delete roles" },
  { resource: "roles", action: "edit", description: "Edit existing roles" },
  { resource: "roles", action: "view", description: "View roles and permissions" },
  { resource: "settings", action: "edit_branding", description: "Edit branding and appearance" },
  { resource: "settings", action: "edit_notifications", description: "Edit notification settings" },
  { resource: "settings", action: "edit_system", description: "Edit system-wide settings" },
  { resource: "settings", action: "integrations", description: "Manage third-party integrations" },
  { resource: "settings", action: "view", description: "View system settings" },
  { resource: "users", action: "create", description: "Create new user accounts" },
  { resource: "users", action: "delete", description: "Delete user accounts" },
  { resource: "users", action: "edit", description: "Edit user information" },
  { resource: "users", action: "export", description: "Export user data" },
  { resource: "users", action: "impersonate", description: "Login as another user" },
  { resource: "users", action: "roles", description: "Manage user roles and permissions" },
  { resource: "users", action: "view", description: "View user profiles and lists" },
  { resource: "weekly_digest", action: "edit", description: "Configure weekly digest" },
  { resource: "weekly_digest", action: "send", description: "Send test/manual weekly digests" },
  { resource: "weekly_digest", action: "view", description: "View weekly digest settings" }
];

// Group permissions by resource for easier analysis
const RESOURCES = PERMISSIONS.reduce((acc, perm) => {
  if (!acc[perm.resource]) acc[perm.resource] = [];
  acc[perm.resource].push(perm.action);
  return acc;
}, {});

async function findAllRoutes() {
  const routes = [];
  
  function walkDir(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else if (file === 'route.js') {
        routes.push(fullPath);
      }
    }
  }
  
  walkDir('app/api');
  return routes;
}

async function analyzeRoute(routePath) {
  try {
    const content = fs.readFileSync(routePath, 'utf8');
    const analysis = {
      path: routePath,
      methods: [],
      hasProtectRoute: content.includes('protectRoute'),
      hasProtectAPIRoute: content.includes('protectAPIRoute'),
      hasUserHasPermission: content.includes('userHasPermission'),
      hasPrivilegeLevelCheck: /privilegeLevel\s*[<>=]/.test(content),
      protectRouteCalls: [],
      userHasPermissionCalls: [],
      privilegeChecks: [],
      securityIssues: []
    };

    // Find HTTP methods
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
    for (const method of methods) {
      if (content.includes(`export async function ${method}(`)) {
        analysis.methods.push(method);
      }
    }

    // Find protectRoute calls
    const protectRouteMatches = content.matchAll(/protectRoute\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']/g);
    for (const match of protectRouteMatches) {
      analysis.protectRouteCalls.push({
        resource: match[1],
        action: match[2]
      });
    }

    // Find userHasPermission calls
    const userHasPermissionMatches = content.matchAll(/userHasPermission\s*\([^,]+,\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']/g);
    for (const match of userHasPermissionMatches) {
      analysis.userHasPermissionCalls.push({
        resource: match[1],
        action: match[2]
      });
    }

    // Find privilege level checks
    const privilegeMatches = content.matchAll(/privilegeLevel\s*([<>=]+)\s*(\d+)/g);
    for (const match of privilegeMatches) {
      analysis.privilegeChecks.push({
        operator: match[1],
        level: parseInt(match[2])
      });
    }

    // Identify potential security issues
    const hasAnyPermissionCheck = analysis.hasProtectRoute || analysis.hasProtectAPIRoute || analysis.hasUserHasPermission;
    
    if (analysis.methods.length > 0 && !hasAnyPermissionCheck) {
      // Skip known public/auth routes
      if (!routePath.includes('/auth/') && 
          !routePath.includes('/public/') && 
          !routePath.includes('/setup/') &&
          !routePath.includes('/health') &&
          !routePath.includes('/favicon') &&
          !routePath.includes('/logo') &&
          !routePath.includes('/system/health')) {
        analysis.securityIssues.push('NO_PROTECTION');
      }
    }

    if (analysis.hasPrivilegeLevelCheck && !hasAnyPermissionCheck) {
      analysis.securityIssues.push('HARDCODED_PRIVILEGE_CHECK');
    }

    return analysis;
  } catch (error) {
    return {
      path: routePath,
      error: error.message
    };
  }
}

async function generateReport() {
  console.log('🔍 COMPREHENSIVE PERMISSION-TO-ROUTE AUDIT\n');
  console.log('📊 Analyzing 58 permissions across all API routes...\n');

  const routes = await findAllRoutes();
  console.log(`Found ${routes.length} API routes\n`);

  const analyses = [];
  for (const route of routes) {
    const analysis = await analyzeRoute(route);
    analyses.push(analysis);
  }

  // Group routes by likely resource
  const routesByResource = {
    users: analyses.filter(a => a.path.includes('/users') || a.path.includes('/admin/users')),
    jobs: analyses.filter(a => a.path.includes('/jobs')),
    applications: analyses.filter(a => a.path.includes('/applications')),
    interviews: analyses.filter(a => a.path.includes('/interviews')),
    settings: analyses.filter(a => a.path.includes('/settings') || a.path.includes('/admin/settings')),
    roles: analyses.filter(a => a.path.includes('/roles')),
    emails: analyses.filter(a => a.path.includes('/email')),
    analytics: analyses.filter(a => a.path.includes('/analytics') || a.path.includes('/stats')),
    audit_logs: analyses.filter(a => a.path.includes('/audit')),
    weekly_digest: analyses.filter(a => a.path.includes('/digest'))
  };

  console.log('🚨 SECURITY ISSUES FOUND:\n');

  let totalIssues = 0;
  
  for (const [resource, resourceRoutes] of Object.entries(routesByResource)) {
    if (resourceRoutes.length === 0) continue;

    console.log(`🔹 ${resource.toUpperCase()} ROUTES (${resourceRoutes.length} routes)`);
    
    const expectedPermissions = RESOURCES[resource] || [];
    console.log(`   Expected permissions: ${expectedPermissions.join(', ')}`);

    let resourceIssues = 0;
    
    for (const route of resourceRoutes) {
      const issues = route.securityIssues || [];
      if (issues.length > 0) {
        resourceIssues++;
        totalIssues++;
        
        console.log(`   ❌ ${route.path}`);
        console.log(`      Methods: ${route.methods.join(', ')}`);
        console.log(`      Issues: ${issues.join(', ')}`);
        
        if (route.protectRouteCalls.length > 0) {
          console.log(`      protectRoute(): ${route.protectRouteCalls.map(p => p.resource + ':' + p.action).join(', ')}`);
        }
        
        if (route.userHasPermissionCalls.length > 0) {
          console.log(`      userHasPermission(): ${route.userHasPermissionCalls.map(p => p.resource + ':' + p.action).join(', ')}`);
        }
        
        if (route.privilegeChecks.length > 0) {
          console.log(`      Privilege checks: ${route.privilegeChecks.map(p => 'level ' + p.operator + ' ' + p.level).join(', ')}`);
        }
        console.log('');
      } else if (route.protectRouteCalls.length > 0 || route.userHasPermissionCalls.length > 0) {
        console.log(`   ✅ ${route.path}`);
        if (route.protectRouteCalls.length > 0) {
          console.log(`      protectRoute(): ${route.protectRouteCalls.map(p => p.resource + ':' + p.action).join(', ')}`);
        }
        if (route.userHasPermissionCalls.length > 0) {
          console.log(`      userHasPermission(): ${route.userHasPermissionCalls.map(p => p.resource + ':' + p.action).join(', ')}`);
        }
      }
    }
    
    if (resourceIssues === 0) {
      console.log(`   ✅ All ${resource} routes appear secure`);
    }
    console.log('');
  }

  // Routes that don't fit any resource category
  const uncategorizedRoutes = analyses.filter(a => 
    !Object.values(routesByResource).flat().includes(a)
  );

  if (uncategorizedRoutes.length > 0) {
    console.log(`🔍 UNCATEGORIZED ROUTES (${uncategorizedRoutes.length} routes)`);
    for (const route of uncategorizedRoutes) {
      if ((route.securityIssues || []).length > 0) {
        console.log(`   ⚠️  ${route.path} - ${route.securityIssues.join(', ')}`);
        totalIssues++;
      }
    }
    console.log('');
  }

  console.log('📋 SUMMARY:');
  console.log(`   Total routes analyzed: ${routes.length}`);
  console.log(`   Security issues found: ${totalIssues}`);
  console.log(`   Permissions defined: ${PERMISSIONS.length}`);
  console.log('');

  console.log('🎯 RECOMMENDED ACTIONS:');
  console.log('   1. Fix all HARDCODED_PRIVILEGE_CHECK issues');
  console.log('   2. Add protectRoute() to all NO_PROTECTION routes');
  console.log('   3. Verify permission-to-route mapping is complete');
  console.log('   4. Test each permission grants/denies access correctly');

  return {
    totalRoutes: routes.length,
    totalIssues,
    analyses,
    routesByResource
  };
}

// Run the audit
generateReport().catch(console.error);

export { generateReport, PERMISSIONS, RESOURCES };