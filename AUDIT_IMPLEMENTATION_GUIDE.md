# Audit Logging Implementation Guide

## Overview
This guide shows you how to implement comprehensive audit logging across your JobSite application.

## ✅ Completed Components

1. **Database & Schema**: Full audit_logs table with all columns
2. **Admin Interface**: Complete audit log viewer with filtering and details modal
3. **Utility Functions**: Comprehensive audit logging utilities
4. **Middleware**: Reusable audit logging middleware
5. **Authentication**: Login/logout audit logging added to NextAuth
6. **User Management**: Full audit logging for user CRUD operations

## 🔄 Implementation Pattern

### For Each API Route, Add:

```javascript
import { logAuditEvent, calculateChanges } from "../path/to/auditMiddleware";
import { extractRequestContext } from "../path/to/auditLog";

export async function POST/PUT/PATCH/DELETE(req, { params }) {
  try {
    const requestContext = extractRequestContext(req);
    
    // Get current data (for updates)
    const currentData = await prisma.model.findUnique({ where: { id } });
    
    // Perform operation
    const result = await prisma.model.operation(data);
    
    // Log successful operation
    await logAuditEvent({
      eventType: 'CREATE|UPDATE|DELETE',
      category: 'USER|JOB|APPLICATION|EMAIL|SYSTEM',
      subcategory: 'optional_subcategory',
      entityType: 'user|job|application|email',
      entityId: result.id,
      entityName: result.name || result.title || result.email,
      action: 'Descriptive action name',
      description: 'Detailed description of what happened',
      oldValues: currentData, // for updates
      newValues: updateData,  // for updates
      changes: calculateChanges(currentData, updateData),
      relatedUserId: relatedUserId,
      relatedJobId: relatedJobId,
      relatedApplicationId: relatedApplicationId,
      severity: 'info|warning|error|critical',
      status: 'success',
      tags: ['relevant', 'tags', 'for', 'filtering'],
      metadata: { additional: 'context' },
      ...requestContext
    }, req);
    
    return response;
    
  } catch (error) {
    // Log error
    await logAuditEvent({
      eventType: 'ERROR',
      category: 'CATEGORY',
      action: 'Failed operation description',
      description: error.message,
      severity: 'error',
      status: 'failure',
      tags: ['error', 'failure'],
      metadata: { error: error.message, stack: error.stack }
    }, req);
    
    throw error;
  }
}
```

## 📋 Remaining Tasks

### 1. Job Management Endpoints
- `/api/admin/jobs/route.js` (GET, POST)
- `/api/admin/jobs/[id]/route.js` (GET, PATCH, DELETE)
- `/api/admin/jobs/[id]/feature/route.js` (POST)
- `/api/admin/jobs/[id]/duplicate/route.js` (POST)

### 2. Application Management Endpoints
- `/api/applications/route.js` (POST - new applications)
- `/api/admin/applications/route.js` (GET)

### 3. Email/Communication Endpoints
- `/api/admin/communication/send-email/route.js`
- `/api/admin/communication/emails/route.js`
- `/api/admin/email-templates/route.js`

### 4. Settings Endpoints
- `/api/admin/settings/route.js`
- `/api/admin/categories/route.js`

## 🎯 Key Audit Events to Track

### High Priority:
- **User Authentication**: Login/logout attempts ✅
- **User Management**: Create/update/delete users ✅
- **Privilege Changes**: Role and permission changes ✅
- **Job Management**: Create/update/delete/publish jobs
- **Application Status Changes**: Status updates, notes
- **Email Sending**: All outbound communications
- **System Settings**: Configuration changes

### Medium Priority:
- **File Uploads**: Resume uploads
- **Data Exports**: CSV downloads, reports
- **Search Activities**: Job searches, filters
- **Profile Updates**: User profile changes

### Low Priority:
- **Page Views**: Admin page access
- **API Calls**: General API usage statistics

## 🛡️ Security Considerations

1. **Sensitive Data**: Never log passwords, tokens, or sensitive personal data
2. **Performance**: Audit logging should never block main operations
3. **Storage**: Consider log retention policies for compliance
4. **Access**: Only admins (level 2+) can view audit logs
5. **Integrity**: Audit logs should be immutable once created

## 📊 Audit Log Categories

- **USER**: User account operations
- **JOB**: Job posting management
- **APPLICATION**: Job application lifecycle
- **EMAIL**: Communication tracking
- **SYSTEM**: System configuration
- **SECURITY**: Security-related events
- **API**: API usage tracking

## 🔧 Quick Implementation Commands

### For each remaining endpoint:

1. **Add imports**:
```javascript
import { logAuditEvent, calculateChanges } from "../../../../lib/auditMiddleware";
import { extractRequestContext } from "../../../../lib/auditLog";
```

2. **Add audit logging after successful operations**
3. **Add error logging in catch blocks**
4. **Test the endpoint to ensure audit logs are created**

## 📈 Testing Your Implementation

1. **Test successful operations** - Check logs are created
2. **Test error conditions** - Verify error logs
3. **Check audit log admin page** - Confirm logs appear
4. **Verify filtering works** - Test search and filters
5. **Test export functionality** - Ensure CSV export works

## 🎉 Benefits

Once fully implemented, you'll have:
- **Complete audit trail** of all system activities
- **Compliance readiness** for security audits
- **Debugging capability** for investigating issues
- **User activity tracking** for analytics
- **Security monitoring** for suspicious activities
- **Change tracking** with before/after values

## 📝 Next Steps

1. Implement remaining job management endpoints
2. Add application submission tracking
3. Implement email/communication logging
4. Add settings change tracking
5. Test thoroughly
6. Document any custom audit requirements