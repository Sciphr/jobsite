// app/api/interview/accept/[token]/route.js
import { NextResponse } from "next/server";
import { PrismaClient } from "@/app/generated/prisma";
import { emailService } from "@/app/lib/email";
import { google } from "googleapis";

const prisma = new PrismaClient();

// Function to convert hold event to confirmed interview
async function convertHoldToConfirmedInterview(interview) {
  try {
    // Find who created this interview by looking at the application note created during scheduling
    const interviewCreationNote = await prisma.applicationNote.findFirst({
      where: {
        applicationId: interview.applicationId,
        type: "interview_scheduled",
        metadata: {
          path: ["calendarEventId"],
          equals: interview.calendarEventId
        }
      },
      select: {
        authorId: true
      }
    });

    const interviewerId = interviewCreationNote?.authorId;
    
    if (!interviewerId) {
      console.warn("No interviewer ID found for calendar conversion, skipping calendar update");
      return null;
    }

    // Get the interviewer's Google Calendar credentials
    const interviewer = await prisma.user.findUnique({
      where: { id: interviewerId },
      select: {
        googleAccessToken: true,
        googleRefreshToken: true,
        googleTokenExpiresAt: true,
      }
    });

    if (!interviewer?.googleAccessToken) {
      console.warn("Interviewer doesn't have Google Calendar connected");
      return null;
    }

    // Setup Google Calendar client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: interviewer.googleAccessToken,
      refresh_token: interviewer.googleRefreshToken,
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Create the confirmed interview event data
    const formatType = interview.type.charAt(0).toUpperCase() + interview.type.slice(1);
    
    let meetingInstructions = '';
    if (interview.type === 'video') {
      meetingInstructions = `
Meeting Instructions:
- This is a video interview conducted via Google Meet
- A Google Meet link has been generated for this meeting
- Please ensure you have a stable internet connection and test your camera/microphone beforehand
- Join the meeting a few minutes early to resolve any technical issues`;
    } else if (interview.type === 'phone') {
      meetingInstructions = `
Meeting Instructions:
- This is a phone interview
- The interviewer will call you at your provided phone number
- Please ensure you're in a quiet location with good phone reception
- Have a copy of your resume and the job description handy`;
    } else if (interview.type === 'in-person') {
      meetingInstructions = `
Meeting Instructions:
- This is an in-person interview${interview.location ? ` at ${interview.location}` : ''}
- Please arrive 10-15 minutes early
- Bring copies of your resume and any requested documents
- Dress professionally and be prepared for a full interview experience`;
    }

    const confirmedEvent = {
      summary: `${formatType} Interview: ${interview.application.name} - ${interview.application.job.title}`,
      description: `
✅ CONFIRMED INTERVIEW

This interview has been confirmed by the candidate.

Interview Details:
- Candidate: ${interview.application.name} (${interview.application.email})
- Position: ${interview.application.job.title}
- Interview Format: ${formatType} Interview
- Duration: ${interview.duration} minutes
${meetingInstructions}

${interview.agenda ? `\nInterview Agenda:\n${interview.agenda}\n` : ''}
${interview.notes ? `\nAdditional Notes:\n${interview.notes}\n` : ''}

Status: Confirmed - Candidate accepted on ${new Date().toLocaleDateString()}
      `.trim(),
      start: {
        dateTime: interview.scheduledAt,
        timeZone: 'America/Toronto',
      },
      end: {
        dateTime: new Date(new Date(interview.scheduledAt).getTime() + (interview.duration * 60 * 1000)).toISOString(),
        timeZone: 'America/Toronto',
      },
      // Now include ALL attendees including the candidate
      attendees: [
        {
          email: interview.application.email,
          displayName: interview.application.name,
          responseStatus: 'accepted'
        },
        ...(interview.interviewers || []).map(interviewer => ({
          email: interviewer.email,
          displayName: interviewer.name,
          responseStatus: 'accepted'
        }))
      ],
      // Add video conference for video interviews
      conferenceData: interview.type === 'video' ? {
        createRequest: {
          requestId: `confirmed-interview-${interview.id}-${Date.now()}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      } : undefined,
      location: interview.type === 'in-person' ? interview.location : undefined,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 24 hours
          { method: 'email', minutes: 60 },      // 1 hour
          { method: 'popup', minutes: 30 },      // 30 minutes
        ],
      },
    };

    // Update the existing calendar event
    const response = await calendar.events.update({
      calendarId: 'primary',
      eventId: interview.calendarEventId,
      resource: confirmedEvent,
      conferenceDataVersion: interview.type === 'video' ? 1 : 0,
      sendUpdates: 'all', // Send updates to all attendees
    });

    return response.data;

  } catch (error) {
    console.error("Failed to convert hold to confirmed interview:", error);
    return null;
  }
}

// GET - Fetch interview details by acceptance token
export async function GET(request, { params }) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Find interview by acceptance token
    const interview = await prisma.interviewToken.findUnique({
      where: { 
        acceptanceToken: token,
        expiresAt: {
          gt: new Date() // Token must not be expired
        }
      },
      include: {
        application: {
          include: {
            job: {
              select: {
                title: true
              }
            }
          }
        }
      }
    });

    if (!interview) {
      return NextResponse.json(
        { error: "Interview not found or token has expired" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      interview: {
        id: interview.id,
        jobTitle: interview.application.job?.title,
        candidateName: interview.application.name,
        candidateEmail: interview.application.email,
        scheduledDateTime: interview.scheduledAt,
        duration: interview.duration,
        type: interview.type,
        interviewers: interview.interviewers,
        location: interview.location,
        agenda: interview.agenda,
        notes: interview.notes,
        status: interview.status
      }
    });

  } catch (error) {
    console.error("Error fetching interview data:", error);
    return NextResponse.json(
      { error: "Failed to fetch interview data" },
      { status: 500 }
    );
  }
}

// POST - Accept interview
export async function POST(request, { params }) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Find interview by acceptance token
    const interviewToken = await prisma.interviewToken.findUnique({
      where: { 
        acceptanceToken: token,
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        application: {
          include: {
            job: {
              select: {
                title: true,
                createdBy: true // Get the hiring manager's ID
              }
            }
          }
        }
      }
    });

    if (!interviewToken) {
      return NextResponse.json(
        { error: "Interview not found or token has expired" },
        { status: 404 }
      );
    }

    // Check if already responded
    if (interviewToken.status !== "pending") {
      return NextResponse.json(
        { error: "Interview has already been responded to" },
        { status: 400 }
      );
    }

    // Convert calendar hold event to confirmed interview
    const updatedCalendarEvent = await convertHoldToConfirmedInterview(interviewToken);

    // Update interview token status
    await prisma.interviewToken.update({
      where: { id: interviewToken.id },
      data: { 
        status: "accepted",
        respondedAt: new Date()
      }
    });

    // Add note to application timeline
    await prisma.applicationNote.create({
      data: {
        applicationId: interviewToken.applicationId,
        content: `Candidate accepted interview scheduled for ${new Date(interviewToken.scheduledAt).toLocaleString()}`,
        type: "interview_accepted",
        authorName: interviewToken.application.name,
        metadata: {
          interviewTokenId: interviewToken.id,
          acceptedAt: new Date(),
          scheduledDateTime: interviewToken.scheduledAt,
          interviewType: interviewToken.type,
          duration: interviewToken.duration
        },
        isSystemGenerated: false,
      },
    });

    // Send notification to interviewer
    try {
      // Find who created this interview by looking at the application note
      const interviewCreationNote = await prisma.applicationNote.findFirst({
        where: {
          applicationId: interviewToken.applicationId,
          type: "interview_scheduled",
          metadata: {
            path: ["calendarEventId"],
            equals: interviewToken.calendarEventId
          }
        },
        select: {
          authorId: true
        }
      });

      const interviewerId = interviewCreationNote?.authorId;
      
      if (!interviewerId) {
        console.warn('No interviewer ID found for interview notification');
        return NextResponse.json({ 
          success: true, 
          message: "Interview accepted successfully",
          warning: "Could not send notification to interviewer"
        });
      }

      const interviewerUser = await prisma.user.findUnique({
        where: { id: interviewerId },
        select: { email: true, firstName: true, lastName: true }
      });

      if (interviewerUser?.email) {
        await emailService.sendEmail({
          to: interviewerUser.email,
          subject: `Interview Accepted: ${interviewToken.application.name} - ${interviewToken.application.job.title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Interview Accepted!</h2>
              <p>Great news! The candidate has accepted the interview.</p>
              
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Interview Details:</h3>
                <p><strong>Candidate:</strong> ${interviewToken.application.name}</p>
                <p><strong>Position:</strong> ${interviewToken.application.job.title}</p>
                <p><strong>Scheduled Time:</strong> ${new Date(interviewToken.scheduledAt).toLocaleString()}</p>
                <p><strong>Duration:</strong> ${interviewToken.duration} minutes</p>
                <p><strong>Type:</strong> ${interviewToken.type}</p>
                ${interviewToken.location ? `<p><strong>Location:</strong> ${interviewToken.location}</p>` : ''}
              </div>

              <p>The candidate confirmed their attendance at the scheduled time. Make sure to prepare for the interview!</p>
              
              <p>
                <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin/applications/${interviewToken.applicationId}" 
                   style="background: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                  View Application
                </a>
              </p>
            </div>
          `,
          text: `
Interview Accepted!

The candidate has accepted the interview.

Interview Details:
- Candidate: ${interviewToken.application.name}
- Position: ${interviewToken.application.job.title}
- Scheduled Time: ${new Date(interviewToken.scheduledAt).toLocaleString()}
- Duration: ${interviewToken.duration} minutes
- Type: ${interviewToken.type}
${interviewToken.location ? `- Location: ${interviewToken.location}` : ''}

The candidate confirmed their attendance at the scheduled time. Make sure to prepare for the interview!

View Application: ${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin/applications/${interviewToken.applicationId}
          `
        });
      }
    } catch (emailError) {
      console.error("Failed to send notification email:", emailError);
      // Don't fail the request if email fails
    }
    
    return NextResponse.json({
      success: true,
      message: "Interview accepted successfully",
      interview: {
        scheduledDateTime: interviewToken.scheduledAt,
        type: interviewToken.type,
        duration: interviewToken.duration
      }
    });

  } catch (error) {
    console.error("Error accepting interview:", error);
    return NextResponse.json(
      { error: "Failed to accept interview" },
      { status: 500 }
    );
  }
}