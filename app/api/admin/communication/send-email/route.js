import { NextResponse } from "next/server";
import { emailService } from "@/app/lib/email";
import { PrismaClient } from "@/app/generated/prisma";
import { logAuditEvent } from "../../../../../lib/auditMiddleware";
import { extractRequestContext } from "../../../../lib/auditLog";

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const { recipients, subject, content, templateId, sentBy } =
      await request.json();
    const requestContext = extractRequestContext(request);

    if (!recipients || recipients.length === 0) {
      return NextResponse.json(
        { error: "No recipients provided" },
        { status: 400 }
      );
    }

    if (!subject || !content) {
      return NextResponse.json(
        { error: "Subject and content are required" },
        { status: 400 }
      );
    }

    // Generate a placeholder UUID if sentBy is not provided or invalid
    const validSentBy =
      sentBy &&
      sentBy.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      )
        ? sentBy
        : "00000000-0000-0000-0000-000000000000"; // Placeholder UUID for system-sent emails

    const results = [];

    // Send emails to all recipients
    for (const recipient of recipients) {
      try {
        // Replace variables in subject and content for this specific recipient
        const processedSubject = replaceVariables(subject, recipient);
        const processedContent = replaceVariables(content, recipient);

        // Send the email
        const emailResult = await emailService.sendEmail({
          to: recipient.email,
          subject: processedSubject,
          html: processedContent.replace(/\n/g, "<br>"),
          text: processedContent,
        });

        if (emailResult.success) {
          // Save email record to database
          const emailRecord = await prisma.email.create({
            data: {
              subject: processedSubject,
              content: processedContent,
              html_content: processedContent.replace(/\n/g, "<br>"),
              recipient_email: recipient.email,
              recipient_name: recipient.name,
              application_id: recipient.applicationId || null,
              job_id: recipient.jobId || null,
              template_id: templateId || null,
              email_provider: emailResult.provider,
              message_id: emailResult.data?.id || emailResult.data?.messageId,
              status: "sent",
              sent_by: validSentBy,
              sent_at: new Date(),
            },
          });

          // Update template usage count if template was used
          if (templateId) {
            await prisma.email_templates.update({
              where: { id: templateId },
              data: {
                usage_count: { increment: 1 },
                last_used_at: new Date(),
              },
            });
          }

          results.push({
            recipient: recipient.email,
            success: true,
            emailId: emailRecord.id,
            messageId: emailResult.data?.id || emailResult.data?.messageId,
          });
        } else {
          // Save failed email record
          const emailRecord = await prisma.email.create({
            data: {
              subject: processedSubject,
              content: processedContent,
              html_content: processedContent.replace(/\n/g, "<br>"),
              recipient_email: recipient.email,
              recipient_name: recipient.name,
              application_id: recipient.applicationId || null,
              job_id: recipient.jobId || null,
              template_id: templateId || null,
              status: "failed",
              failure_reason: emailResult.error,
              sent_by: validSentBy,
              sent_at: new Date(),
            },
          });

          results.push({
            recipient: recipient.email,
            success: false,
            error: emailResult.error,
            emailId: emailRecord.id,
          });
        }
      } catch (error) {
        console.error(`Error sending email to ${recipient.email}:`, error);
        results.push({
          recipient: recipient.email,
          success: false,
          error: error.message,
        });
      }
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    // Log bulk email sending
    await logAuditEvent(
      {
        eventType: "SEND",
        category: "EMAIL",
        subcategory: recipients.length > 1 ? "BULK_SEND" : null,
        entityType: "email_campaign",
        action:
          recipients.length > 1
            ? `Bulk email sent to ${recipients.length} recipients`
            : "Email sent",
        description: `Email campaign: "${subject}" sent to ${recipients.length} recipients (${successful} successful, ${failed} failed)`,
        actorId:
          validSentBy !== "00000000-0000-0000-0000-000000000000"
            ? validSentBy
            : null,
        actorType:
          validSentBy !== "00000000-0000-0000-0000-000000000000"
            ? "user"
            : "system",
        severity: failed > 0 ? "warning" : "info",
        status:
          failed === 0 ? "success" : successful > 0 ? "partial" : "failure",
        tags: [
          "email",
          recipients.length > 1 ? "bulk" : "single",
          "communication",
          "admin_action",
        ],
        metadata: {
          subject,
          recipientCount: recipients.length,
          successfulSends: successful,
          failedSends: failed,
          templateId,
          recipients: recipients.map((r) => ({ email: r.email, name: r.name })),
        },
        ...requestContext,
      },
      request
    );

    return NextResponse.json({
      success: true,
      message: `Sent ${successful} emails successfully, ${failed} failed`,
      results,
      summary: {
        total: recipients.length,
        successful,
        failed,
      },
    });
  } catch (error) {
    console.error("Error in send-email API:", error);

    // Log the error
    await logAuditEvent(
      {
        eventType: "ERROR",
        category: "EMAIL",
        entityType: "email_campaign",
        action: "Failed to send email campaign",
        description: `Email sending failed: ${error.message}`,
        actorId:
          validSentBy !== "00000000-0000-0000-0000-000000000000"
            ? validSentBy
            : null,
        actorType:
          validSentBy !== "00000000-0000-0000-0000-000000000000"
            ? "user"
            : "system",
        severity: "error",
        status: "failure",
        tags: ["email", "error", "communication"],
        metadata: {
          errorMessage: error.message,
          attempted: { subject, recipientCount: recipients?.length },
        },
      },
      request
    );

    return NextResponse.json(
      { error: "Failed to send emails", details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to replace template variables
function replaceVariables(content, recipient) {
  if (!content || !recipient) return content;

  // Basic variables
  const variables = {
    candidateName: recipient.name || "Candidate",
    jobTitle: recipient.jobTitle || "Position",
    companyName: "Your Company", // Can be made configurable
    department: recipient.department || "Department",
    senderName: "Hiring Manager", // Can be made configurable
    recipientEmail: recipient.email,

    // Application-related variables
    reviewTimeframe: "1-2 weeks",
    timeframe: "1-2 weeks",
    currentStage: "review phase",
    expectedDate: new Date(
      Date.now() + 14 * 24 * 60 * 60 * 1000
    ).toLocaleDateString(), // 2 weeks from now
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
    startDate: "TBD",
    officeAddress: "123 Business St, City, State 12345",
    startTime: "9:00 AM",
    supervisor: "Team Lead",
    supervisorEmail: "supervisor@company.com",
    parkingInfo: "Visitor parking available in front lot",
    missingDocuments:
      "• ID verification\n• Tax forms\n• Emergency contact information",
    hrEmail: "hr@company.com",
    portalLink: "https://portal.company.com/onboarding",
    deadline: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ).toLocaleDateString(), // 1 week from now

    // Offer-related variables
    salary: "Competitive salary based on experience",
    benefits: "Health insurance, 401k, paid time off",

    // General variables
    retentionPeriod: "6 months",
    requestedInfo: "Portfolio links, references, or additional documents",

    // Reference check variables
    referenceName: "Reference",
    phoneNumber: "(555) 123-4567",
    email: "hiring@company.com",
  };

  let processedContent = content;
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, "g");
    processedContent = processedContent.replace(regex, value);
  });

  return processedContent;
}
