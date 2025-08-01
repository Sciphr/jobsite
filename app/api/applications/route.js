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
            employmentType: true,
            remotePolicy: true,
            createdAt: true,
            slug: true,
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

    // Send confirmation email to applicant (if enabled)
    const confirmationEmailEnabled = await getSystemSetting(
      "application_confirmation_email",
      true
    );
    if (confirmationEmailEnabled && applicantEmail) {
      console.log("📧 Sending application confirmation email...");

      const emailResult = await sendApplicationConfirmation({
        applicantEmail,
        applicantName,
        jobTitle: job.title,
        companyName: await getSystemSetting("site_name", "Our Company"),
      });

      if (emailResult.success) {
        console.log("✅ Application confirmation email sent successfully");
      } else {
        console.error(
          "❌ Failed to send application confirmation email:",
          emailResult.error
        );
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
  const session = await getServerSession(authOptions);
  const requestContext = extractRequestContext(request);

  if (!session) {
    // Log unauthorized applications list access attempt
    await logAuditEvent(
      {
        eventType: "ERROR",
        category: "SECURITY",
        action: "Unauthorized applications list access attempt",
        description: "Applications list access attempted without valid session",
        actorType: "anonymous",
        actorName: "Anonymous",
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        severity: "warning",
        status: "failure",
        tags: ["applications", "list", "unauthorized", "security"]
      },
      request
    );
    
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

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
            employmentType: true,
            remotePolicy: true,
            slug: true,
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
        description: `User ${session.user.email} accessed their applications list (${applications.length} applications)`,
        actorId: userId,
        actorType: "user",
        actorName: session.user.name || session.user.email,
        entityType: "application",
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        relatedUserId: userId,
        severity: "info",
        status: "success",
        tags: ["applications", "list", "access", "view"],
        metadata: {
          applicationCount: applications.length,
          userEmail: session.user.email
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
        description: `Server error during applications list access for user: ${session.user.email}`,
        actorId: userId,
        actorType: "user",
        actorName: session.user.name || session.user.email,
        entityType: "application",
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        relatedUserId: userId,
        severity: "error",
        status: "failure",
        tags: ["applications", "list", "server_error", "system"],
        metadata: {
          error: error.message,
          stack: error.stack,
          userEmail: session.user.email
        }
      },
      request
    );
    
    return Response.json({ message: "Internal server error" }, { status: 500 });
  }
}
