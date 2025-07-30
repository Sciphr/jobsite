import { PrismaClient } from "@/app/generated/prisma";

const prisma = new PrismaClient();

/**
 * Comprehensive Audit Logging Service
 *
 * This service provides a standardized way to log all actions across the application
 * for compliance, debugging, and historical tracking.
 */

// Event Types
export const EVENT_TYPES = {
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  VIEW: "VIEW",
  DOWNLOAD: "DOWNLOAD",
  UPLOAD: "UPLOAD",
  SEND: "SEND",
  APPROVE: "APPROVE",
  REJECT: "REJECT",
  ASSIGN: "ASSIGN",
  UNASSIGN: "UNASSIGN",
  ACTIVATE: "ACTIVATE",
  DEACTIVATE: "DEACTIVATE",
  PUBLISH: "PUBLISH",
  UNPUBLISH: "UNPUBLISH",
  ARCHIVE: "ARCHIVE",
  RESTORE: "RESTORE",
  EXPORT: "EXPORT",
  IMPORT: "IMPORT",
  DUPLICATE: "DUPLICATE",
  MOVE: "MOVE",
  MERGE: "MERGE",
  SPLIT: "SPLIT",
  SYNC: "SYNC",
  VALIDATE: "VALIDATE",
  PROCESS: "PROCESS",
  CANCEL: "CANCEL",
  RETRY: "RETRY",
  SCHEDULE: "SCHEDULE",
  EXECUTE: "EXECUTE",
  COMPLETE: "COMPLETE",
  ERROR: "ERROR",
  WARNING: "WARNING",
};

// Categories
export const CATEGORIES = {
  USER: "USER",
  JOB: "JOB",
  APPLICATION: "APPLICATION",
  EMAIL: "EMAIL",
  TEMPLATE: "TEMPLATE",
  CAMPAIGN: "CAMPAIGN",
  FILE: "FILE",
  SYSTEM: "SYSTEM",
  SECURITY: "SECURITY",
  ADMIN: "ADMIN",
  API: "API",
  INTEGRATION: "INTEGRATION",
  NOTIFICATION: "NOTIFICATION",
  REPORT: "REPORT",
  BACKUP: "BACKUP",
  MAINTENANCE: "MAINTENANCE",
  PERFORMANCE: "PERFORMANCE",
  COMPLIANCE: "COMPLIANCE",
};

// Subcategories for detailed classification
export const SUBCATEGORIES = {
  // User subcategories
  PROFILE_UPDATE: "PROFILE_UPDATE",
  PASSWORD_CHANGE: "PASSWORD_CHANGE",
  PRIVILEGE_CHANGE: "PRIVILEGE_CHANGE",
  ACCOUNT_LOCK: "ACCOUNT_LOCK",
  ACCOUNT_UNLOCK: "ACCOUNT_UNLOCK",

  // Application subcategories
  STATUS_CHANGE: "STATUS_CHANGE",
  NOTE_UPDATE: "NOTE_UPDATE",
  RESUME_UPDATE: "RESUME_UPDATE",

  // Job subcategories
  JOB_PUBLISH: "JOB_PUBLISH",
  JOB_FEATURE: "JOB_FEATURE",
  JOB_CLOSE: "JOB_CLOSE",
  JOB_REOPEN: "JOB_REOPEN",

  // Email subcategories
  TEMPLATE_CREATE: "TEMPLATE_CREATE",
  TEMPLATE_UPDATE: "TEMPLATE_UPDATE",
  BULK_SEND: "BULK_SEND",
  AUTOMATED_SEND: "AUTOMATED_SEND",

  // System subcategories
  SETTING_CHANGE: "SETTING_CHANGE",
  MIGRATION: "MIGRATION",
  DEPLOYMENT: "DEPLOYMENT",
  BACKUP_CREATE: "BACKUP_CREATE",
  BACKUP_RESTORE: "BACKUP_RESTORE",
};

// Severity levels
export const SEVERITY = {
  INFO: "info",
  WARNING: "warning",
  ERROR: "error",
  CRITICAL: "critical",
};

// Status types
export const STATUS = {
  SUCCESS: "success",
  FAILURE: "failure",
  PARTIAL: "partial",
  PENDING: "pending",
};

// Actor types
export const ACTOR_TYPES = {
  USER: "user",
  SYSTEM: "system",
  API: "api",
  CRON: "cron",
  WEBHOOK: "webhook",
  INTEGRATION: "integration",
};

/**
 * Main audit logging function
 * @param {Object} logData - The audit log data
 * @returns {Promise<Object>} - Created audit log entry
 */
export async function createAuditLog(logData) {
  try {
    const {
      eventType,
      category,
      subcategory = null,
      entityType = null,
      entityId = null,
      entityName = null,
      actorId = null,
      actorType = ACTOR_TYPES.USER,
      actorName = null,
      action,
      description = null,
      oldValues = null,
      newValues = null,
      changes = null,
      ipAddress = null,
      userAgent = null,
      sessionId = null,
      requestId = null,
      relatedUserId = null,
      relatedJobId = null,
      relatedApplicationId = null,
      severity = SEVERITY.INFO,
      status = STATUS.SUCCESS,
      tags = [],
      metadata = null,
    } = logData;

    // Validate required fields
    if (!eventType || !category || !action) {
      throw new Error(
        "eventType, category, and action are required for audit logging"
      );
    }

    const auditLog = await prisma.audit_logs.create({
      data: {
        eventType: eventType,
        category,
        subcategory,
        entityType: entityType,
        entityId: entityId,
        entityName: entityName,
        actorId: actorId,
        actorType: actorType,
        actorName: actorName,
        action,
        description,
        oldValues: oldValues,
        newValues: newValues,
        changes,
        ipAddress: ipAddress,
        userAgent: userAgent,
        sessionId: sessionId,
        requestId: requestId,
        relatedUserId: relatedUserId,
        relatedJobId: relatedJobId,
        relatedApplicationId: relatedApplicationId,
        severity,
        status,
        tags,
        metadata,
      },
    });

    return auditLog;
  } catch (error) {
    console.error("Failed to create audit log:", error);
    // Don't throw to avoid breaking the main application flow
    return null;
  }
}

/**
 * Helper functions for common audit log scenarios
 */

// User-related audit logs
export const auditUser = {
  login: (userId, userEmail, ipAddress, userAgent) =>
    createAuditLog({
      eventType: EVENT_TYPES.LOGIN,
      category: CATEGORIES.USER,
      actorId: userId,
      actorName: userEmail,
      action: "User logged in",
      ipAddress,
      userAgent,
      tags: ["authentication", "login"],
    }),

  logout: (userId, userEmail, ipAddress) =>
    createAuditLog({
      eventType: EVENT_TYPES.LOGOUT,
      category: CATEGORIES.USER,
      actorId: userId,
      actorName: userEmail,
      action: "User logged out",
      ipAddress,
      tags: ["authentication", "logout"],
    }),

  profileUpdate: (
    userId,
    userEmail,
    oldData,
    newData,
    changes,
    actorId = null
  ) =>
    createAuditLog({
      eventType: EVENT_TYPES.UPDATE,
      category: CATEGORIES.USER,
      subcategory: SUBCATEGORIES.PROFILE_UPDATE,
      entityType: "user",
      entityId: userId,
      entityName: userEmail,
      actorId: actorId || userId,
      actorName: userEmail,
      action:
        actorId && actorId !== userId
          ? "Admin updated user profile"
          : "User updated profile",
      oldValues: oldData,
      newValues: newData,
      changes,
      tags: ["profile", "update"],
    }),

  privilegeChange: (
    userId,
    userEmail,
    oldPrivilege,
    newPrivilege,
    actorId,
    actorName
  ) =>
    createAuditLog({
      eventType: EVENT_TYPES.UPDATE,
      category: CATEGORIES.USER,
      subcategory: SUBCATEGORIES.PRIVILEGE_CHANGE,
      entityType: "user",
      entityId: userId,
      entityName: userEmail,
      actorId,
      actorName,
      action: `User privilege changed from ${oldPrivilege} to ${newPrivilege}`,
      oldValues: { privilegeLevel: oldPrivilege },
      newValues: { privilegeLevel: newPrivilege },
      tags: ["privilege", "security", "admin"],
      severity: SEVERITY.WARNING,
    }),
};

// Application-related audit logs
export const auditApplication = {
  create: (applicationId, jobId, userId, applicantName, actorId, actorName) =>
    createAuditLog({
      eventType: EVENT_TYPES.CREATE,
      category: CATEGORIES.APPLICATION,
      entityType: "application",
      entityId: applicationId,
      entityName: `Application by ${applicantName}`,
      actorId,
      actorName,
      action: "New application submitted",
      relatedUserId: userId,
      relatedJobId: jobId,
      relatedApplicationId: applicationId,
      tags: ["application", "create"],
    }),

  statusChange: (
    applicationId,
    applicantName,
    oldStatus,
    newStatus,
    actorId,
    actorName,
    jobId = null
  ) =>
    createAuditLog({
      eventType: EVENT_TYPES.UPDATE,
      category: CATEGORIES.APPLICATION,
      subcategory: SUBCATEGORIES.STATUS_CHANGE,
      entityType: "application",
      entityId: applicationId,
      entityName: `Application by ${applicantName}`,
      actorId,
      actorName,
      action: `Application status changed from ${oldStatus} to ${newStatus}`,
      oldValues: { status: oldStatus },
      newValues: { status: newStatus },
      changes: { status: { from: oldStatus, to: newStatus } },
      relatedJobId: jobId,
      relatedApplicationId: applicationId,
      tags: ["application", "status", "update"],
      severity: newStatus === "Rejected" ? SEVERITY.WARNING : SEVERITY.INFO,
    }),

  noteUpdate: (
    applicationId,
    applicantName,
    oldNotes,
    newNotes,
    actorId,
    actorName
  ) =>
    createAuditLog({
      eventType: EVENT_TYPES.UPDATE,
      category: CATEGORIES.APPLICATION,
      subcategory: SUBCATEGORIES.NOTE_UPDATE,
      entityType: "application",
      entityId: applicationId,
      entityName: `Application by ${applicantName}`,
      actorId,
      actorName,
      action: "Application notes updated",
      oldValues: { notes: oldNotes },
      newValues: { notes: newNotes },
      relatedApplicationId: applicationId,
      tags: ["application", "notes", "update"],
    }),
};

// Job-related audit logs
export const auditJob = {
  create: (jobId, jobTitle, actorId, actorName) =>
    createAuditLog({
      eventType: EVENT_TYPES.CREATE,
      category: CATEGORIES.JOB,
      entityType: "job",
      entityId: jobId,
      entityName: jobTitle,
      actorId,
      actorName,
      action: "Job created",
      relatedJobId: jobId,
      tags: ["job", "create"],
    }),

  update: (jobId, jobTitle, oldData, newData, changes, actorId, actorName) =>
    createAuditLog({
      eventType: EVENT_TYPES.UPDATE,
      category: CATEGORIES.JOB,
      entityType: "job",
      entityId: jobId,
      entityName: jobTitle,
      actorId,
      actorName,
      action: "Job updated",
      oldValues: oldData,
      newValues: newData,
      changes,
      relatedJobId: jobId,
      tags: ["job", "update"],
    }),

  publish: (jobId, jobTitle, actorId, actorName) =>
    createAuditLog({
      eventType: EVENT_TYPES.PUBLISH,
      category: CATEGORIES.JOB,
      subcategory: SUBCATEGORIES.JOB_PUBLISH,
      entityType: "job",
      entityId: jobId,
      entityName: jobTitle,
      actorId,
      actorName,
      action: "Job published",
      relatedJobId: jobId,
      tags: ["job", "publish", "status"],
    }),

  feature: (jobId, jobTitle, featured, actorId, actorName) =>
    createAuditLog({
      eventType: featured ? EVENT_TYPES.UPDATE : EVENT_TYPES.UPDATE,
      category: CATEGORIES.JOB,
      subcategory: SUBCATEGORIES.JOB_FEATURE,
      entityType: "job",
      entityId: jobId,
      entityName: jobTitle,
      actorId,
      actorName,
      action: featured ? "Job featured" : "Job unfeatured",
      newValues: { featured },
      relatedJobId: jobId,
      tags: ["job", "feature", "promotion"],
    }),

  delete: (jobId, jobTitle, actorId, actorName) =>
    createAuditLog({
      eventType: EVENT_TYPES.DELETE,
      category: CATEGORIES.JOB,
      entityType: "job",
      entityId: jobId,
      entityName: jobTitle,
      actorId,
      actorName,
      action: "Job deleted",
      relatedJobId: jobId,
      tags: ["job", "delete"],
      severity: SEVERITY.WARNING,
    }),
};

// Email-related audit logs
export const auditEmail = {
  templateCreate: (templateId, templateName, actorId, actorName) =>
    createAuditLog({
      eventType: EVENT_TYPES.CREATE,
      category: CATEGORIES.TEMPLATE,
      subcategory: SUBCATEGORIES.TEMPLATE_CREATE,
      entityType: "email_template",
      entityId: templateId,
      entityName: templateName,
      actorId,
      actorName,
      action: "Email template created",
      tags: ["template", "email", "create"],
    }),

  templateUpdate: (
    templateId,
    templateName,
    oldData,
    newData,
    changes,
    actorId,
    actorName
  ) =>
    createAuditLog({
      eventType: EVENT_TYPES.UPDATE,
      category: CATEGORIES.TEMPLATE,
      subcategory: SUBCATEGORIES.TEMPLATE_UPDATE,
      entityType: "email_template",
      entityId: templateId,
      entityName: templateName,
      actorId,
      actorName,
      action: "Email template updated",
      oldValues: oldData,
      newValues: newData,
      changes,
      tags: ["template", "email", "update"],
    }),

  send: (
    emailId,
    recipientEmail,
    subject,
    templateId = null,
    actorId,
    actorName,
    applicationId = null,
    jobId = null
  ) =>
    createAuditLog({
      eventType: EVENT_TYPES.SEND,
      category: CATEGORIES.EMAIL,
      entityType: "email",
      entityId: emailId,
      entityName: `Email to ${recipientEmail}`,
      actorId,
      actorName,
      action: `Email sent: ${subject}`,
      metadata: {
        recipient: recipientEmail,
        subject,
        templateId,
        emailId,
      },
      relatedApplicationId: applicationId,
      relatedJobId: jobId,
      tags: ["email", "send", "communication"],
    }),

  bulkSend: (
    emailCount,
    templateId,
    templateName,
    actorId,
    actorName,
    jobId = null
  ) =>
    createAuditLog({
      eventType: EVENT_TYPES.SEND,
      category: CATEGORIES.EMAIL,
      subcategory: SUBCATEGORIES.BULK_SEND,
      entityType: "email_template",
      entityId: templateId,
      entityName: templateName,
      actorId,
      actorName,
      action: `Bulk email sent to ${emailCount} recipients`,
      metadata: {
        recipientCount: emailCount,
        templateId,
        templateName,
      },
      relatedJobId: jobId,
      tags: ["email", "bulk", "send", "campaign"],
    }),
};

// System-related audit logs
export const auditSystem = {
  settingChange: (settingKey, oldValue, newValue, actorId, actorName) =>
    createAuditLog({
      eventType: EVENT_TYPES.UPDATE,
      category: CATEGORIES.SYSTEM,
      subcategory: SUBCATEGORIES.SETTING_CHANGE,
      entityType: "setting",
      entityId: settingKey,
      entityName: settingKey,
      actorId,
      actorName,
      action: `System setting changed: ${settingKey}`,
      oldValues: { [settingKey]: oldValue },
      newValues: { [settingKey]: newValue },
      changes: { [settingKey]: { from: oldValue, to: newValue } },
      tags: ["system", "setting", "configuration"],
      severity: SEVERITY.WARNING,
    }),

  error: (
    errorType,
    errorMessage,
    entityType = null,
    entityId = null,
    actorId = null,
    metadata = null
  ) =>
    createAuditLog({
      eventType: EVENT_TYPES.ERROR,
      category: CATEGORIES.SYSTEM,
      entityType,
      entityId,
      actorId,
      actorType: ACTOR_TYPES.SYSTEM,
      action: `System error: ${errorType}`,
      description: errorMessage,
      metadata,
      tags: ["system", "error", "failure"],
      severity: SEVERITY.ERROR,
      status: STATUS.FAILURE,
    }),
};

/**
 * Utility function to extract request context for audit logging
 */
export function extractRequestContext(request) {
  const headers = request.headers;
  return {
    ipAddress:
      headers.get("x-forwarded-for") || headers.get("x-real-ip") || "unknown",
    userAgent: headers.get("user-agent") || "unknown",
    requestId: headers.get("x-request-id") || crypto.randomUUID(),
  };
}

/**
 * Middleware helper to add audit logging to API routes
 */
export function withAuditLog(handler, { eventType, category, action }) {
  return async (request, context) => {
    const startTime = Date.now();
    const { ipAddress, userAgent, requestId } = extractRequestContext(request);

    try {
      const result = await handler(request, context);

      // Log successful operation
      await createAuditLog({
        eventType,
        category,
        action: `${action} - Success`,
        actorType: ACTOR_TYPES.API,
        ipAddress,
        userAgent,
        requestId,
        metadata: {
          responseTime: Date.now() - startTime,
          method: request.method,
          url: request.url,
        },
        tags: ["api", "success"],
      });

      return result;
    } catch (error) {
      // Log failed operation
      await createAuditLog({
        eventType: EVENT_TYPES.ERROR,
        category,
        action: `${action} - Failed`,
        description: error.message,
        actorType: ACTOR_TYPES.API,
        ipAddress,
        userAgent,
        requestId,
        metadata: {
          responseTime: Date.now() - startTime,
          method: request.method,
          url: request.url,
          error: error.message,
        },
        tags: ["api", "error"],
        severity: SEVERITY.ERROR,
        status: STATUS.FAILURE,
      });

      throw error;
    }
  };
}

export default {
  createAuditLog,
  auditUser,
  auditApplication,
  auditJob,
  auditEmail,
  auditSystem,
  extractRequestContext,
  withAuditLog,
  EVENT_TYPES,
  CATEGORIES,
  SUBCATEGORIES,
  SEVERITY,
  STATUS,
  ACTOR_TYPES,
};
