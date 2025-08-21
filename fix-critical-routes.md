# 🚨 CRITICAL SECURITY FIXES REQUIRED

## Summary
**113 out of 148 API routes have security vulnerabilities**

### Issue Types:
- **HARDCODED_PRIVILEGE_CHECK**: Using `privilegeLevel >= X` instead of permission system
- **NO_PROTECTION**: No authentication/authorization at all

## IMMEDIATE PRIORITY FIXES (Admin Routes)

### 1. Users Management Routes ⚠️ CRITICAL
**Files to fix:**
- `app/api/admin/users/[id]/route.js` - HARDCODED_PRIVILEGE_CHECK
- `app/api/v1/users/[id]/route.js` - HARDCODED_PRIVILEGE_CHECK  
- `app/api/v1/users/route.js` - HARDCODED_PRIVILEGE_CHECK

**Required permissions:**
- GET → `users:view`
- POST → `users:create`
- PATCH → `users:edit`
- DELETE → `users:delete`

### 2. Jobs Management Routes ⚠️ CRITICAL
**Files to fix:**
- `app/api/admin/jobs/[id]/route.js` - HARDCODED_PRIVILEGE_CHECK
- `app/api/admin/jobs/[id]/duplicate/route.js` - HARDCODED_PRIVILEGE_CHECK
- `app/api/admin/jobs/[id]/feature/route.js` - HARDCODED_PRIVILEGE_CHECK

**Required permissions:**
- GET → `jobs:view`
- POST → `jobs:create`
- PATCH → `jobs:edit`
- DELETE → `jobs:delete`
- duplicate → `jobs:clone`
- feature → `jobs:feature`

### 3. Applications Management Routes ⚠️ CRITICAL
**Files to fix:**
- `app/api/admin/applications/[id]/route.js` - HARDCODED_PRIVILEGE_CHECK
- `app/api/admin/applications/[id]/notes/route.js` - HARDCODED_PRIVILEGE_CHECK
- `app/api/admin/applications/[id]/audit/route.js` - HARDCODED_PRIVILEGE_CHECK

**Required permissions:**
- GET → `applications:view`
- PATCH → `applications:edit`
- notes → `applications:notes`
- audit → `audit_logs:view`

### 4. Settings Routes ⚠️ CRITICAL
**Files to fix:**
- `app/api/admin/settings/[key]/route.js` - HARDCODED_PRIVILEGE_CHECK
- `app/api/admin/settings/local-auth/route.js` - HARDCODED_PRIVILEGE_CHECK

**Required permissions:**
- GET → `settings:view`
- PATCH → `settings:edit_system`

### 5. Roles Management Routes ⚠️ CRITICAL
**Files to fix:**
- `app/api/roles/route.js` - NO_PROTECTION
- `app/api/roles/[roleId]/route.js` - NO_PROTECTION
- `app/api/roles/[roleId]/users/route.js` - NO_PROTECTION

**Required permissions:**
- GET → `roles:view`
- POST → `roles:create`
- PATCH → `roles:edit`
- DELETE → `roles:delete`
- assign → `roles:assign`

## STANDARD FIX PATTERN

### For HARDCODED_PRIVILEGE_CHECK:
**Replace this:**
```javascript
// BAD:
if (!session || !session.user.privilegeLevel || session.user.privilegeLevel < 3) {
  return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
}
```

**With this:**
```javascript
// GOOD:
import { protectRoute } from "../../../../lib/middleware/apiProtection";

export async function METHOD_NAME(req, { params }) {
  const authResult = await protectRoute("RESOURCE", "ACTION");
  if (authResult.error) return authResult.error;
  const { session } = authResult;
  // ... rest of code
}
```

### For NO_PROTECTION:
**Add this to the beginning:**
```javascript
import { protectRoute } from "../../../../lib/middleware/apiProtection";

export async function METHOD_NAME(req, { params }) {
  const authResult = await protectRoute("RESOURCE", "ACTION");
  if (authResult.error) return authResult.error;
  const { session } = authResult;
  // ... rest of code
}
```

## PERMISSION MAPPING

| Route Pattern | GET | POST | PATCH | DELETE | Special |
|---------------|-----|------|-------|--------|---------|
| `/admin/users/*` | users:view | users:create | users:edit | users:delete | users:impersonate |
| `/admin/jobs/*` | jobs:view | jobs:create | jobs:edit | jobs:delete | jobs:feature, jobs:clone |
| `/admin/applications/*` | applications:view | applications:create | applications:edit | applications:delete | applications:notes |
| `/admin/settings/*` | settings:view | - | settings:edit_system | - | settings:integrations |
| `/roles/*` | roles:view | roles:create | roles:edit | roles:delete | roles:assign |
| `/admin/interviews/*` | interviews:view | interviews:create | interviews:edit | interviews:delete | interviews:notes |
| `/admin/communication/*` | emails:view | emails:create | emails:templates | - | emails:send |

## PUBLIC ROUTES (Should remain NO_PROTECTION)
- `/auth/*` - Authentication routes
- `/setup/*` - First-time setup (token-based)
- `/jobs/route.js` - Public job listings
- `/favicon/*` - Public assets
- `/health` - Health checks
- `/system/health` - System status

## URGENT ACTION PLAN
1. **Start with user management routes** (highest risk)
2. **Fix job and application routes** (business critical)
3. **Fix settings and role routes** (admin critical)
4. **Add protection to other admin routes**
5. **Test each fix thoroughly**

This is a **massive security vulnerability** that needs immediate attention!