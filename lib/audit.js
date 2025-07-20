import { prisma } from '@/app/generated/prisma';

export class AuditLogger {
  static async log({
    eventType,
    category,
    subcategory = null,
    action,
    description = null,
    entityType = null,
    entityId = null,
    entityName = null,
    actorId = null,
    actorType = 'user',
    actorName = null,
    oldValues = null,
    newValues = null,
    changes = null,
    relatedUserId = null,
    relatedJobId = null,
    relatedApplicationId = null,
    ipAddress = null,
    userAgent = null,
    sessionId = null,
    requestId = null,
    severity = 'info',
    status = 'success',
    tags = [],
    metadata = null
  }) {
    try {
      const auditLog = await prisma.auditLog.create({
        data: {
          eventType,
          category,
          subcategory,
          action,
          description,
          entityType,
          entityId,
          entityName,
          actorId,
          actorType,
          actorName,
          oldValues,
          newValues,
          changes,
          relatedUserId,
          relatedJobId,
          relatedApplicationId,
          ipAddress,
          userAgent,
          sessionId,
          requestId,
          severity,
          status,
          tags,
          metadata
        }
      });
      
      return auditLog;
    } catch (error) {
      console.error('Failed to create audit log:', error);
      // Don't throw - audit logging should not break the main operation
      return null;
    }
  }

  // Helper methods for common audit events
  static async logUserAction(userId, action, description, metadata = {}) {
    return this.log({
      eventType: 'USER_ACTION',
      category: 'USER',
      action,
      description,
      actorId: userId,
      entityType: 'user',
      entityId: userId,
      metadata
    });
  }

  static async logJobAction(userId, jobId, action, description, oldValues = null, newValues = null) {
    return this.log({
      eventType: 'JOB_ACTION',
      category: 'JOB',
      action,
      description,
      actorId: userId,
      entityType: 'job',
      entityId: jobId,
      relatedJobId: jobId,
      oldValues,
      newValues,
      changes: oldValues && newValues ? this.calculateChanges(oldValues, newValues) : null
    });
  }

  static async logApplicationAction(userId, applicationId, jobId, action, description, oldValues = null, newValues = null) {
    return this.log({
      eventType: 'APPLICATION_ACTION',
      category: 'APPLICATION',
      action,
      description,
      actorId: userId,
      entityType: 'application',
      entityId: applicationId,
      relatedApplicationId: applicationId,
      relatedJobId: jobId,
      oldValues,
      newValues,
      changes: oldValues && newValues ? this.calculateChanges(oldValues, newValues) : null
    });
  }

  static async logEmailAction(userId, emailId, action, description, metadata = {}) {
    return this.log({
      eventType: 'EMAIL_ACTION',
      category: 'EMAIL',
      action,
      description,
      actorId: userId,
      entityType: 'email',
      entityId: emailId,
      metadata
    });
  }

  static async logAuthAction(userId, action, description, ipAddress = null, userAgent = null) {
    return this.log({
      eventType: 'AUTH_ACTION',
      category: 'AUTH',
      action,
      description,
      actorId: userId,
      entityType: 'user',
      entityId: userId,
      ipAddress,
      userAgent
    });
  }

  static async logSystemAction(action, description, metadata = {}) {
    return this.log({
      eventType: 'SYSTEM_ACTION',
      category: 'SYSTEM',
      action,
      description,
      actorType: 'system',
      metadata
    });
  }

  static async logApiCall(userId, endpoint, method, statusCode, ipAddress = null, userAgent = null) {
    return this.log({
      eventType: 'API_CALL',
      category: 'API',
      action: `${method} ${endpoint}`,
      description: `API call to ${endpoint}`,
      actorId: userId,
      ipAddress,
      userAgent,
      status: statusCode >= 200 && statusCode < 300 ? 'success' : 'failure',
      metadata: { statusCode, method, endpoint }
    });
  }

  // Utility method to calculate changes between old and new values
  static calculateChanges(oldValues, newValues) {
    const changes = {};
    
    // Get all unique keys from both objects
    const allKeys = new Set([...Object.keys(oldValues || {}), ...Object.keys(newValues || {})]);
    
    for (const key of allKeys) {
      const oldValue = oldValues?.[key];
      const newValue = newValues?.[key];
      
      if (oldValue !== newValue) {
        changes[key] = {
          from: oldValue,
          to: newValue
        };
      }
    }
    
    return Object.keys(changes).length > 0 ? changes : null;
  }

  // Helper to extract request info from Next.js request
  static extractRequestInfo(request) {
    return {
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      userAgent: request.headers.get('user-agent') || null,
      requestId: request.headers.get('x-request-id') || null
    };
  }
}

export default AuditLogger;