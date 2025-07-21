import { appPrisma } from "./prisma";
import { createAuditLog } from "./auditLog";

/**
 * Email automation engine for triggering automated emails based on application events
 */

// Define supported trigger events
export const TRIGGER_EVENTS = {
  STATUS_CHANGE: 'status_change',
  APPLICATION_CREATED: 'application_created',
  INTERVIEW_SCHEDULED: 'interview_scheduled',
  OFFER_EXTENDED: 'offer_extended',
};

// Define supported status change conditions
export const STATUS_CONDITIONS = {
  FROM_ANY_TO: 'from_any_to',
  FROM_TO: 'from_to',
  TO_STATUS: 'to_status',
  FROM_STATUS: 'from_status',
};

/**
 * Process automation triggers for an application event
 * @param {string} eventType - The type of event (e.g., 'status_change')
 * @param {Object} data - Event data
 * @param {Object} context - Additional context (user, session, etc.)
 */
export async function processAutomationTriggers(eventType, data, context = {}) {
  try {
    console.log(`🤖 Processing automation triggers for event: ${eventType}`, data);

    // Get all active automation rules for this trigger event
    const rules = await appPrisma.emailAutomationRule.findMany({
      where: {
        trigger: eventType,
        is_active: true,
      },
      orderBy: { created_at: 'asc' },
    });

    if (rules.length === 0) {
      console.log('📭 No active automation rules found for this trigger');
      return { processed: 0, triggered: 0 };
    }

    console.log(`📋 Found ${rules.length} active automation rule(s) to evaluate`);

    let triggeredCount = 0;

    // Process each rule
    for (const rule of rules) {
      try {
        const conditions = rule.conditions ? JSON.parse(rule.conditions) : {};
        
        // Check if conditions match the event data
        if (await evaluateConditions(eventType, conditions, data)) {
          console.log(`✅ Rule "${rule.name}" conditions matched, triggering email`);
          
          // Trigger the email automation
          await triggerEmailAutomation(rule, data, context);
          triggeredCount++;
        } else {
          console.log(`❌ Rule "${rule.name}" conditions not matched`);
        }
      } catch (ruleError) {
        console.error(`Error processing rule ${rule.id}:`, ruleError);
        
        // Log the automation failure
        await createAuditLog({
          eventType: 'AUTOMATION_ERROR',
          category: 'EMAIL_AUTOMATION',
          action: `Failed to process automation rule: ${rule.name}`,
          entityType: 'automation_rule',
          entityId: rule.id,
          entityName: rule.name,
          actorId: context.userId,
          actorType: 'system',
          actorName: 'Automation Engine',
          description: `Error: ${ruleError.message}`,
          relatedApplicationId: data.applicationId,
          severity: 'error',
          status: 'failed',
          tags: ['automation', 'email', 'error'],
        });
      }
    }

    console.log(`🎯 Automation processing complete: ${triggeredCount}/${rules.length} rules triggered`);

    return {
      processed: rules.length,
      triggered: triggeredCount,
    };

  } catch (error) {
    console.error('Error in automation processing:', error);
    throw error;
  }
}

/**
 * Evaluate if rule conditions match the event data
 * @param {string} eventType - The trigger event type
 * @param {Object} conditions - Rule conditions
 * @param {Object} data - Event data
 */
async function evaluateConditions(eventType, conditions, data) {
  if (eventType === TRIGGER_EVENTS.STATUS_CHANGE) {
    return evaluateStatusChangeConditions(conditions, data);
  }
  
  if (eventType === TRIGGER_EVENTS.APPLICATION_CREATED) {
    return evaluateApplicationCreatedConditions(conditions, data);
  }

  // Default: no conditions means always trigger
  return Object.keys(conditions).length === 0;
}

/**
 * Evaluate status change specific conditions
 */
function evaluateStatusChangeConditions(conditions, data) {
  const { fromStatus, toStatus } = data;

  // If no conditions specified, trigger for any status change
  if (!conditions || Object.keys(conditions).length === 0) {
    return true;
  }

  // Check condition type
  if (conditions.type === STATUS_CONDITIONS.TO_STATUS) {
    return conditions.toStatus === toStatus;
  }

  if (conditions.type === STATUS_CONDITIONS.FROM_STATUS) {
    return conditions.fromStatus === fromStatus;
  }

  if (conditions.type === STATUS_CONDITIONS.FROM_TO) {
    return conditions.fromStatus === fromStatus && conditions.toStatus === toStatus;
  }

  if (conditions.type === STATUS_CONDITIONS.FROM_ANY_TO) {
    return conditions.toStatus === toStatus;
  }

  // Check for simple status matches
  if (conditions.toStatus && conditions.toStatus !== toStatus) {
    return false;
  }

  if (conditions.fromStatus && conditions.fromStatus !== fromStatus) {
    return false;
  }

  return true;
}

/**
 * Evaluate application created conditions
 */
function evaluateApplicationCreatedConditions(conditions, data) {
  // Can add job-specific or other conditions here
  return true;
}

/**
 * Trigger the actual email automation
 */
async function triggerEmailAutomation(rule, eventData, context) {
  try {
    console.log(`📧 Triggering email automation for rule: ${rule.name}`);

    // Get the email template
    const template = await appPrisma.emailTemplate.findUnique({
      where: { id: rule.template_id },
    });

    if (!template) {
      throw new Error(`Email template ${rule.template_id} not found`);
    }

    // Get application details for email context
    const application = await appPrisma.application.findUnique({
      where: { id: eventData.applicationId },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            department: true,
            description: true,
          },
        },
      },
    });

    if (!application) {
      throw new Error(`Application ${eventData.applicationId} not found`);
    }

    // For now, we'll log the email that would be sent
    // Later this can integrate with the actual email sending system
    console.log(`📧 Would send email:`, {
      to: application.email,
      template: template.name,
      subject: template.subject,
      applicationId: application.id,
      jobTitle: application.job?.title,
      applicantName: application.name || 'Applicant',
    });

    // Log the automation action
    await createAuditLog({
      eventType: 'EMAIL_AUTOMATION',
      category: 'EMAIL_AUTOMATION',
      action: `Automated email triggered: ${template.name}`,
      entityType: 'application',
      entityId: application.id,
      entityName: `Application by ${application.name || application.email}`,
      actorId: context.userId || 'system',
      actorType: 'automation',
      actorName: `Automation Rule: ${rule.name}`,
      description: `Email template "${template.name}" sent automatically due to ${eventData.fromStatus} → ${eventData.toStatus} status change`,
      relatedApplicationId: application.id,
      relatedJobId: application.job?.id,
      severity: 'info',
      status: 'success',
      tags: ['automation', 'email', 'status-change'],
      metadata: {
        ruleId: rule.id,
        ruleName: rule.name,
        templateId: template.id,
        templateName: template.name,
        statusChange: {
          from: eventData.fromStatus,
          to: eventData.toStatus,
        },
      },
    });

    // TODO: Integrate with actual email sending system
    // await sendEmailWithTemplate(application.email, template, applicationContext);

    return {
      success: true,
      templateId: template.id,
      templateName: template.name,
      recipient: application.email,
    };

  } catch (error) {
    console.error('Error triggering email automation:', error);
    throw error;
  }
}

/**
 * Helper function to trigger status change automation
 */
export async function triggerStatusChangeAutomation(applicationId, fromStatus, toStatus, context = {}) {
  return await processAutomationTriggers(
    TRIGGER_EVENTS.STATUS_CHANGE,
    {
      applicationId,
      fromStatus,
      toStatus,
    },
    context
  );
}

/**
 * Helper function to trigger application created automation
 */
export async function triggerApplicationCreatedAutomation(applicationId, context = {}) {
  return await processAutomationTriggers(
    TRIGGER_EVENTS.APPLICATION_CREATED,
    {
      applicationId,
    },
    context
  );
}