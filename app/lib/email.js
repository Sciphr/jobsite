// app/lib/email.js
import { Resend } from "resend";
import nodemailer from "nodemailer";
import { getSystemSetting, getSystemSettings } from "./settings";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Email service abstraction layer
 * This makes it easy to switch email providers later
 */
class EmailService {
  constructor() {
    this.provider = null; // Will be determined dynamically
    this.smtpTransporter = null;
    this.lastInitialized = null; // Track when last initialized
  }

  /**
   * Force re-initialization (useful when settings change)
   */
  forceReinitialize() {
    this.provider = null;
    this.smtpTransporter = null;
    this.lastInitialized = null;
    console.log("🔄 Email service forced to reinitialize");
  }

  /**
   * Determine which email provider to use and initialize if needed
   */
  async initializeProvider() {
    try {
      // Check if custom SMTP is enabled and configured
      const smtpEnabled = await getSystemSetting("smtp_enabled", false);

      if (smtpEnabled) {
        const smtpSettings = await getSystemSettings([
          "smtp_host",
          "smtp_port",
          "smtp_username",
          "smtp_password",
          "smtp_secure",
          "smtp_from_email",
          "smtp_from_name",
        ]);

        // Validate SMTP configuration
        if (smtpSettings.smtp_host && smtpSettings.smtp_from_email) {
          this.provider = "smtp";
          await this.initializeSMTP(smtpSettings);
          console.log("📧 Using custom SMTP server:", smtpSettings.smtp_host);
          return;
        } else {
          console.warn(
            "⚠️ SMTP enabled but incomplete configuration, falling back to Resend"
          );
        }
      }

      // Fall back to Resend
      this.provider = "resend";
      console.log("📧 Using Resend email service");
    } catch (error) {
      console.error("❌ Error initializing email provider:", error);
      // Fall back to Resend on any error
      this.provider = "resend";
    }
  }

  /**
   * Initialize SMTP transporter
   */
  async initializeSMTP(settings) {
    try {
      this.smtpTransporter = nodemailer.createTransport({
        host: settings.smtp_host,
        port: parseInt(settings.smtp_port) || 587,
        secure: settings.smtp_secure, // true for 465, false for other ports
        auth: settings.smtp_username
          ? {
              user: settings.smtp_username,
              pass: settings.smtp_password,
            }
          : undefined,
        // Additional options for better compatibility
        tls: {
          rejectUnauthorized: false, // Allow self-signed certificates
        },
      });

      // Test the connection
      await this.smtpTransporter.verify();
      console.log("✅ SMTP connection verified successfully");
    } catch (error) {
      console.error("❌ SMTP connection failed:", error);
      throw new Error(`SMTP configuration error: ${error.message}`);
    }
  }

  /**
   * Send a single email
   */
  async sendEmail({ to, subject, html, text, from }) {
    try {
      // Initialize provider if not already done
      if (!this.provider) {
        await this.initializeProvider();
      }

      // Get default "from" address based on provider
      let fromAddress = from;
      if (!fromAddress) {
        if (this.provider === "smtp") {
          const smtpFromEmail = await getSystemSetting("smtp_from_email", "");
          const smtpFromName = await getSystemSetting(
            "smtp_from_name",
            "Job Site"
          );
          fromAddress = smtpFromName
            ? `${smtpFromName} <${smtpFromEmail}>`
            : smtpFromEmail;
        } else {
          const defaultFromEmail = await getSystemSetting(
            "notification_email",
            "onboarding@resend.dev"
          );
          const siteName = await getSystemSetting("site_name", "Job Site");
          fromAddress = `${siteName} <${defaultFromEmail}>`;
        }
      }

      console.log(`📧 Sending email via ${this.provider}:`, {
        to,
        subject,
        from: fromAddress,
        hasHtml: !!html,
        hasText: !!text,
      });

      let result;

      switch (this.provider) {
        case "smtp":
          result = await this.sendWithSMTP({
            to,
            subject,
            html,
            text,
            from: fromAddress,
          });
          break;

        case "resend":
          result = await this.sendWithResend({
            to,
            subject,
            html,
            text,
            from: fromAddress,
          });
          break;

        default:
          throw new Error(`Unsupported email provider: ${this.provider}`);
      }

      console.log("✅ Email sent successfully:", {
        provider: this.provider,
        messageId: result.id || result.messageId,
      });
      return { success: true, data: result, provider: this.provider };
    } catch (error) {
      console.error("❌ Email send failed:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get Resend "from" address for fallback
   */
  async getResendFromAddress() {
    const defaultFromEmail = await getSystemSetting(
      "notification_email",
      "onboarding@resend.dev"
    );
    const siteName = await getSystemSetting("site_name", "Job Site");
    return `${siteName} <${defaultFromEmail}>`;
  }

  /**
   * Send email using custom SMTP
   */
  async sendWithSMTP({ to, subject, html, text, from }) {
    if (!this.smtpTransporter) {
      throw new Error("SMTP transporter not initialized");
    }

    const mailOptions = {
      from,
      to: Array.isArray(to) ? to.join(", ") : to,
      subject,
      ...(html && { html }),
      ...(text && { text }),
    };

    const info = await this.smtpTransporter.sendMail(mailOptions);
    return info;
  }

  /**
   * Send email using Resend
   */
  async sendWithResend({ to, subject, html, text, from }) {
    const emailData = {
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      ...(html && { html }),
      ...(text && { text }),
    };

    const { data, error } = await resend.emails.send(emailData);

    if (error) {
      throw new Error(`Resend error: ${error.message}`);
    }

    return data;
  }

  /**
   * Test email configuration
   */
  async testEmailConfiguration() {
    try {
      await this.initializeProvider();

      const testResult = {
        provider: this.provider,
        timestamp: new Date().toISOString(),
        configuration: {},
      };

      if (this.provider === "smtp") {
        const smtpSettings = await getSystemSettings([
          "smtp_host",
          "smtp_port",
          "smtp_username",
          "smtp_from_email",
        ]);
        testResult.configuration = {
          host: smtpSettings.smtp_host,
          port: smtpSettings.smtp_port,
          username: smtpSettings.smtp_username,
          fromEmail: smtpSettings.smtp_from_email,
        };

        // Test SMTP connection
        if (this.smtpTransporter) {
          await this.smtpTransporter.verify();
          testResult.connectionTest = "SUCCESS";
        }
      } else {
        testResult.configuration = {
          service: "Resend",
          fromEmail: await getSystemSetting(
            "notification_email",
            "onboarding@resend.dev"
          ),
        };
        testResult.connectionTest = "SUCCESS (using Resend)";
      }

      return { success: true, data: testResult };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        provider: this.provider,
      };
    }
  }

  /**
   * Send notification to admin(s)
   */
  async sendAdminNotification({ subject, html, text, type = "general" }) {
    try {
      // Get admin notification email from settings
      const adminEmail = await getSystemSetting(
        "notification_email",
        "admin@example.com"
      );
      const emergencyEmail = await getSystemSetting(
        "emergency_notification_email",
        adminEmail
      );

      // Use emergency email for critical notifications
      const targetEmail = type === "emergency" ? emergencyEmail : adminEmail;

      return await this.sendEmail({
        to: targetEmail,
        subject,
        html,
        text,
      });
    } catch (error) {
      console.error("Failed to send admin notification:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send email to job applicant
   */
  async sendApplicationConfirmation({
    applicantEmail,
    applicantName,
    jobTitle,
    companyName,
  }) {
    const subject = `Application Received: ${jobTitle}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Thank you for your application!</h2>
        <p>Hi ${applicantName || "there"},</p>
        <p>We've received your application for the <strong>${jobTitle}</strong> position${companyName ? ` at ${companyName}` : ""}.</p>
        <p>Our team will review your application and get back to you soon.</p>
        <p>Thank you for your interest!</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    `;

    const text = `
Thank you for your application!

Hi ${applicantName || "there"},

We've received your application for the ${jobTitle} position${companyName ? ` at ${companyName}` : ""}.

Our team will review your application and get back to you soon.

Thank you for your interest!
    `;

    return await this.sendEmail({
      to: applicantEmail,
      subject,
      html,
      text,
    });
  }

  /**
   * Send new application notification to admin
   */
  async sendNewApplicationNotification({
    jobTitle,
    applicantName,
    applicantEmail,
    applicationId,
  }) {
    const subject = `New Application: ${jobTitle}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Job Application Received</h2>
        <p><strong>Position:</strong> ${jobTitle}</p>
        <p><strong>Applicant:</strong> ${applicantName || "Guest Applicant"}</p>
        <p><strong>Email:</strong> ${applicantEmail}</p>
        <p><strong>Application ID:</strong> ${applicationId}</p>
        <p>
          <a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/admin/applications/${applicationId}" 
             style="background: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            View Application
          </a>
        </p>
      </div>
    `;

    const text = `
New Job Application Received

Position: ${jobTitle}
Applicant: ${applicantName || "Guest Applicant"}
Email: ${applicantEmail}
Application ID: ${applicationId}

View application: ${process.env.NEXTAUTH_URL || "http://localhost:3000"}/admin/applications/${applicationId}
    `;

    return await this.sendAdminNotification({
      subject,
      html,
      text,
      type: "general",
    });
  }

  /**
   * Send job published notification to admin
   */
  async sendJobPublishedNotification({ jobTitle, jobId, creatorName }) {
    const subject = `Job Published: ${jobTitle}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Job Published</h2>
        <p><strong>Job Title:</strong> ${jobTitle}</p>
        <p><strong>Published by:</strong> ${creatorName || "Unknown"}</p>
        <p>
          <a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/admin/jobs/${jobId}" 
             style="background: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            View Job
          </a>
        </p>
      </div>
    `;

    return await this.sendAdminNotification({
      subject,
      html,
      text: `Job Published: ${jobTitle}\nPublished by: ${creatorName || "Unknown"}\nView job: ${process.env.NEXTAUTH_URL || "http://localhost:3000"}/admin/jobs/${jobId}`,
    });
  }

  /**
   * Test email functionality
   */
  async sendTestEmail(toEmail) {
    return await this.sendEmail({
      to: toEmail,
      subject: "Test Email from Job Site",
      html: "<h1>Test Email</h1><p>If you receive this, email is working!</p>",
      text: "Test Email\n\nIf you receive this, email is working!",
    });
  }

  /**
   * Send job invitation to a candidate
   */
  async sendJobInvitation({
    candidateEmail,
    candidateName,
    jobTitle,
    jobSlug,
    invitationToken,
    customMessage,
    invitedByName,
    companyName,
    expiresAt,
  }) {
    const subject = `You're invited to apply: ${jobTitle}`;

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const invitationUrl = `${baseUrl}/jobs/${jobSlug}?invitation=${invitationToken}`;
    const expirationDate = new Date(expiresAt).toLocaleDateString();

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">You've Been Invited!</h1>
        </div>

        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
            Hi ${candidateName || "there"},
          </p>

          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
            ${invitedByName} from ${companyName || "our team"} thinks you'd be a great fit for our <strong>${jobTitle}</strong> position.
          </p>

          ${customMessage ? `
            <div style="background: #f3f4f6; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #4b5563; font-style: italic;">
                "${customMessage}"
              </p>
            </div>
          ` : ''}

          <p style="font-size: 16px; color: #374151; margin-bottom: 25px;">
            We'd love for you to review the opportunity and apply if you're interested.
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${invitationUrl}"
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
              View Job & Apply
            </a>
          </div>

          <div style="background: #fef3c7; border: 1px solid #fcd34d; padding: 15px; border-radius: 6px; margin-top: 25px;">
            <p style="margin: 0; font-size: 14px; color: #92400e;">
              <strong>⏰ This invitation expires on ${expirationDate}</strong>
            </p>
          </div>

          <p style="font-size: 14px; color: #6b7280; margin-top: 25px;">
            If you have any questions, feel free to reach out to us.
          </p>

          <p style="font-size: 14px; color: #6b7280; margin-top: 15px;">
            Best regards,<br>
            ${companyName || "The Hiring Team"}
          </p>
        </div>

        <div style="text-align: center; margin-top: 20px; padding: 20px;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            This is a personalized invitation. If you're not interested, you can simply ignore this email.
          </p>
          <p style="color: #9ca3af; font-size: 12px; margin: 5px 0 0 0;">
            Invitation link: <a href="${invitationUrl}" style="color: #667eea;">${invitationUrl}</a>
          </p>
        </div>
      </div>
    `;

    const text = `
You've Been Invited to Apply!

Hi ${candidateName || "there"},

${invitedByName} from ${companyName || "our team"} thinks you'd be a great fit for our ${jobTitle} position.

${customMessage ? `Personal message from ${invitedByName}:\n"${customMessage}"\n\n` : ''}

We'd love for you to review the opportunity and apply if you're interested.

View the job and apply here:
${invitationUrl}

⏰ This invitation expires on ${expirationDate}

If you have any questions, feel free to reach out to us.

Best regards,
${companyName || "The Hiring Team"}

---
This is a personalized invitation. If you're not interested, you can simply ignore this email.
    `;

    return await this.sendEmail({
      to: candidateEmail,
      subject,
      html,
      text,
    });
  }

  /**
   * Send notification to candidate that they were added to a job pipeline
   */
  async sendSourcedToPipelineNotification({
    candidateEmail,
    candidateName,
    jobTitle,
    companyName,
    sourcedByName,
  }) {
    const subject = `You're being considered for: ${jobTitle}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #374151;">We're considering you for a position!</h2>

        <p style="font-size: 16px; color: #374151;">
          Hi ${candidateName || "there"},
        </p>

        <p style="font-size: 16px; color: #374151;">
          Great news! ${sourcedByName} from ${companyName || "our team"} has added you to the candidate pipeline for our <strong>${jobTitle}</strong> position.
        </p>

        <p style="font-size: 16px; color: #374151;">
          We've reviewed your background and think you could be a great fit. Our hiring team will be evaluating your profile and will reach out if we'd like to move forward with next steps.
        </p>

        <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #1e40af; font-size: 14px;">
            <strong>What happens next?</strong><br>
            Our hiring team will review your profile. If there's a good match, we'll reach out to discuss the opportunity further.
          </p>
        </div>

        <p style="font-size: 14px; color: #6b7280;">
          No action is required from you at this time. We'll be in touch if we need any additional information.
        </p>

        <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
          Best regards,<br>
          ${companyName || "The Hiring Team"}
        </p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #9ca3af; font-size: 12px;">
          This is an automated notification. Please do not reply to this email.
        </p>
      </div>
    `;

    const text = `
We're considering you for a position!

Hi ${candidateName || "there"},

Great news! ${sourcedByName} from ${companyName || "our team"} has added you to the candidate pipeline for our ${jobTitle} position.

We've reviewed your background and think you could be a great fit. Our hiring team will be evaluating your profile and will reach out if we'd like to move forward with next steps.

What happens next?
Our hiring team will review your profile. If there's a good match, we'll reach out to discuss the opportunity further.

No action is required from you at this time. We'll be in touch if we need any additional information.

Best regards,
${companyName || "The Hiring Team"}

---
This is an automated notification. Please do not reply to this email.
    `;

    return await this.sendEmail({
      to: candidateEmail,
      subject,
      html,
      text,
    });
  }
}

// Export singleton instance
export const emailService = new EmailService();

// Export class for testing
export { EmailService };

// Convenience functions
export const sendEmail = (params) => emailService.sendEmail(params);
export const sendAdminNotification = (params) =>
  emailService.sendAdminNotification(params);
export const sendApplicationConfirmation = (params) =>
  emailService.sendApplicationConfirmation(params);
export const sendNewApplicationNotification = (params) =>
  emailService.sendNewApplicationNotification(params);
export const sendJobPublishedNotification = (params) =>
  emailService.sendJobPublishedNotification(params);
export const sendTestEmail = (email) => emailService.sendTestEmail(email);
export const testEmailConfiguration = () =>
  emailService.testEmailConfiguration();
export const forceEmailReinitialize = () => emailService.forceReinitialize();
export const sendJobInvitation = (params) => emailService.sendJobInvitation(params);
export const sendSourcedToPipelineNotification = (params) =>
  emailService.sendSourcedToPipelineNotification(params);

/**
 * Send email using a template with variable substitution
 * Used by the automation system
 */
export async function sendEmailWithTemplate(recipientEmail, template, context = {}) {
  try {
    console.log(`📧 Sending template email: ${template.name} to ${recipientEmail}`);

    // Substitute variables in template content
    const substitutedSubject = substituteVariables(template.subject, context);
    const substitutedContent = substituteVariables(template.content, context);

    // Convert content to both HTML and text
    const html = convertToHtml(substitutedContent);
    const text = convertToText(substitutedContent);

    const result = await emailService.sendEmail({
      to: recipientEmail,
      subject: substitutedSubject,
      html,
      text,
    });

    return {
      success: result.success,
      templateId: template.id,
      templateName: template.name,
      recipient: recipientEmail,
      messageId: result.data?.id || result.data?.messageId,
    };
  } catch (error) {
    console.error('Error sending template email:', error);
    throw error;
  }
}

/**
 * Substitute template variables with actual values
 */
function substituteVariables(content, context) {
  let result = content;

  // Standard variables available in all templates
  const variables = {
    // Legacy underscore variables (keep for backward compatibility)
    recipient_name: context.recipientName || 'Recipient',
    applicant_name: context.applicantName || context.name || 'Applicant',
    applicant_email: context.applicantEmail || context.email || '',
    job_title: context.jobTitle || 'Position',
    job_department: context.jobDepartment || '',
    company_name: context.companyName || 'Our Company',
    status: context.status || '',
    previous_status: context.previousStatus || '',
    status_change: context.previousStatus && context.status ? 
      `${context.previousStatus} → ${context.status}` : 
      (context.status || ''),
    date: new Date().toLocaleDateString(),
    time: new Date().toLocaleTimeString(),
    timestamp: new Date().toLocaleString(),
    application_id: context.applicationId || '',
    application_link: context.applicationLink || '',
    interview_date: context.interviewDate || '',
    interview_time: context.interviewTime || '',
    interview_location: context.interviewLocation || '',
    interview_link: context.interviewLink || '',
    portal_link: context.portalLink || process.env.NEXTAUTH_URL || '',
    admin_portal_link: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin`,
    applications_link: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin/applications`,
    
    // CamelCase variables (for Communications compatibility)
    candidateName: context.candidateName || context.applicantName || context.name || 'Applicant',
    recipientEmail: context.recipientEmail || context.applicantEmail || context.email || '',
    jobTitle: context.jobTitle || 'Position',
    companyName: context.companyName || 'Our Company',
    department: context.department || context.jobDepartment || '',
    senderName: context.senderName || 'HR Team',
    reviewTimeframe: context.reviewTimeframe || '1-2 weeks',
    timeframe: context.timeframe || '1-2 weeks',
    currentStage: context.currentStage || 'review phase',
    expectedDate: context.expectedDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    nextSteps: context.nextSteps || '• Initial review by hiring team',
    timeline: context.timeline || '• Application review: 3-5 business days',
    interviewDate: context.interviewDate || 'TBD',
    interviewTime: context.interviewTime || 'TBD',
    duration: context.duration || '45-60 minutes',
    interviewFormat: context.interviewFormat || 'Video call',
    interviewLocation: context.interviewLocation || 'Virtual',
    interviewDetails: context.interviewDetails || 'Meeting details will be provided',
    interviewExpectations: context.interviewExpectations || 'Technical discussion and team fit assessment',
    originalDate: context.originalDate || 'TBD',
    originalTime: context.originalTime || 'TBD',
    option1: context.option1 || 'Option 1: TBD',
    option2: context.option2 || 'Option 2: TBD',
    option3: context.option3 || 'Option 3: TBD',
    startDate: context.startDate || 'TBD',
    officeAddress: context.officeAddress || '123 Business St, City, State 12345',
    startTime: context.startTime || '9:00 AM',
    supervisor: context.supervisor || 'Team Lead',
    supervisorEmail: context.supervisorEmail || 'supervisor@company.com',
    parkingInfo: context.parkingInfo || 'Visitor parking available',
    missingDocuments: context.missingDocuments || '• ID verification\n• Tax forms',
    hrEmail: context.hrEmail || 'hr@company.com',
    salary: context.salary || 'Competitive salary',
    benefits: context.benefits || 'Comprehensive benefits package',
    deadline: context.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    retentionPeriod: context.retentionPeriod || '6 months',
    requestedInfo: context.requestedInfo || 'Portfolio links, references',
    referenceName: context.referenceName || 'Reference',
    phoneNumber: context.phoneNumber || '(555) 123-4567',
    email: context.email || 'hiring@company.com',
  };

  // Replace variables in the format {{variable_name}}
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
    result = result.replace(regex, value || '');
  });

  // For debugging: leave unreplaced variables visible instead of removing them
  // result = result.replace(/{{[^}]+}}/g, '');

  return result;
}

/**
 * Convert template content to HTML
 */
function convertToHtml(content) {
  // Simple conversion - replace line breaks with <br> and wrap in basic HTML
  const htmlContent = content
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <p>${htmlContent}</p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
      <p style="color: #666; font-size: 12px;">
        This email was sent automatically by our application tracking system.
      </p>
    </div>
  `;
}

/**
 * Convert template content to plain text
 */
function convertToText(content) {
  // Remove markdown formatting and return clean text
  return content
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    + '\n\n---\nThis email was sent automatically by our application tracking system.';
}
