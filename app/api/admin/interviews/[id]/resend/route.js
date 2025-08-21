// app/api/admin/interviews/[id]/resend/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { appPrisma } from "../../../../../lib/prisma";
import { emailService } from "@/app/lib/email";
import { protectRoute } from "../../../../../lib/middleware/apiProtection";

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const authResult = await protectRoute("interviews", "edit");
    if (authResult.error) return authResult.error;
    const { session } = authResult;

    // Find the interview
    const interview = await appPrisma.interview_tokens.findUnique({
      where: { id },
      include: {
        applications: {
          include: {
            jobs: {
              select: {
                title: true,
                createdBy: true
              }
            }
          }
        }
      }
    });

    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    // Check if interview is pending (only resend for pending interviews)
    if (interview.status !== 'pending') {
      return NextResponse.json({ error: "Can only resend invitations for pending interviews" }, { status: 400 });
    }

    // Check if interview token has expired
    const now = new Date();
    if (new Date(interview.expires_at) < now) {
      return NextResponse.json({ error: "Interview token has expired. Please schedule a new interview." }, { status: 400 });
    }

    // Generate the invitation email content (similar to original scheduling email)
    const formatType = interview.type.charAt(0).toUpperCase() + interview.type.slice(1);
    const interviewDateTime = new Date(interview.scheduled_at).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    // Create acceptance and reschedule URLs
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const acceptUrl = `${baseUrl}/interview/accept/${interview.acceptance_token}`;
    const rescheduleUrl = `${baseUrl}/interview/reschedule/${interview.reschedule_token}`;

    const subject = `Interview Invitation Reminder: ${interview.applications.jobs.title} Position`;
    
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Interview Invitation Reminder</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">We haven't heard back from you yet</p>
      </div>

      <div style="background: white; padding: 30px; border: 1px solid #e1e5e9; border-top: none; border-radius: 0 0 10px 10px;">
        <p style="color: #2c3e50; font-size: 16px; margin: 0 0 20px 0;">
          Hi! We recently sent you an interview invitation and wanted to follow up to make sure you received it.
        </p>

        <div style="background: #e8f4fd; border: 1px solid #bee5eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="color: #004085; margin: 0 0 15px 0;">📅 Interview Details</h3>
          <p style="margin: 5px 0;"><strong>Position:</strong> ${interview.applications.jobs.title}</p>
          <p style="margin: 5px 0;"><strong>Date & Time:</strong> ${interviewDateTime}</p>
          <p style="margin: 5px 0;"><strong>Duration:</strong> ${interview.duration} minutes</p>
          <p style="margin: 5px 0;"><strong>Format:</strong> ${formatType} Interview</p>
          ${interview.location ? `<p style="margin: 5px 0;"><strong>Location:</strong> ${interview.location}</p>` : ''}
          ${interview.meeting_link ? `<p style="margin: 5px 0;"><strong>Meeting Link:</strong> <a href="${interview.meeting_link}" style="color: #007bff;">${interview.meeting_link}</a></p>` : ''}
        </div>

        ${interview.agenda ? `
        <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h4 style="color: #2c3e50; margin: 0 0 10px 0;">Interview Agenda</h4>
          <p style="color: #495057; margin: 0; white-space: pre-wrap;">${interview.agenda}</p>
        </div>
        ` : ''}

        <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="color: #155724; margin: 0 0 15px 0;">🎯 Action Required</h3>
          <p style="color: #155724; margin: 0 0 15px 0;">Please respond to this interview invitation by clicking one of the buttons below:</p>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="${acceptUrl}" style="display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 0 10px;">
              ✅ Accept Interview
            </a>
            <a href="${rescheduleUrl}" style="display: inline-block; background: #ffc107; color: #212529; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 0 10px;">
              📅 Request Reschedule
            </a>
          </div>
          
          <p style="color: #155724; font-size: 14px; margin: 15px 0 0 0; text-align: center;">
            <strong>Important:</strong> Please respond by ${new Date(interview.expires_at).toLocaleDateString()} to confirm your interview.
          </p>
        </div>

        ${interview.notes ? `
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h4 style="color: #856404; margin: 0 0 10px 0;">Additional Notes</h4>
          <p style="color: #856404; margin: 0; white-space: pre-wrap;">${interview.notes}</p>
        </div>
        ` : ''}

        <div style="border-top: 1px solid #e9ecef; padding-top: 20px; margin-top: 20px;">
          <p style="color: #6c757d; font-size: 14px; margin: 0;">
            We look forward to speaking with you! If you have any questions, please don't hesitate to reach out.
          </p>
        </div>
      </div>
    </div>
    `;

    const text = `
Interview Invitation Reminder: ${interview.applications.jobs.title} Position

Hi! We recently sent you an interview invitation and wanted to follow up to make sure you received it.

Interview Details:
- Position: ${interview.applications.jobs.title}
- Date & Time: ${interviewDateTime}
- Duration: ${interview.duration} minutes
- Format: ${formatType} Interview
${interview.location ? `- Location: ${interview.location}` : ''}
${interview.meeting_link ? `- Meeting Link: ${interview.meeting_link}` : ''}

${interview.agenda ? `Interview Agenda:\n${interview.agenda}\n\n` : ''}

ACTION REQUIRED:
Please respond to this interview invitation:

Accept Interview: ${acceptUrl}
Request Reschedule: ${rescheduleUrl}

Please respond by ${new Date(interview.expires_at).toLocaleDateString()} to confirm your interview.

${interview.notes ? `\nAdditional Notes:\n${interview.notes}\n\n` : ''}

We look forward to speaking with you!
    `;

    // Send the reminder email
    await emailService.sendEmail({
      to: interview.applications.email,
      subject,
      html,
      text
    });

    // Add application note about the resend
    await appPrisma.application_notes.create({
      data: {
        application_id: interview.application_id,
        content: `Interview invitation resent to ${interview.applications.email}`,
        type: "interview_invitation_resent",
        author_id: session.user.id,
        author_name: session.user.name || session.user.email,
        metadata: {
          interviewTokenId: interview.id,
          resentAt: new Date(),
          originallyScheduledAt: interview.created_at,
        },
        is_system_generated: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Interview invitation resent successfully"
    });

  } catch (error) {
    console.error("Error resending interview invitation:", error);
    return NextResponse.json(
      { error: "Failed to resend interview invitation", details: error.message },
      { status: 500 }
    );
  }
}