// app/api/calendar/interview/schedule/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { appPrisma } from "@/app/lib/prisma";
import { google } from "googleapis";
import { emailService } from "@/app/lib/email";
import crypto from "crypto";

async function refreshTokenIfNeeded(oauth2Client, user) {
  const now = new Date();
  const tokenExpiresAt = new Date(user.google_token_expires_at);
  
  // If token expires within 5 minutes, refresh it
  if (tokenExpiresAt <= new Date(now.getTime() + 5 * 60 * 1000)) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
      
      // Update database with new token
      const expiresAt = new Date();
      if (credentials.expiry_date) {
        expiresAt.setTime(credentials.expiry_date);
      } else {
        expiresAt.setHours(expiresAt.getHours() + 1);
      }
      
      await appPrisma.users.update({
        where: { id: user.id },
        data: {
          google_access_token: credentials.access_token,
          google_token_expires_at: expiresAt,
          ...(credentials.refresh_token && { google_refresh_token: credentials.refresh_token }),
        },
      });
      
      return credentials.access_token;
    } catch (error) {
      console.error("Failed to refresh token:", error);
      throw new Error("Token refresh failed");
    }
  }
  
  return user.google_access_token;
}

async function createCalendarHoldEvent(calendar, eventData, tokens) {
  const formatType = eventData.type.charAt(0).toUpperCase() + eventData.type.slice(1);
  
  // Create a "hold" event - just for the hiring manager initially
  const event = {
    summary: `Interview Hold - ${eventData.candidateName} (${eventData.jobTitle})`,
    description: `
📋 INTERVIEW HOLD

This time slot is being held for a potential interview.
The candidate has been sent invitation links and this event will be updated once they respond.

Candidate Details:
- Name: ${eventData.candidateName}
- Email: ${eventData.candidateEmail}
- Position: ${eventData.jobTitle}
- Interview Type: ${formatType}
- Duration: ${eventData.duration} minutes

${eventData.agenda ? `Agenda: ${eventData.agenda}` : ''}
${eventData.notes ? `Notes: ${eventData.notes}` : ''}

Status: Waiting for candidate response
    `.trim(),
    start: {
      dateTime: eventData.startDateTime,
      timeZone: eventData.timezone || 'America/Toronto',
    },
    end: {
      dateTime: eventData.endDateTime,
      timeZone: eventData.timezone || 'America/Toronto',
    },
    // Only include hiring manager and other interviewers - NOT the candidate yet
    attendees: eventData.interviewers.map(interviewer => ({
      email: interviewer.email,
      displayName: interviewer.name,
      responseStatus: 'accepted'
    })),
    location: eventData.type === 'in-person' ? eventData.location : undefined,
    // Mark as private/busy time
    visibility: 'private',
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 15 }, // Just a small reminder
      ],
    },
    // Add Google Meet conference data for video interviews
    ...(eventData.type === 'video' && {
      conferenceData: {
        createRequest: {
          requestId: `interview-${eventData.applicationId}-${Date.now()}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      }
    }),
  };

  const response = await calendar.events.insert({
    calendarId: 'primary',
    resource: event,
    conferenceDataVersion: eventData.type === 'video' ? 1 : 0,
    sendUpdates: 'all', // Send email invitations to all attendees
  });

  return response.data;
}

async function sendInterviewInvitationEmail(eventData, tokens, interviewToken, calendarEvent) {
  const formatType = eventData.type.charAt(0).toUpperCase() + eventData.type.slice(1);
  const meetingLink = calendarEvent?.conferenceData?.entryPoints?.[0]?.uri;
  
  let meetingInstructions = '';
  if (eventData.type === 'video') {
    meetingInstructions = `
<strong>Meeting Instructions:</strong>
<ul>
<li>This is a video interview conducted via Google Meet</li>
${meetingLink ? `<li><strong>Meeting Link:</strong> <a href="${meetingLink}" style="color: #1a73e8; text-decoration: none;">${meetingLink}</a></li>` : '<li>A Google Meet link will be automatically generated when you confirm</li>'}
<li>Please ensure you have a stable internet connection and test your camera/microphone beforehand</li>
<li>Join the meeting a few minutes early to resolve any technical issues</li>
</ul>`;
  } else if (eventData.type === 'phone') {
    meetingInstructions = `
<strong>Meeting Instructions:</strong>
<ul>
<li>This is a phone interview</li>
<li>The interviewer will call you at your provided phone number</li>
<li>Please ensure you're in a quiet location with good phone reception</li>
<li>Have a copy of your resume and the job description handy</li>
</ul>`;
  } else if (eventData.type === 'in-person') {
    meetingInstructions = `
<strong>Meeting Instructions:</strong>
<ul>
<li>This is an in-person interview${eventData.location ? ` at ${eventData.location}` : ''}</li>
<li>Please arrive 10-15 minutes early</li>
<li>Bring copies of your resume and any requested documents</li>
<li>Dress professionally and be prepared for a full interview experience</li>
</ul>`;
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const acceptUrl = `${baseUrl}/interview/accept/${tokens.acceptanceToken}`;
  const rescheduleUrl = `${baseUrl}/interview/reschedule/${tokens.rescheduleToken}`;

  const subject = `Interview Invitation: ${eventData.jobTitle} Position`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #2c3e50; margin: 0 0 10px 0;">Interview Invitation</h2>
        <p style="color: #34495e; margin: 0;">You've been invited to interview for the <strong>${eventData.jobTitle}</strong> position.</p>
      </div>

      <div style="background: #fff; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h3 style="color: #2c3e50; margin: 0 0 15px 0;">Interview Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6c757d; font-weight: bold;">Date & Time:</td>
            <td style="padding: 8px 0; color: #495057;">${new Date(eventData.startDateTime).toLocaleString('en-US', {
              weekday: 'long',
              year: 'numeric', 
              month: 'long',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              timeZoneName: 'short'
            })}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6c757d; font-weight: bold;">Duration:</td>
            <td style="padding: 8px 0; color: #495057;">${eventData.duration} minutes</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6c757d; font-weight: bold;">Format:</td>
            <td style="padding: 8px 0; color: #495057;">${formatType} Interview</td>
          </tr>
          ${eventData.location ? `
          <tr>
            <td style="padding: 8px 0; color: #6c757d; font-weight: bold;">Location:</td>
            <td style="padding: 8px 0; color: #495057;">${eventData.location}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      ${meetingInstructions ? `
      <div style="background: #e8f4fd; border: 1px solid #bee5eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        ${meetingInstructions}
      </div>
      ` : ''}

      ${eventData.agenda ? `
      <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h4 style="color: #2c3e50; margin: 0 0 10px 0;">Interview Agenda</h4>
        <p style="color: #495057; margin: 0; white-space: pre-wrap;">${eventData.agenda}</p>
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
          <strong>Important:</strong> Please respond by ${new Date(interviewToken.expiresAt).toLocaleDateString()} to confirm your interview.
        </p>
      </div>

      ${eventData.notes ? `
      <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h4 style="color: #856404; margin: 0 0 10px 0;">Additional Notes</h4>
        <p style="color: #856404; margin: 0; white-space: pre-wrap;">${eventData.notes}</p>
      </div>
      ` : ''}

      <div style="border-top: 1px solid #e9ecef; padding-top: 20px; margin-top: 20px;">
        <p style="color: #6c757d; font-size: 14px; margin: 0;">
          We look forward to speaking with you! If you have any questions, please don't hesitate to reach out.
        </p>
      </div>
    </div>
  `;

  const text = `
Interview Invitation: ${eventData.jobTitle} Position

You've been invited to interview for the ${eventData.jobTitle} position.

Interview Details:
- Date & Time: ${new Date(eventData.startDateTime).toLocaleString()}
- Duration: ${eventData.duration} minutes
- Format: ${formatType} Interview
${eventData.location ? `- Location: ${eventData.location}` : ''}
${meetingLink ? `- Meeting Link: ${meetingLink}` : ''}

${eventData.agenda ? `Interview Agenda:\n${eventData.agenda}\n\n` : ''}

ACTION REQUIRED:
Please respond to this interview invitation:

Accept Interview: ${acceptUrl}
Request Reschedule: ${rescheduleUrl}

Please respond by ${new Date(interviewToken.expiresAt).toLocaleDateString()} to confirm your interview.

${eventData.notes ? `\nAdditional Notes:\n${eventData.notes}\n\n` : ''}

We look forward to speaking with you!
  `;

  return await emailService.sendEmail({
    to: eventData.candidateEmail,
    subject,
    html,
    text
  });
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      applicationId,
      selectedTimeSlot,
      interviewData,
      sendEmailNotification = true
    } = await request.json();

    if (!applicationId || !selectedTimeSlot || !interviewData) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get user's calendar integration info
    const user = await appPrisma.users.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        calendar_integration_enabled: true,
        google_access_token: true,
        google_refresh_token: true,
        google_token_expires_at: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    if (!user?.calendar_integration_enabled || !user.google_access_token) {
      return NextResponse.json(
        { error: "Google Calendar not connected. Please connect your calendar in settings." },
        { status: 400 }
      );
    }

    // Get application details
    const application = await appPrisma.applications.findUnique({
      where: { id: applicationId },
      include: {
        jobs: {
          select: {
            title: true,
          }
        }
      }
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Setup Google Calendar client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: user.google_access_token,
      refresh_token: user.google_refresh_token,
    });

    // Refresh token if needed
    await refreshTokenIfNeeded(oauth2Client, user);

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Create start and end date times
    const startDateTime = new Date(`${selectedTimeSlot.date}T${selectedTimeSlot.time}`);
    const endDateTime = new Date(startDateTime.getTime() + (interviewData.duration * 60 * 1000));

    // Ensure current user is included in interviewers list as the creator
    const currentUserAsInterviewer = {
      name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
      email: user.email,
      isCreator: true, // Mark this person as the creator
      userId: user.id
    };
    
    // Filter out any existing entry for current user and add them as creator
    const filteredInterviewers = interviewData.interviewers.filter(i => 
      i.name && i.email && i.email !== user.email
    );
    
    // Prepare event data
    const eventData = {
      applicationId,
      candidateName: application.name,
      candidateEmail: application.email,
      jobTitle: application.job?.title || 'Position',
      type: interviewData.type,
      duration: interviewData.duration,
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime.toISOString(),
      timezone: interviewData.timezone,
      interviewers: [currentUserAsInterviewer, ...filteredInterviewers],
      location: interviewData.location,
      agenda: interviewData.agenda,
      notes: interviewData.notes,
    };

    // Generate tokens for interview responses
    const rescheduleToken = crypto.randomBytes(32).toString('hex');
    const acceptanceToken = crypto.randomBytes(32).toString('hex');
    
    // Set token expiration (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create calendar hold event
    const tokens = { rescheduleToken, acceptanceToken };
    const calendarEvent = await createCalendarHoldEvent(calendar, eventData, tokens);

    // Create InterviewToken record
    const interviewToken = await appPrisma.interview_tokens.create({
      data: {
        application_id: applicationId,
        reschedule_token: rescheduleToken,
        acceptance_token: acceptanceToken,
        scheduled_at: startDateTime,
        duration: interviewData.duration,
        type: interviewData.type,
        interviewers: eventData.interviewers,
        location: interviewData.location,
        agenda: interviewData.agenda,
        notes: interviewData.notes,
        calendar_event_id: calendarEvent.id,
        meeting_link: interviewData.meetingProvider === 'google' 
          ? calendarEvent.conferenceData?.entryPoints?.[0]?.uri || null
          : interviewData.meetingLink || null,
        meeting_provider: interviewData.meetingProvider || 'google',
        expires_at: expiresAt,
        // If no email is being sent, automatically mark as accepted since hiring manager is handling manually
        status: sendEmailNotification ? 'pending' : 'accepted',
        responded_at: sendEmailNotification ? null : new Date(),
      },
    });

    // Add application note
    await appPrisma.application_notes.create({
      data: {
        application_id: applicationId,
        content: sendEmailNotification 
          ? `Interview scheduled for ${new Date(startDateTime).toLocaleString()} (${interviewData.type} interview, ${interviewData.duration} minutes) - Invitation sent to candidate`
          : `Interview scheduled for ${new Date(startDateTime).toLocaleString()} (${interviewData.type} interview, ${interviewData.duration} minutes) - Manual confirmation (no email sent)`,
        type: "interview_scheduled",
        author_id: session.user.id,
        author_name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
        metadata: {
          calendarEventId: calendarEvent.id,
          interviewType: interviewData.type,
          duration: interviewData.duration,
          interviewers: eventData.interviewers,
          meetingLink: calendarEvent.conferenceData?.entryPoints?.[0]?.uri,
          rescheduleToken,
          acceptanceToken,
        },
        is_system_generated: false,
      },
    });

    // Send interview invitation email to candidate (if requested)
    if (sendEmailNotification) {
      try {
        await sendInterviewInvitationEmail(eventData, tokens, interviewToken, calendarEvent);
      } catch (emailError) {
        console.error("Failed to send interview invitation email:", emailError);
        // Don't fail the whole process if email fails
      }
    }

    // Update application status to "Interview" if not already
    if (application.status !== 'Interview') {
      await appPrisma.applications.update({
        where: { id: applicationId },
        data: { status: 'Interview' }
      });
    }

    return NextResponse.json({
      success: true,
      message: sendEmailNotification 
        ? "Interview scheduled successfully and invitation sent to candidate"
        : "Interview scheduled successfully (no email sent)",
      calendarEvent: {
        id: calendarEvent.id,
        htmlLink: calendarEvent.htmlLink,
        meetingLink: calendarEvent.conferenceData?.entryPoints?.[0]?.uri,
        startTime: calendarEvent.start.dateTime,
        endTime: calendarEvent.end.dateTime,
      },
      tokens: {
        interviewTokenId: interviewToken.id,
        rescheduleToken,
        acceptanceToken,
        expiresAt: expiresAt.toISOString(),
      }
    });

  } catch (error) {
    console.error("Error scheduling interview:", error);
    
    // Check if it's an authentication error
    if (error.code === 401 || error.message?.includes('invalid_grant')) {
      return NextResponse.json(
        { error: "Calendar access expired. Please reconnect your Google Calendar in settings." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to schedule interview", details: error.message },
      { status: 500 }
    );
  }
}