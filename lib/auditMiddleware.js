import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { extractRequestContext } from "@/app/lib/auditLog";

/**
 * Audit logging middleware for API routes
 * Wraps API handlers to automatically log requests and responses
 */
export function withAuditLogging(handler, auditConfig) {
  return async function auditedHandler(request, context) {
    const startTime = Date.now();
    let session = null;
    let requestContext = {};
    let auditLogId = null;

    try {
      // Get session and request context
      session = await getServerSession(authOptions);
      requestContext = extractRequestContext(request);
      
      // Extract route information
      const url = new URL(request.url);
      const method = request.method;
      const pathname = url.pathname;

      // Log the start of the operation (pending status)
      if (auditConfig.logStart !== false) {
        auditLogId = await logAuditEvent({
          eventType: auditConfig.eventType || 'API_CALL',
          category: auditConfig.category || 'API',
          subcategory: auditConfig.subcategory,
          entityType: auditConfig.entityType,
          entityId: auditConfig.getEntityId ? auditConfig.getEntityId(request, context) : null,
          entityName: auditConfig.getEntityName ? auditConfig.getEntityName(request, context) : null,
          actorId: session?.user?.id || null,
          actorType: session?.user ? 'user' : 'anonymous',
          actorName: session?.user ? `${session.user.firstName || ''} ${session.user.lastName || ''}`.trim() || session.user.email : 'Anonymous',
          action: auditConfig.action || `${method} ${pathname}`,
          description: auditConfig.getDescription ? auditConfig.getDescription(request, context, 'start') : `${method} request to ${pathname}`,
          ipAddress: requestContext.ipAddress,
          userAgent: requestContext.userAgent,
          sessionId: session?.user?.id || null, // You might want to use actual session ID
          requestId: requestContext.requestId,
          severity: 'info',
          status: 'pending',
          tags: auditConfig.getTags ? auditConfig.getTags(request, context) : ['api', method.toLowerCase()],
          metadata: {
            method,
            url: pathname,
            query: Object.fromEntries(url.searchParams.entries()),
            startTime: new Date().toISOString(),
            ...(auditConfig.getMetadata ? auditConfig.getMetadata(request, context, 'start') : {})
          }
        }, request);
      }

      // Execute the original handler
      const result = await handler(request, context);
      const duration = Date.now() - startTime;

      // Log successful completion
      await logAuditEvent({
        eventType: auditConfig.eventType || 'API_CALL',
        category: auditConfig.category || 'API',
        subcategory: auditConfig.subcategory,
        entityType: auditConfig.entityType,
        entityId: auditConfig.getEntityId ? auditConfig.getEntityId(request, context, result) : null,
        entityName: auditConfig.getEntityName ? auditConfig.getEntityName(request, context, result) : null,
        actorId: session?.user?.id || null,
        actorType: session?.user ? 'user' : 'anonymous',
        actorName: session?.user ? `${session.user.firstName || ''} ${session.user.lastName || ''}`.trim() || session.user.email : 'Anonymous',
        action: auditConfig.action || `${method} ${pathname} - Success`,
        description: auditConfig.getDescription ? auditConfig.getDescription(request, context, 'success', result) : `Successfully processed ${method} request to ${pathname}`,
        oldValues: auditConfig.getOldValues ? auditConfig.getOldValues(request, context, result) : null,
        newValues: auditConfig.getNewValues ? auditConfig.getNewValues(request, context, result) : null,
        changes: auditConfig.getChanges ? auditConfig.getChanges(request, context, result) : null,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        sessionId: session?.user?.id || null,
        requestId: requestContext.requestId,
        relatedUserId: auditConfig.getRelatedUserId ? auditConfig.getRelatedUserId(request, context, result) : null,
        relatedJobId: auditConfig.getRelatedJobId ? auditConfig.getRelatedJobId(request, context, result) : null,
        relatedApplicationId: auditConfig.getRelatedApplicationId ? auditConfig.getRelatedApplicationId(request, context, result) : null,
        severity: 'info',
        status: 'success',
        tags: auditConfig.getTags ? auditConfig.getTags(request, context, result) : ['api', method.toLowerCase(), 'success'],
        metadata: {
          method,
          url: pathname,
          query: Object.fromEntries(url.searchParams.entries()),
          duration: `${duration}ms`,
          statusCode: result?.status || 200,
          completedAt: new Date().toISOString(),
          ...(auditConfig.getMetadata ? auditConfig.getMetadata(request, context, 'success', result) : {})
        }
      }, request);

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;

      // Log the error
      await logAuditEvent({
        eventType: 'ERROR',
        category: auditConfig.category || 'API',
        subcategory: auditConfig.subcategory,
        entityType: auditConfig.entityType,
        entityId: auditConfig.getEntityId ? auditConfig.getEntityId(request, context) : null,
        entityName: auditConfig.getEntityName ? auditConfig.getEntityName(request, context) : null,
        actorId: session?.user?.id || null,
        actorType: session?.user ? 'user' : 'anonymous',
        actorName: session?.user ? `${session.user.firstName || ''} ${session.user.lastName || ''}`.trim() || session.user.email : 'Anonymous',
        action: auditConfig.action || `${request.method} ${new URL(request.url).pathname} - Failed`,
        description: auditConfig.getDescription ? auditConfig.getDescription(request, context, 'error', null, error) : `Failed to process ${request.method} request: ${error.message}`,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        sessionId: session?.user?.id || null,
        requestId: requestContext.requestId,
        relatedUserId: auditConfig.getRelatedUserId ? auditConfig.getRelatedUserId(request, context) : null,
        relatedJobId: auditConfig.getRelatedJobId ? auditConfig.getRelatedJobId(request, context) : null,
        relatedApplicationId: auditConfig.getRelatedApplicationId ? auditConfig.getRelatedApplicationId(request, context) : null,
        severity: error.status >= 500 ? 'error' : 'warning',
        status: 'failure',
        tags: auditConfig.getTags ? auditConfig.getTags(request, context, null, error) : ['api', request.method.toLowerCase(), 'error'],
        metadata: {
          method: request.method,
          url: new URL(request.url).pathname,
          query: Object.fromEntries(new URL(request.url).searchParams.entries()),
          duration: `${duration}ms`,
          error: error.message,
          stack: error.stack,
          statusCode: error.status || 500,
          failedAt: new Date().toISOString(),
          ...(auditConfig.getMetadata ? auditConfig.getMetadata(request, context, 'error', null, error) : {})
        }
      }, request);

      // Re-throw the error
      throw error;
    }
  };
}

/**
 * Audit logging function for manual use in API routes
 * Use this when you need more granular control over what gets logged
 */
export async function logAuditEvent(eventConfig, request = null) {
  try {
    // Only try to get session if we're in a request context (not for background/system operations)
    let session = null;
    if (eventConfig.actorType !== 'system' && typeof window === 'undefined') {
      try {
        session = await getServerSession(authOptions);
      } catch (error) {
        // Ignore session errors for system operations
        console.log("No session context available for system operation");
      }
    }
    const requestContext = request ? extractRequestContext(request) : {};
    const { PrismaClient } = await import("@/app/generated/prisma");
    const prisma = new PrismaClient();

    const auditData = {
      event_type: eventConfig.eventType,
      category: eventConfig.category,
      subcategory: eventConfig.subcategory || null,
      entity_type: eventConfig.entityType || null,
      entity_id: eventConfig.entityId || null,
      entity_name: eventConfig.entityName || null,
      actor_id: session?.user?.id || eventConfig.actorId || null,
      actor_type: session?.user ? 'user' : eventConfig.actorType || 'system',
      actor_name: session?.user ? `${session.user.firstName || ''} ${session.user.lastName || ''}`.trim() || session.user.email : eventConfig.actorName || 'System',
      action: eventConfig.action,
      description: eventConfig.description || null,
      old_values: eventConfig.oldValues || null,
      new_values: eventConfig.newValues || null,
      changes: eventConfig.changes || null,
      ip_address: requestContext.ipAddress || eventConfig.ipAddress || null,
      user_agent: requestContext.userAgent || eventConfig.userAgent || null,
      session_id: session?.user?.id || eventConfig.sessionId || null,
      request_id: requestContext.requestId || eventConfig.requestId || null,
      related_user_id: eventConfig.relatedUserId || null,
      related_job_id: eventConfig.relatedJobId || null,
      related_application_id: eventConfig.relatedApplicationId || null,
      severity: eventConfig.severity || 'info',
      status: eventConfig.status || 'success',
      tags: eventConfig.tags || [],
      metadata: eventConfig.metadata || null
    };

    const result = await prisma.audit_logs.create({
      data: auditData
    });

    await prisma.$disconnect();
    return result;
  } catch (error) {
    console.error('Failed to log audit event:', error);
    return null;
  }
}

/**
 * Helper function to calculate changes between old and new values
 */
export function calculateChanges(oldValues, newValues) {
  if (!oldValues || !newValues) return null;
  
  const changes = {};
  const allKeys = new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);
  
  for (const key of allKeys) {
    const oldValue = oldValues[key];
    const newValue = newValues[key];
    
    if (oldValue !== newValue) {
      changes[key] = {
        from: oldValue,
        to: newValue
      };
    }
  }
  
  return Object.keys(changes).length > 0 ? changes : null;
}

/**
 * Predefined audit configurations for common operations
 */
export const AUDIT_CONFIGS = {
  // User operations
  USER_CREATE: {
    eventType: 'CREATE',
    category: 'USER',
    action: 'User account created',
    entityType: 'user'
  },
  
  USER_UPDATE: {
    eventType: 'UPDATE',
    category: 'USER',
    action: 'User profile updated',
    entityType: 'user'
  },
  
  USER_DELETE: {
    eventType: 'DELETE',
    category: 'USER',
    action: 'User account deleted',
    entityType: 'user'
  },

  // Job operations
  JOB_CREATE: {
    eventType: 'CREATE',
    category: 'JOB',
    action: 'Job posting created',
    entityType: 'job'
  },
  
  JOB_UPDATE: {
    eventType: 'UPDATE',
    category: 'JOB',
    action: 'Job posting updated',
    entityType: 'job'
  },
  
  JOB_PUBLISH: {
    eventType: 'PUBLISH',
    category: 'JOB',
    subcategory: 'JOB_PUBLISH',
    action: 'Job posting published',
    entityType: 'job'
  },

  // Application operations
  APPLICATION_CREATE: {
    eventType: 'CREATE',
    category: 'APPLICATION',
    action: 'Job application submitted',
    entityType: 'application'
  },
  
  APPLICATION_UPDATE: {
    eventType: 'UPDATE',
    category: 'APPLICATION',
    action: 'Application updated',
    entityType: 'application'
  },
  
  APPLICATION_STATUS_CHANGE: {
    eventType: 'UPDATE',
    category: 'APPLICATION',
    subcategory: 'STATUS_CHANGE',
    action: 'Application status changed',
    entityType: 'application'
  },

  // Email operations
  EMAIL_SEND: {
    eventType: 'SEND',
    category: 'EMAIL',
    action: 'Email sent',
    entityType: 'email'
  },
  
  EMAIL_BULK_SEND: {
    eventType: 'SEND',
    category: 'EMAIL',
    subcategory: 'BULK_SEND',
    action: 'Bulk email campaign sent',
    entityType: 'email_campaign'
  },

  // Authentication operations
  AUTH_LOGIN: {
    eventType: 'LOGIN',
    category: 'USER',
    action: 'User logged in',
    entityType: 'user'
  },
  
  AUTH_LOGOUT: {
    eventType: 'LOGOUT',
    category: 'USER',
    action: 'User logged out',
    entityType: 'user'
  },
  
  AUTH_FAILED: {
    eventType: 'LOGIN',
    category: 'SECURITY',
    action: 'Failed login attempt',
    severity: 'warning',
    status: 'failure'
  }
};

export default withAuditLogging;