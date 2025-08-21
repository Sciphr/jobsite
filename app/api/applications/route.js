// app/api/applications/route.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { appPrisma } from "../../lib/prisma";
import {
  sendApplicationConfirmation,
  sendNewApplicationNotification,
} from "../../lib/email";
import { getSystemSetting } from "../../lib/settings";
import { logAuditEvent } from "../../../lib/auditMiddleware";
import { extractRequestContext } from "../../lib/auditLog";

export async function POST(request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id || null;

  try {
    const { jobId, name, email, phone, coverLetter, resumeUrl } =
      await request.json();
    const requestContext = extractRequestContext(request);

    if (!jobId || !resumeUrl) {
      // Log validation failure for application submission
      await logAuditEvent(
        {
          eventType: "ERROR",
          category: "VALIDATION",
          action: "Application submission failed - missing required fields",
          description: `Application submission failed due to missing required fields: ${!jobId ? 'jobId' : ''} ${!resumeUrl ? 'resumeUrl' : ''}`,
          actorId: userId,
          actorType: userId ? "user" : "anonymous",
          actorName: userId ? (session.user.name || session.user.email) : "Anonymous",
          ipAddress: requestContext.ipAddress,
          userAgent: requestContext.userAgent,
          requestId: requestContext.requestId,
          relatedUserId: userId,
          severity: "info",
          status: "failure",
          tags: ["application", "validation", "required_fields"],
          metadata: {
            missingFields: {
              jobId: !jobId,
              resumeUrl: !resumeUrl
            },
            userType: userId ? "authenticated" : "anonymous"
          },
          ...requestContext
        },
        request
      );
      
      return Response.json(
        { message: "Job ID and resume are required" },
        { status: 400 }
      );
    }

    // Check if job exists
    const job = await appPrisma.jobs.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        title: true,
        department: true,
        status: true,
      },
    });

    if (!job) {
      // Log job not found during application
      await logAuditEvent(
        {
          eventType: "ERROR",
          category: "DATA",
          action: "Application failed - job not found",
          description: `Application attempt for non-existent job: ${jobId}`,
          actorId: userId,
          actorType: userId ? "user" : "anonymous",
          actorName: userId ? (session.user.name || session.user.email) : "Anonymous",
          entityType: "job",
          entityId: jobId,
          ipAddress: requestContext.ipAddress,
          userAgent: requestContext.userAgent,
          requestId: requestContext.requestId,
          relatedUserId: userId,
          severity: "info",
          status: "failure",
          tags: ["application", "job_not_found"],
          metadata: {
            jobId: jobId,
            userType: userId ? "authenticated" : "anonymous"
          },
          ...requestContext
        },
        request
      );
      
      return Response.json({ message: "Job not found" }, { status: 404 });
    }

    // Check if job is still accepting applications
    if (job.status !== "Active") {
      // Log application attempt to inactive job
      await logAuditEvent(
        {
          eventType: "ERROR",
          category: "VALIDATION",
          action: "Application failed - job not active",
          description: `Application attempt for inactive job '${job.title}' (status: ${job.status})`,
          actorId: userId,
          actorType: userId ? "user" : "anonymous",
          actorName: userId ? (session.user.name || session.user.email) : "Anonymous",
          entityType: "job",
          entityId: jobId,
          entityName: job.title,
          ipAddress: requestContext.ipAddress,
          userAgent: requestContext.userAgent,
          requestId: requestContext.requestId,
          relatedUserId: userId,
          relatedJobId: jobId,
          severity: "info",
          status: "failure",
          tags: ["application", "job_inactive", "validation"],
          metadata: {
            jobTitle: job.title,
            jobStatus: job.status,
            userType: userId ? "authenticated" : "anonymous"
          },
          ...requestContext
        },
        request
      );
      
      return Response.json(
        { message: "This job is no longer accepting applications" },
        { status: 400 }
      );
    }

    let applicationData = {
      jobId,
      coverLetter: coverLetter || null,
      resumeUrl,
    };

    let applicantName = name;
    let applicantEmail = email;

    if (userId) {
      // Logged-in user: Get user profile data
      const user = await appPrisma.users.findUnique({
        where: { id: userId },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      });

      if (!user) {
        // Log user not found during application
        await logAuditEvent(
          {
            eventType: "ERROR",
            category: "DATA",
            action: "Application failed - user not found",
            description: `Application attempt by authenticated user but user profile not found: ${userId}`,
            actorId: userId,
            actorType: "user",
            actorName: "Unknown User",
            entityType: "user",
            entityId: userId,
            ipAddress: requestContext.ipAddress,
            userAgent: requestContext.userAgent,
            requestId: requestContext.requestId,
            relatedUserId: userId,
            relatedJobId: jobId,
            severity: "warning",
            status: "failure",
            tags: ["application", "user_not_found", "data_integrity"],
            metadata: {
              userId: userId,
              jobId: jobId,
              userType: "authenticated"
            },
            ...requestContext
          },
          request
        );
        
        return Response.json({ message: "User not found" }, { status: 404 });
      }

      // Check for duplicate application
      const existingApplication = await appPrisma.applications.findUnique({
        where: {
          userId_jobId: {
            userId,
            jobId,
          },
        },
      });

      if (existingApplication) {
        // Log duplicate application attempt
        await logAuditEvent(
          {
            eventType: "ERROR",
            category: "VALIDATION",
            action: "Duplicate application attempt blocked",
            description: `User ${user.email} attempted to apply again for job '${job.title}'`,
            actorId: userId,
            actorType: "user",
            actorName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
            entityType: "application",
            entityId: existingApplication.id,
            ipAddress: requestContext.ipAddress,
            userAgent: requestContext.userAgent,
            requestId: requestContext.requestId,
            relatedUserId: userId,
            relatedJobId: jobId,
            relatedApplicationId: existingApplication.id,
            severity: "info",
            status: "failure",
            tags: ["application", "duplicate", "validation"],
            metadata: {
              jobTitle: job.title,
              existingApplicationId: existingApplication.id,
              userEmail: user.email,
              userType: "authenticated"
            },
            ...requestContext
          },
          request
        );
        
        return Response.json(
          { message: "Already applied to this job" },
          { status: 400 }
        );
      }

      // Use user profile data
      applicationData.userId = userId;
      applicationData.name =
        `${user.firstName || ""} ${user.lastName || ""}`.trim() || null;
      applicationData.email = user.email;
      applicationData.phone = user.phone;

      // Set variables for email
      applicantName = applicationData.name;
      applicantEmail = user.email;
    } else {
      // Guest user: Require name, email, phone from form
      if (!name || !email || !phone) {
        // Log validation failure for guest application
        await logAuditEvent(
          {
            eventType: "ERROR",
            category: "VALIDATION",
            action: "Guest application failed - missing required fields",
            description: `Guest application submission failed due to missing required fields: ${!name ? 'name' : ''} ${!email ? 'email' : ''} ${!phone ? 'phone' : ''}`,
            actorType: "anonymous",
            actorName: "Anonymous",
            entityType: "application",
            ipAddress: requestContext.ipAddress,
            userAgent: requestContext.userAgent,
            requestId: requestContext.requestId,
            relatedJobId: jobId,
            severity: "info",
            status: "failure",
            tags: ["application", "guest", "validation", "required_fields"],
            metadata: {
              missingFields: {
                name: !name,
                email: !email,
                phone: !phone
              },
              jobTitle: job.title,
              userType: "guest"
            },
            ...requestContext
          },
          request
        );
        
        return Response.json(
          {
            message:
              "Name, email, and phone are required for guest applications",
          },
          { status: 400 }
        );
      }

      applicationData.name = name;
      applicationData.email = email;
      applicationData.phone = phone;

      // Variables already set from form data
      applicantName = name;
      applicantEmail = email;
    }

    // Create the application
    const application = await appPrisma.applications.create({
      data: applicationData,
      include: {
        jobs: {
          select: {
            id: true,
            title: true,
            department: true,
            location: true,
            salaryMin: true,
            salaryMax: true,
            salaryCurrency: true,
            createdAt: true,
            slug: true,
            employment_types: {
              select: {
                name: true
              }
            },
            remote_policies: {
              select: {
                name: true
              }
            },
            categories: {
              select: {
                name: true
              }
            }
          },
        },
      },
    });

    // Increment application count for the job
    await appPrisma.jobs.update({
      where: { id: jobId },
      data: {
        applicationCount: {
          increment: 1,
        },
      },
    });

    // Initialize stage time tracking for new application (if enabled)
    try {
      const trackTimeInStage = await getSystemSetting("track_time_in_stage", false);
      
      if (trackTimeInStage) {
        console.log("⏱️ Initializing stage time tracking for new application");
        
        // Create initial stage history record
        await appPrisma.$executeRaw`
          INSERT INTO application_stage_history (
            application_id, 
            stage, 
            previous_stage, 
            entered_at,
            changed_by_user_id,
            changed_by_name,
            created_at,
            updated_at
          ) VALUES (
            ${application.id}::uuid,
            'Applied',
            NULL,
            NOW(),
            ${userId ? `${userId}::uuid` : null},
            ${applicantName || 'System'},
            NOW(),
            NOW()
          )
        `;

        // Update current stage info on applications table
        await appPrisma.$executeRaw`
          UPDATE applications 
          SET 
            current_stage_entered_at = NOW(),
            time_in_current_stage_seconds = 0
          WHERE id = ${application.id}::uuid
        `;

        console.log("✅ Stage time tracking initialized for new application");
      }
    } catch (stageTrackingError) {
      console.error("❌ Error initializing stage time tracking:", stageTrackingError);
      // Don't fail the application creation if stage tracking fails
    }

    // Send application received confirmation email (if enabled)
    const autoSendApplicationReceived = await getSystemSetting(
      "auto_send_application_received",
      false
    );
    
    if (autoSendApplicationReceived && applicantEmail) {
      console.log("📧 Sending application received confirmation email...");

      try {
        // Import email service
        const { sendEmail } = await import("../../lib/email");
        
        // Get company settings
        const companyName = await getSystemSetting("site_name", "Our Company");
        const contactEmail = await getSystemSetting("notification_email", "hiring@company.com");
        const contactPhone = await getSystemSetting("contact_phone", "(555) 123-4567");
        
        // Create professional email content
        const subject = `Application Received - ${job.title} Position at ${companyName}`;
        
        const html = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f8fafc;">
            <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">
              <!-- Header -->
              <div style="text-align: center; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #e2e8f0;">
                <h1 style="color: #1a202c; font-size: 28px; font-weight: 700; margin: 0;">${companyName}</h1>
                <p style="color: #64748b; font-size: 16px; margin: 8px 0 0 0;">Hiring Team</p>
              </div>

              <!-- Main Content -->
              <div style="margin-bottom: 32px;">
                <h2 style="color: #059669; font-size: 24px; font-weight: 600; margin: 0 0 16px 0; text-align: center;">
                  ✅ Application Received!
                </h2>
                
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                  Dear <strong>${applicantName || 'there'}</strong>,
                </p>

                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                  Thank you for your application! We have successfully received your application for the <strong>${job.title}</strong> position${job.department ? ` in our ${job.department} department` : ''}.
                </p>

                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 28px 0;">
                  We appreciate you taking the time to apply and share your qualifications with us.
                </p>
              </div>

              <!-- What's Next Section -->
              <div style="background: #f1f5f9; border-radius: 8px; padding: 24px; margin-bottom: 28px;">
                <h3 style="color: #1e293b; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">
                  🔄 What happens next?
                </h3>
                
                <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
                  Our hiring team will carefully review your application along with your resume and cover letter. Here's what you can expect:
                </p>

                <div style="margin: 0;">
                  <div style="display: flex; align-items: flex-start; margin-bottom: 12px;">
                    <span style="color: #059669; font-weight: 600; margin-right: 8px; min-width: 20px;">•</span>
                    <span style="color: #475569; font-size: 15px; line-height: 1.5;"><strong>Initial Review:</strong> 3-5 business days</span>
                  </div>
                  <div style="display: flex; align-items: flex-start; margin-bottom: 12px;">
                    <span style="color: #059669; font-weight: 600; margin-right: 8px; min-width: 20px;">•</span>
                    <span style="color: #475569; font-size: 15px; line-height: 1.5;"><strong>Team Assessment:</strong> 1-2 weeks</span>
                  </div>
                  <div style="display: flex; align-items: flex-start;">
                    <span style="color: #059669; font-weight: 600; margin-right: 8px; min-width: 20px;">•</span>
                    <span style="color: #475569; font-size: 15px; line-height: 1.5;"><strong>Next Steps Communication:</strong> Within 2 weeks</span>
                  </div>
                </div>
              </div>

              <!-- Application Details -->
              <div style="background: #fefefe; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 28px;">
                <h3 style="color: #1e293b; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">
                  📋 Application Details
                </h3>
                
                <div style="color: #64748b; font-size: 14px; line-height: 1.8;">
                  <div><strong style="color: #374151;">Position:</strong> ${job.title}</div>
                  ${job.department ? `<div><strong style="color: #374151;">Department:</strong> ${job.department}</div>` : ''}
                  <div><strong style="color: #374151;">Application Date:</strong> ${new Date().toLocaleDateString()}</div>
                  <div><strong style="color: #374151;">Application ID:</strong> ${application.id}</div>
                </div>
              </div>

              <!-- Contact Section -->
              <div style="text-align: center; margin-bottom: 28px;">
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                  <strong>Questions?</strong> If you have any questions about your application or the position, please don't hesitate to reach out:
                </p>
                
                <div style="margin: 16px 0;">
                  <a href="mailto:${contactEmail}" style="color: #0369a1; text-decoration: none; font-weight: 500;">${contactEmail}</a>
                  ${contactPhone !== "(555) 123-4567" ? ` • <span style="color: #64748b;">${contactPhone}</span>` : ''}
                </div>
              </div>

              <!-- Closing -->
              <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e2e8f0;">
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                  Thank you again for your interest in joining our team. We look forward to learning more about your background and experience.
                </p>

                <p style="color: #374151; font-size: 16px; font-weight: 600; margin: 0;">
                  Best regards,<br>
                  <span style="color: #059669;">HR Team</span><br>
                  ${companyName}
                </p>
              </div>
            </div>

            <!-- Footer -->
            <div style="text-align: center; margin-top: 24px; padding: 16px;">
              <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin: 0;">
                This email was sent automatically when you submitted your application.<br>
                Please save this email for your records. If you need to make any changes to your application, please contact us directly.
              </p>
            </div>
          </div>
        `;

        const text = `
Application Received - ${job.title} Position at ${companyName}

Dear ${applicantName || 'there'},

Thank you for your application! We have successfully received your application for the ${job.title} position${job.department ? ` in our ${job.department} department` : ''}.

We appreciate you taking the time to apply and share your qualifications with us.

What happens next?

Our hiring team will carefully review your application along with your resume and cover letter. Here's what you can expect:

• Initial Review: 3-5 business days
• Team Assessment: 1-2 weeks  
• Next Steps Communication: Within 2 weeks

Application Details:
• Position: ${job.title}
${job.department ? `• Department: ${job.department}\n` : ''}• Application Date: ${new Date().toLocaleDateString()}
• Application ID: ${application.id}

Questions? 
If you have any questions about your application or the position, please don't hesitate to reach out to our hiring team at ${contactEmail}${contactPhone !== "(555) 123-4567" ? ` or ${contactPhone}` : ''}.

Thank you again for your interest in joining our team. We look forward to learning more about your background and experience.

Best regards,
HR Team
${companyName}

---
This email was sent automatically when you submitted your application. Please save this email for your records.
        `;

        // Send the email
        const emailResult = await sendEmail({
          to: applicantEmail,
          subject,
          html,
          text,
        });

        if (emailResult.success) {
          console.log("✅ Application received confirmation email sent successfully");
        } else {
          console.error("❌ Failed to send application confirmation email:", emailResult.error);
        }
      } catch (emailError) {
        console.error("❌ Failed to send application confirmation email:", emailError);
        // Don't fail the application if email fails - just log it
      }
    }

    // Send admin notification about new application (if enabled)
    const adminNotificationEnabled = await getSystemSetting(
      "email_new_applications",
      true
    );
    if (adminNotificationEnabled) {
      console.log("📧 Sending admin notification for new application...");

      const adminEmailResult = await sendNewApplicationNotification({
        jobTitle: job.title,
        applicantName,
        applicantEmail,
        applicationId: application.id,
      });

      if (adminEmailResult.success) {
        console.log("✅ Admin notification email sent successfully");
      } else {
        console.error(
          "❌ Failed to send admin notification email:",
          adminEmailResult.error
        );
        // Don't fail the application if email fails - just log it
      }
    }

    // Log successful application submission
    await logAuditEvent(
      {
        eventType: "CREATE",
        category: "APPLICATION",
        entityType: "application",
        entityId: application.id,
        entityName: `Application by ${applicantName}`,
        action: "Job application submitted",
        description: `New application submitted for ${job.title} by ${applicantName}`,
        newValues: {
          applicantName,
          applicantEmail,
          jobTitle: job.title,
          department: job.department,
          userType: userId ? "authenticated" : "guest",
        },
        relatedUserId: userId,
        relatedJobId: jobId,
        relatedApplicationId: application.id,
        severity: "info",
        status: "success",
        tags: [
          "application",
          "create",
          "job_application",
          userId ? "authenticated" : "guest",
        ],
        metadata: {
          jobTitle: job.title,
          department: job.department,
          hasCoverLetter: !!coverLetter,
          confirmationEmailSent: confirmationEmailEnabled && applicantEmail,
          adminNotificationSent: adminNotificationEnabled,
          userType: userId ? "authenticated_user" : "guest_user",
        },
        ...requestContext,
      },
      request
    );

    // Transform the response to alias 'jobs' as 'job' for frontend compatibility
    const transformedApplication = {
      ...application,
      job: application.jobs, // Alias jobs as job
      jobs: undefined // Remove the original jobs field
    };

    return Response.json(transformedApplication, { status: 201 });
  } catch (error) {
    console.error("Apply to job error:", error);

    // Log the error
    await logAuditEvent(
      {
        eventType: "ERROR",
        category: "APPLICATION",
        entityType: "application",
        action: "Failed to submit application",
        description: `Application submission failed: ${error.message}`,
        severity: "error",
        status: "failure",
        tags: ["application", "create", "error"],
        metadata: {
          errorMessage: error.message,
          attempted: { jobId, applicantName: name, applicantEmail: email },
          userType: userId ? "authenticated_user" : "guest_user",
        },
      },
      request
    );

    return Response.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request) {
  const requestContext = extractRequestContext(request);
  
  // Check if user is accessing via API key (requires permissions) or session (allows own applications)
  const authHeader = request.headers.get('authorization');
  const isAPIKey = authHeader?.startsWith('Bearer ');
  
  let authResult;
  
  if (isAPIKey) {
    // API key access requires explicit permissions
    const { protectAPIRoute } = await import("../../lib/middleware/apiProtection");
    authResult = await protectAPIRoute(request, "applications", "read");
    if (authResult.error) return authResult.error;
  } else {
    // Session access allows users to view their own applications
    const { getServerSession } = await import("next-auth/next");
    const { authOptions } = await import("../auth/[...nextauth]/route");
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    authResult = { session, authType: 'session' };
  }
  
  const { session, apiKeyData, authType } = authResult;

  // Determine user ID based on auth type
  let userId;
  let userEmail;
  if (authType === 'api_key') {
    userId = apiKeyData.userId;
    userEmail = apiKeyData.user.email;
  } else {
    userId = session.user.id;
    userEmail = session.user.email;
  }

  try {
    const applications = await appPrisma.applications.findMany({
      where: { userId },
      include: {
        jobs: {
          select: {
            id: true,
            title: true,
            department: true,
            location: true,
            slug: true,
            employment_types: {
              select: {
                name: true
              }
            },
            remote_policies: {
              select: {
                name: true
              }
            },
            categories: {
              select: {
                name: true
              }
            }
          },
        },
      },
      orderBy: { appliedAt: "desc" },
    });

    // Log successful applications list access
    await logAuditEvent(
      {
        eventType: "VIEW",
        category: "APPLICATION",
        action: "Applications list accessed",
        description: `User ${userEmail} accessed their applications list (${applications.length} applications) via ${authType || 'session'}`,
        actorId: userId,
        actorType: "user",
        actorName: authType === 'api_key' ? apiKeyData.user.firstName + ' ' + apiKeyData.user.lastName || userEmail : session.user.name || userEmail,
        entityType: "application",
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        relatedUserId: userId,
        severity: "info",
        status: "success",
        tags: ["applications", "list", "access", "view", authType || 'session'],
        metadata: {
          applicationCount: applications.length,
          userEmail: userEmail,
          authType: authType || 'session',
          apiKeyId: authType === 'api_key' ? apiKeyData.keyId : null
        }
      },
      request
    );

    // Transform the response to alias 'jobs' as 'job' for frontend compatibility
    const transformedApplications = applications.map(app => ({
      ...app,
      job: app.jobs, // Alias jobs as job
      jobs: undefined // Remove the original jobs field
    }));

    return Response.json(transformedApplications, { status: 200 });
  } catch (error) {
    console.error("Applications fetch error:", error);
    
    // Log server error during applications list access
    await logAuditEvent(
      {
        eventType: "ERROR",
        category: "SYSTEM",
        action: "Applications list access failed - server error",
        description: `Server error during applications list access for user: ${userEmail}`,
        actorId: userId,
        actorType: "user",
        actorName: authType === 'api_key' ? apiKeyData.user.firstName + ' ' + apiKeyData.user.lastName || userEmail : session.user.name || userEmail,
        entityType: "application",
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        relatedUserId: userId,
        severity: "error",
        status: "failure",
        tags: ["applications", "list", "server_error", "system", authType || 'session'],
        metadata: {
          error: error.message,
          stack: error.stack,
          userEmail: userEmail,
          authType: authType || 'session',
          apiKeyId: authType === 'api_key' ? apiKeyData.keyId : null
        }
      },
      request
    );
    
    return Response.json({ message: "Internal server error" }, { status: 500 });
  }
}
