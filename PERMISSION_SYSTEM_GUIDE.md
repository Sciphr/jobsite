# Role-Based Permission System Implementation Guide

## Overview

This application now has a comprehensive 3-layer permission system:

1. **Server-side API Protection** (Primary security layer)
2. **Client-side Session Enhancement** (Performance optimization)  
3. **Component-level UI Guards** (User experience)

## 🛡️ How Permissions Work

### Database Structure
- `permissions` - Available permissions (resource:action pairs)
- `roles` - User roles with descriptions and colors
- `role_permissions` - Many-to-many: which permissions each role has
- `user_roles` - Many-to-many: which roles each user has (supports multiple roles)

### Permission Format
Permissions use the format: `resource:action`
- Examples: `jobs:view`, `users:create`, `applications:delete`

## 🔧 Implementation Components

### 1. Server-Side API Protection

#### Quick Protection (Recommended)
```javascript
import { protectRoute } from "../../../lib/middleware/apiProtection";

export async function GET(req) {
  // Check if user has permission to view jobs
  const authResult = await protectRoute("jobs", "view");
  if (authResult.error) return authResult.error;
  
  const { session } = authResult;
  
  // Your API logic here...
}
```

#### Advanced Protection
```javascript
import { createPermissionGuard } from "../../../lib/middleware/permissionMiddleware";

const guard = createPermissionGuard({
  permissions: [
    { resource: "jobs", action: "view" },
    { resource: "applications", action: "view" }
  ],
  requireAll: false, // User needs ANY of these permissions
  allowSuperAdmin: true
});

export async function GET(req, context) {
  return guard(req, context, async () => {
    // Your protected API logic here
    return NextResponse.json({ data: "success" });
  });
}
```

### 2. Page-Level Protection

#### Protect Entire Pages
```javascript
import { ResourcePermissionGuard } from "@/app/components/guards/PagePermissionGuard";

export default function AdminJobs() {
  return (
    <ResourcePermissionGuard 
      resource="jobs" 
      actions={["view"]}
      fallbackPath="/admin/dashboard"
    >
      <AdminJobsContent />
    </ResourcePermissionGuard>
  );
}
```

#### Multiple Permission Requirements
```javascript
<PagePermissionGuard
  requiredPermissions={[
    { resource: "users", action: "view" },
    { resource: "users", action: "edit" }
  ]}
  requireAll={true} // User needs ALL permissions
  minPrivilegeLevel={2} // Also require admin level 2+
>
  <YourPageContent />
</PagePermissionGuard>
```

### 3. Component-Level Protection

#### Hide/Show UI Elements
```javascript
import { CanCreate, CanEdit, CanDelete } from "@/app/components/guards/ComponentPermissionGuard";

function JobActions({ job }) {
  return (
    <div className="flex space-x-2">
      <CanEdit resource="jobs">
        <button onClick={() => editJob(job.id)}>Edit</button>
      </CanEdit>
      
      <CanDelete resource="jobs">
        <button onClick={() => deleteJob(job.id)}>Delete</button>
      </CanDelete>
      
      <CanCreate resource="jobs">
        <button onClick={createNewJob}>Create New</button>
      </CanCreate>
    </div>
  );
}
```

#### Permission-Aware Buttons
```javascript
import { PermissionButton } from "@/app/components/guards/ComponentPermissionGuard";

<PermissionButton
  resource="users"
  action="delete"
  onClick={() => deleteUser(userId)}
  className="btn-danger"
  hideWhenNoPermission={true} // Button disappears if no permission
>
  Delete User
</PermissionButton>
```

### 4. Using the Permission Hook

```javascript
import { usePermissions } from "@/app/hooks/usePermissions";

function MyComponent() {
  const { hasPermission, can, isSuperAdmin } = usePermissions();
  
  // Check specific permissions
  if (hasPermission("jobs", "create")) {
    // Show create job button
  }
  
  // Use convenience functions
  if (can.edit("users")) {
    // Show edit user option
  }
  
  // Check admin status
  if (isSuperAdmin) {
    // Show super admin features
  }
}
```

## 📋 Available Permissions

### Jobs Management
- `jobs:view` - View job listings
- `jobs:create` - Create new jobs
- `jobs:edit` - Modify existing jobs
- `jobs:delete` - Remove jobs
- `jobs:publish` - Publish/unpublish jobs
- `jobs:feature` - Mark jobs as featured

### User Management
- `users:view` - View user profiles
- `users:create` - Create new user accounts
- `users:edit` - Modify user profiles
- `users:delete` - Remove user accounts

### Applications
- `applications:view` - View job applications
- `applications:edit` - Modify application details
- `applications:delete` - Remove applications

### Roles & Permissions
- `roles:view` - View role configurations
- `roles:create` - Create new roles
- `roles:edit` - Modify role permissions
- `roles:delete` - Remove roles
- `roles:assign` - Assign roles to users

### Analytics & Reports
- `analytics:view` - Access dashboard analytics
- `reports:view` - View system reports
- `reports:create` - Generate custom reports

### Settings
- `settings:view` - View system settings
- `settings:edit_branding` - Modify branding/appearance
- `settings:edit_system` - Modify system configuration

### Communication
- `emails:send` - Send emails to users
- `emails:templates` - Manage email templates
- `weekly_digest:send` - Send weekly digest emails
- `weekly_digest:configure` - Configure digest settings

### Security & Auditing
- `audit_logs:view` - View system activity logs
- `audit_logs:export` - Download audit data

## 🚀 Best Practices

### 1. Always Protect APIs First
Server-side protection is your primary security layer. Never rely solely on client-side guards.

```javascript
// ✅ Good: API is protected
export async function DELETE(req, { params }) {
  const authResult = await protectRoute("users", "delete");
  if (authResult.error) return authResult.error;
  
  // Delete user logic
}

// ❌ Bad: Only client-side protection
function DeleteButton() {
  return (
    <CanDelete resource="users">
      <button onClick={deleteUser}>Delete</button>
    </CanDelete>
  );
}
```

### 2. Use Appropriate Permission Level
Match the permission granularity to your needs:

```javascript
// For viewing sensitive data
<CanView resource="users">
  <UserProfile user={user} />
</CanView>

// For admin-only features
<AdminOnly minLevel={2}>
  <AdminSettings />
</AdminOnly>

// For complex requirements
<PagePermissionGuard
  requiredPermissions={[
    { resource: "analytics", action: "view" },
    { resource: "reports", action: "create" }
  ]}
  requireAll={true}
  customCheck={(session) => ({
    allowed: session.user.department === "management"
  })}
>
  <AdvancedAnalytics />
</PagePermissionGuard>
```

### 3. Handle Loading States
```javascript
function ProtectedContent() {
  const { hasPermission, loading } = usePermissions();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (!hasPermission("jobs", "view")) {
    return <AccessDenied />;
  }
  
  return <JobsList />;
}
```

### 4. Provide Helpful Feedback
```javascript
<ComponentPermissionGuard
  resource="users"
  action="edit"
  fallback={
    <div className="text-gray-500">
      You need user editing permissions to modify profiles.
      Contact your administrator for access.
    </div>
  }
>
  <EditUserForm />
</ComponentPermissionGuard>
```

## 🔍 Testing Permissions

### 1. Test Each Permission
Create test users with different role combinations and verify:
- ✅ Users can access what they should
- ✅ Users are blocked from what they shouldn't access
- ✅ Error messages are helpful
- ✅ UI elements show/hide correctly

### 2. Test Edge Cases
- What happens when a user has no roles?
- What happens when roles are changed while user is logged in?
- Do super admins bypass all restrictions?
- Are self-access scenarios handled correctly?

### 3. API Testing
```bash
# Test with different user sessions
curl -H "Authorization: Bearer USER_TOKEN" /api/admin/users
# Should return 403 for non-admin users

curl -H "Authorization: Bearer ADMIN_TOKEN" /api/admin/users  
# Should return user data for admin users
```

## 🛠️ Troubleshooting

### Permission Not Working?
1. Check if the user has the role assigned
2. Check if the role has the permission assigned
3. Check if the user's session is up to date
4. Verify API endpoint is using `protectRoute()`

### UI Element Always Hidden?
1. Check the permission hook is loading correctly
2. Verify the resource:action combination exists
3. Check for typos in permission names
4. Ensure session includes permission data

### Session Permission Cache Issues?
```javascript
// Force session update
import { useSession } from "next-auth/react";
const { update } = useSession();
await update(); // This will refresh permissions
```

## 📚 Migration Guide

### Updating Existing API Routes
Replace privilege level checks with permission checks:

```javascript
// Before
if (session.user.privilegeLevel < 2) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// After
const authResult = await protectRoute("jobs", "view");
if (authResult.error) return authResult.error;
```

### Updating Existing Components
Replace manual permission checks with guards:

```javascript
// Before
{session?.user?.privilegeLevel >= 2 && (
  <button onClick={createJob}>Create Job</button>
)}

// After
<CanCreate resource="jobs">
  <button onClick={createJob}>Create Job</button>
</CanCreate>
```

This permission system provides enterprise-grade access control while maintaining excellent developer experience and user interface responsiveness.