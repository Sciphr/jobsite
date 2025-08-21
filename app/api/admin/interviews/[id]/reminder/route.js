// app/api/admin/interviews/[id]/reminder/route.js
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

    // Check if interview is accepted (no point sending reminder for pending interviews)
    if (interview.status !== 'accepted') {
      return NextResponse.json({ error: "Can only send reminders for accepted interviews" }, { status: 400 });
    }

    // Check if interview is already completed
    if (interview.is_completed) {
      return NextResponse.json({ error: "Cannot send reminder for completed interview" }, { status: 400 });
    }

    // Check if interview is in the past
    const now = new Date();
    const interviewDate = new Date(interview.scheduled_at);
    if (interviewDate < now) {
      return NextResponse.json({ error: "Cannot send reminder for past interview" }, { status: 400 });
    }

    const formatType = interview.type.charAt(0).toUpperCase() + interview.type.slice(1);
    const interviewDateTime = interviewDate.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    // Calculate time until interview
    const timeDiff = interviewDate.getTime() - now.getTime();
    const daysUntil = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    const hoursUntil = Math.ceil(timeDiff / (1000 * 60 * 60));
    
    let timeUntilText;
    if (daysUntil > 1) {
      timeUntilText = `in ${daysUntil} days`;
    } else if (hoursUntil > 1) {
      timeUntilText = `in ${hoursUntil} hours`;
    } else {
      timeUntilText = 'very soon';
    }

    // Send reminder email
    const subject = `Interview Reminder: ${interview.applications.jobs.title} - ${timeUntilText}`;
    
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Interview Reminder</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Your interview is coming up ${timeUntilText}</p>
      </div>

      <div style="background: white; padding: 30px; border: 1px solid #e1e5e9; border-top: none; border-radius: 0 0 10px 10px;">
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

        <div style="background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h4 style="color: #0c5460; margin: 0 0 10px 0;">🎯 Preparation Tips</h4>
          <ul style="color: #0c5460; margin: 0; padding-left: 20px;">
            <li>Test your internet connection and camera/microphone beforehand</li>
            <li>Have a copy of your resume and the job description handy</li>
            <li>Prepare examples of your work and achievements</li>
            <li>Plan to join the meeting 5-10 minutes early</li>
          </ul>
        </div>

        ${interview.notes ? `
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h4 style="color: #856404; margin: 0 0 10px 0;">Additional Notes</h4>
          <p style="color: #856404; margin: 0; white-space: pre-wrap;">${interview.notes}</p>
        </div>
        ` : ''}

        <div style="border-top: 1px solid #e9ecef; padding-top: 20px; margin-top: 20px; text-align: center;">
          <p style="color: #6c757d; font-size: 14px; margin: 0;">
            We're looking forward to speaking with you! If you have any questions or need to reschedule, please let us know as soon as possible.
          </p>
        </div>
      </div>
    </div>
    `;

    const text = `
Interview Reminder: ${interview.applications.jobs.title}

Your interview is coming up ${timeUntilText}!

Interview Details:
- Position: ${interview.applications.jobs.title}
- Date & Time: ${interviewDateTime}
- Duration: ${interview.duration} minutes
- Format: ${formatType} Interview
${interview.location ? `- Location: ${interview.location}` : ''}
${interview.meeting_link ? `- Meeting Link: ${interview.meeting_link}` : ''}

${interview.agenda ? `Interview Agenda:\n${interview.agenda}\n\n` : ''}

Preparation Tips:
- Test your internet connection and camera/microphone beforehand
- Have a copy of your resume and the job description handy
- Prepare examples of your work and achievements
- Plan to join the meeting 5-10 minutes early

${interview.notes ? `\nAdditional Notes:\n${interview.notes}\n\n` : ''}

We're looking forward to speaking with you! If you have any questions or need to reschedule, please let us know as soon as possible.
    `;

    await emailService.sendEmail({
      to: interview.applications.email,
      subject,
      html,
      text
    });

    // Update the interview with reminder sent timestamp
    await appPrisma.interview_tokens.update({
      where: { id },
      data: {
        last_reminder_sent_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Add application note about the reminder being sent
    await appPrisma.application_notes.create({
      data: {
        application_id: interview.application_id,
        content: `Interview reminder sent to ${interview.applications.email}`,
        type: "interview_reminder",
        author_id: session.user.id,
        author_name: session.user.name || session.user.email,
        metadata: {
          interviewTokenId: interview.id,
          reminderSentAt: new Date(),
          timeUntilInterview: timeUntilText,
        },
        is_system_generated: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Interview reminder sent successfully"
    });

  } catch (error) {
    console.error("Error sending interview reminder:", error);
    return NextResponse.json(
      { error: "Failed to send interview reminder", details: error.message },
      { status: 500 }
    );
  }
}