// app/api/applications/route.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { appPrisma } from "../../lib/prisma";
import {
  sendApplicationConfirmation,
  sendNewApplicationNotification,
} from "../../lib/email";
import { getSystemSetting } from "../../lib/settings";

export async function POST(request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id || null;

  try {
    const { jobId, name, email, phone, coverLetter, resumeUrl } =
      await request.json();

    if (!jobId || !resumeUrl) {
      return Response.json(
        { message: "Job ID and resume are required" },
        { status: 400 }
      );
    }

    // Check if job exists
    const job = await appPrisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        title: true,
        department: true,
        status: true,
      },
    });

    if (!job) {
      return Response.json({ message: "Job not found" }, { status: 404 });
    }

    // Check if job is still accepting applications
    if (job.status !== "Active") {
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
      const user = await appPrisma.user.findUnique({
        where: { id: userId },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      });

      if (!user) {
        return Response.json({ message: "User not found" }, { status: 404 });
      }

      // Check for duplicate application
      const existingApplication = await appPrisma.application.findUnique({
        where: {
          userId_jobId: {
            userId,
            jobId,
          },
        },
      });

      if (existingApplication) {
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
    const application = await appPrisma.application.create({
      data: applicationData,
      include: {
        job: {
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
    await appPrisma.job.update({
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

    return Response.json(application, { status: 201 });
  } catch (error) {
    console.error("Apply to job error:", error);
    return Response.json({ message: "Internal server error" }, { status: 500 });
  }
}
