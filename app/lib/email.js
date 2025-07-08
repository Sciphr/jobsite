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
        if (
          smtpSettings.smtp_host &&
          smtpSettings.smtp_username &&
          smtpSettings.smtp_from_email
        ) {
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
      this.smtpTransporter = nodemailer.createTransporter({
        host: settings.smtp_host,
        port: parseInt(settings.smtp_port) || 587,
        secure: settings.smtp_secure, // true for 465, false for other ports
        auth: {
          user: settings.smtp_username,
          pass: settings.smtp_password,
        },
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

      // If SMTP fails, try falling back to Resend (optional)
      if (this.provider === "smtp" && process.env.RESEND_API_KEY) {
        console.log("🔄 SMTP failed, attempting fallback to Resend...");
        try {
          const fallbackResult = await this.sendWithResend({
            to,
            subject,
            html,
            text,
            from: await this.getResendFromAddress(),
          });
          console.log("✅ Fallback to Resend successful");
          return {
            success: true,
            data: fallbackResult,
            provider: "resend-fallback",
          };
        } catch (fallbackError) {
          console.error("❌ Resend fallback also failed:", fallbackError);
        }
      }

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
