import { appPrisma } from "./prisma";
import { createAuditLog } from "./auditLog";

/**
 * Email automation engine for triggering automated emails based on application events
 */

// Define supported trigger events
export const TRIGGER_EVENTS = {
  STATUS_CHANGE: "status_change",
  APPLICATION_CREATED: "application_created",
  INTERVIEW_SCHEDULED: "interview_scheduled",
  OFFER_EXTENDED: "offer_extended",
};

// Define supported status change conditions
export const STATUS_CONDITIONS = {
  FROM_ANY_TO: "from_any_to",
  FROM_TO: "from_to",
  TO_STATUS: "to_status",
  FROM_STATUS: "from_status",
};

/**
 * Process automation triggers for an application event
 * @param {string} eventType - The type of event (e.g., 'status_change')
 * @param {Object} data - Event data
 * @param {Object} context - Additional context (user, session, etc.)
 */
export async function processAutomationTriggers(eventType, data, context = {}) {
  try {
    console.log(
      `🤖 Processing automation triggers for event: ${eventType}`,
      data
    );

    // Get all active automation rules for this trigger event
    const rules = await appPrisma.email_automation_rules.findMany({
      where: {
        trigger: eventType,
        is_active: true,
      },
      orderBy: { created_at: "asc" },
    });

    if (rules.length === 0) {
      console.log("📭 No active automation rules found for this trigger");
      return { processed: 0, triggered: 0 };
    }

    console.log(
      `📋 Found ${rules.length} active automation rule(s) to evaluate`
    );

    let triggeredCount = 0;

    // Process each rule
    for (const rule of rules) {
      try {
        const conditions = rule.conditions ? JSON.parse(rule.conditions) : {};

        // Check if conditions match the event data
        if (await evaluateConditions(eventType, conditions, data)) {
          console.log(
            `✅ Rule "${rule.name}" conditions matched, triggering email`
          );

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
          eventType: "AUTOMATION_ERROR",
          category: "EMAIL_AUTOMATION",
          action: `Failed to process automation rule: ${rule.name}`,
          entityType: "automation_rule",
          entityId: rule.id,
          entityName: rule.name,
          actorId: context.userId,
          actorType: "system",
          actorName: "Automation Engine",
          description: `Error: ${ruleError.message}`,
          relatedApplicationId: data.applicationId,
          severity: "error",
          status: "failed",
          tags: ["automation", "email", "error"],
        });
      }
    }

    console.log(
      `🎯 Automation processing complete: ${triggeredCount}/${rules.length} rules triggered`
    );

    return {
      processed: rules.length,
      triggered: triggeredCount,
    };
  } catch (error) {
    console.error("Error in automation processing:", error);
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
    return (
      conditions.fromStatus === fromStatus && conditions.toStatus === toStatus
    );
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
    console.log(
      `📧 Triggering email automation for rule: ${rule.name} (${rule.recipient_type || "applicant"} recipient)`
    );

    // Get the email template
    const template = await appPrisma.email_templates.findUnique({
      where: { id: rule.template_id },
    });

    if (!template) {
      throw new Error(`Email template ${rule.template_id} not found`);
    }

    // Get application details for email context
    const application = await appPrisma.applications.findUnique({
      where: { id: eventData.applicationId },
      include: {
        jobs: {
          select: {
            id: true,
            title: true,
            department: true,
            description: true,
          },
        },
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!application) {
      throw new Error(`Application ${eventData.applicationId} not found`);
    }

    // Determine recipient based on rule type
    const recipientType = rule.recipient_type || "applicant";
    let recipientEmail;
    let recipientName;

    if (recipientType === "internal") {
      // Send to admin/HR team
      const { getSystemSetting } = await import("./settings");
      recipientEmail = await getSystemSetting(
        "notification_email",
        "admin@example.com"
      );
      recipientName = "HR Team";
    } else {
      // Send to applicant (default behavior)
      recipientEmail = application.email || application.users?.email;
      recipientName =
        application.name ||
        (application.users
          ? `${application.users.firstName} ${application.users.lastName}`.trim()
          : "Applicant");

      if (!recipientEmail) {
        throw new Error("No email address found for applicant");
      }
    }

    // Prepare email context with all available variables
    const emailContext = {
      // Applicant info
      applicantName:
        application.name ||
        (application.users
          ? `${application.users.firstName} ${application.users.lastName}`.trim()
          : "Applicant"),
      applicantEmail: application.email || application.users?.email,
      recipientName: recipientName,
      candidateName:
        application.name ||
        (application.users
          ? `${application.users.firstName} ${application.users.lastName}`.trim()
          : "Applicant"),
      recipientEmail: application.email || application.users?.email,

      // Job info (matching your template variables)
      jobTitle: application.jobs?.title || "Position",
      department: application.jobs?.department || "",
      jobDepartment: application.jobs?.department || "",
      startDate: application.jobs?.startDate
        ? new Date(application.jobs.startDate).toLocaleDateString()
        : "",
      salary:
        application.jobs?.salaryMin && application.jobs?.salaryMax
          ? `$${application.jobs.salaryMin.toLocaleString()} - $${application.jobs.salaryMax.toLocaleString()}`
          : application.jobs?.salaryMin
            ? `$${application.jobs.salaryMin.toLocaleString()}`
            : "",
      benefits: application.jobs?.benefits || "",
      companyName: "Your Company", // Update this to your actual company name

      // Sender info
      senderName: context.userName || "HR Team",

      // Deadlines
      deadline: application.jobs?.applicationDeadline
        ? new Date(application.jobs.applicationDeadline).toLocaleDateString()
        : "",

      // Status info
      status: eventData.toStatus,
      previousStatus: eventData.fromStatus,

      // IDs and links
      applicationId: application.id,
      applicationLink: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/admin/applications/${application.id}`,
      portalLink: process.env.NEXTAUTH_URL || "http://localhost:3000",

      // Application-related variables (from Communications)
      reviewTimeframe: "1-2 weeks",
      timeframe: "1-2 weeks",
      currentStage: "review phase",
      expectedDate: new Date(
        Date.now() + 14 * 24 * 60 * 60 * 1000
      ).toLocaleDateString(),
      nextSteps:
        "• Initial review by hiring team\n• Technical assessment (if applicable)\n• Interview scheduling",
      timeline:
        "• Application review: 3-5 business days\n• Initial interview: 1-2 weeks\n• Final decision: 2-3 weeks",

      // Interview-related variables
      interviewDate: "TBD",
      interviewTime: "TBD",
      duration: "45-60 minutes",
      interviewFormat: "Video call via Zoom",
      interviewLocation: "Virtual",
      interviewDetails:
        "The interview will include a technical discussion and cultural fit assessment",
      interviewExpectations:
        "• Brief introduction and background discussion\n• Technical questions related to the role\n• Questions about your experience and projects\n• Opportunity for you to ask questions",
      originalDate: "TBD",
      originalTime: "TBD",
      option1: "Option 1: TBD",
      option2: "Option 2: TBD",
      option3: "Option 3: TBD",

      // Onboarding variables
      officeAddress: "123 Business St, City, State 12345",
      startTime: "9:00 AM",
      supervisor: "Team Lead",
      supervisorEmail: "supervisor@company.com",
      parkingInfo: "Visitor parking available in front lot",
      missingDocuments:
        "• ID verification\n• Tax forms\n• Emergency contact information",
      hrEmail: "hr@company.com",

      // General variables
      retentionPeriod: "6 months",
      requestedInfo: "Portfolio links, references, or additional documents",
      referenceName: "Reference",
      phoneNumber: "(555) 123-4567",
      email: "hiring@company.com",
    };

    // Import email function dynamically to avoid circular imports
    const { sendEmailWithTemplate } = await import("./email");

    // Send the actual email
    try {
      const emailResult = await sendEmailWithTemplate(
        recipientEmail,
        template,
        emailContext
      );

      if (emailResult.success) {
        console.log(
          `✅ Email sent successfully: ${template.name} to ${recipientEmail} (${recipientType})`
        );

        // Log successful email automation
        await createAuditLog({
          eventType:
            recipientType === "internal"
              ? "INTERNAL_EMAIL_AUTOMATION"
              : "APPLICANT_EMAIL_AUTOMATION",
          category: "EMAIL_AUTOMATION",
          subcategory: recipientType,
          action: `Automated ${recipientType} email sent: ${template.name}`,
          entityType: "application",
          entityId: application.id,
          entityName: `Application by ${application.name || application.email || "Unknown"}`,
          actorId: context.userId || "system",
          actorType: "automation",
          actorName: `Automation Rule: ${rule.name} (${recipientType})`,
          description: `Email template "${template.name}" sent automatically to ${recipientType} (${recipientEmail}) due to ${eventData.fromStatus} → ${eventData.toStatus} status change`,
          relatedApplicationId: application.id,
          relatedJobId: application.jobs?.id,
          severity: "info",
          status: "success",
          tags: [
            "automation",
            "email",
            "status-change",
            recipientType,
            template.category || "general",
          ],
          metadata: {
            ruleId: rule.id,
            ruleName: rule.name,
            templateId: template.id,
            templateName: template.name,
            templateCategory: template.category,
            messageId: emailResult.messageId,
            recipientType: recipientType,
            recipientEmail: recipientEmail,
            recipientName: recipientName,
            statusChange: {
              from: eventData.fromStatus,
              to: eventData.toStatus,
            },
            trigger: rule.trigger,
            conditions: rule.conditions,
          },
        });
      } else {
        throw new Error("Email sending failed");
      }
    } catch (emailError) {
      console.error(`❌ Failed to send email: ${emailError.message}`);

      // Log failed email automation
      await createAuditLog({
        eventType:
          recipientType === "internal"
            ? "INTERNAL_EMAIL_AUTOMATION_FAILED"
            : "APPLICANT_EMAIL_AUTOMATION_FAILED",
        category: "EMAIL_AUTOMATION",
        subcategory: recipientType,
        action: `Automated ${recipientType} email failed: ${template.name}`,
        entityType: "application",
        entityId: application.id,
        entityName: `Application by ${application.name || application.email || "Unknown"}`,
        actorId: context.userId || "system",
        actorType: "automation",
        actorName: `Automation Rule: ${rule.name} (${recipientType})`,
        description: `Email template "${template.name}" failed to send automatically to ${recipientType} (${recipientEmail}) due to ${eventData.fromStatus} → ${eventData.toStatus} status change. Error: ${emailError.message}`,
        relatedApplicationId: application.id,
        relatedJobId: application.jobs?.id,
        severity: "error",
        status: "failed",
        tags: [
          "automation",
          "email",
          "status-change",
          "error",
          recipientType,
          template.category || "general",
        ],
        metadata: {
          ruleId: rule.id,
          ruleName: rule.name,
          templateId: template.id,
          templateName: template.name,
          templateCategory: template.category,
          recipientType: recipientType,
          recipientEmail: recipientEmail,
          recipientName: recipientName,
          error: emailError.message,
          errorStack: emailError.stack,
          statusChange: {
            from: eventData.fromStatus,
            to: eventData.toStatus,
          },
          trigger: rule.trigger,
          conditions: rule.conditions,
        },
      });

      throw emailError;
    }

    return {
      success: true,
      templateId: template.id,
      templateName: template.name,
      recipient: recipientEmail,
      recipientType: recipientType,
    };
  } catch (error) {
    console.error("Error triggering email automation:", error);
    throw error;
  }
}

/**
 * Helper function to trigger status change automation
 */
export async function triggerStatusChangeAutomation(
  applicationId,
  fromStatus,
  toStatus,
  context = {}
) {
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
export async function triggerApplicationCreatedAutomation(
  applicationId,
  context = {}
) {
  return await processAutomationTriggers(
    TRIGGER_EVENTS.APPLICATION_CREATED,
    {
      applicationId,
    },
    context
  );
}
