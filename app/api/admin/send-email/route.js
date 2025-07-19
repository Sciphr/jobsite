import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { appPrisma } from "../../../lib/prisma";
import { emailService } from "../../../lib/email";

export async function POST(req) {
  const session = await getServerSession(authOptions);

  // Check if user is admin (privilege level 1 or higher)
  if (
    !session ||
    !session.user.privilegeLevel ||
    session.user.privilegeLevel < 1
  ) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
    });
  }

  try {
    const body = await req.json();
    const {
      to,
      toName,
      subject,
      content,
      applicationId,
      templateId,
    } = body;

    // Validate required fields
    if (!to || !subject || !content) {
      return new Response(
        JSON.stringify({ message: "Missing required fields" }),
        { status: 400 }
      );
    }

    console.log("📧 Sending email:", {
      to,
      toName,
      subject,
      preview: content.substring(0, 100) + "...",
    });

    // First, get the job_id if we have an applicationId
    let jobId = null;
    if (applicationId) {
      const application = await appPrisma.application.findUnique({
        where: { id: applicationId },
        select: { jobId: true }
      });
      jobId = application?.jobId;
    }

    // Store email record in database (initially as pending)
    const emailRecord = await appPrisma.email.create({
      data: {
        subject,
        content,
        html_content: content.replace(/\n/g, '<br>'), // Simple HTML conversion
        recipient_email: to,
        recipient_name: toName || null,
        application_id: applicationId || null,
        template_id: templateId || null,
        email_provider: "pending", // Will be updated after sending
        status: "pending", // Start as pending
        sent_by: session.user.id,
        sent_at: new Date(),
        job_id: jobId,
      },
    });

    // Actually send the email using your email service
    const emailResult = await emailService.sendEmail({
      to,
      subject,
      html: content.replace(/\n/g, '<br>'),
      text: content, // Plain text version
    });

    // Update email record based on send result
    if (emailResult.success) {
      await appPrisma.email.update({
        where: { id: emailRecord.id },
        data: {
          status: "sent",
          email_provider: emailResult.provider,
          message_id: emailResult.data?.id || emailResult.data?.messageId || null,
        },
      });
    } else {
      await appPrisma.email.update({
        where: { id: emailRecord.id },
        data: {
          status: "failed",
          failure_reason: emailResult.error,
        },
      });
      
      throw new Error(`Failed to send email: ${emailResult.error}`);
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Email sent successfully",
      emailId: emailRecord.id,
    }), { status: 200 });

  } catch (error) {
    console.error("Send email error:", error);
    return new Response(JSON.stringify({ 
      message: "Failed to send email",
      error: error.message 
    }), {
      status: 500,
    });
  }
}