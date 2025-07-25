// app/api/calendar/interview/schedule/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PrismaClient } from "@/app/generated/prisma";
import { google } from "googleapis";
import crypto from "crypto";

const prisma = new PrismaClient();

async function refreshTokenIfNeeded(oauth2Client, user) {
  const now = new Date();
  const tokenExpiresAt = new Date(user.googleTokenExpiresAt);
  
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
      
      await prisma.user.update({
        where: { id: user.id },
        data: {
          googleAccessToken: credentials.access_token,
          googleTokenExpiresAt: expiresAt,
          ...(credentials.refresh_token && { googleRefreshToken: credentials.refresh_token }),
        },
      });
      
      return credentials.access_token;
    } catch (error) {
      console.error("Failed to refresh token:", error);
      throw new Error("Token refresh failed");
    }
  }
  
  return user.googleAccessToken;
}

async function createCalendarEvent(calendar, eventData, tokens) {
  const formatType = eventData.type.charAt(0).toUpperCase() + eventData.type.slice(1);
  
  let locationInfo = '';
  let meetingInstructions = '';
  
  if (eventData.type === 'video') {
    meetingInstructions = `
Meeting Instructions:
- This is a video interview conducted via Google Meet
- A Google Meet link will be automatically generated and included in this calendar event
- Please ensure you have a stable internet connection and test your camera/microphone beforehand
- Join the meeting a few minutes early to resolve any technical issues`;
  } else if (eventData.type === 'phone') {
    meetingInstructions = `
Meeting Instructions:
- This is a phone interview
- The interviewer will call you at your provided phone number
- Please ensure you're in a quiet location with good phone reception
- Have a copy of your resume and the job description handy`;
  } else if (eventData.type === 'in-person') {
    locationInfo = eventData.location ? `\nLocation: ${eventData.location}` : '';
    meetingInstructions = `
Meeting Instructions:
- This is an in-person interview${locationInfo}
- Please arrive 10-15 minutes early
- Bring copies of your resume and any requested documents
- Dress professionally and be prepared for a full interview experience`;
  }

  // Add custom response URLs to description
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const acceptUrl = `${baseUrl}/interview/accept/${tokens.acceptanceToken}`;
  const rescheduleUrl = `${baseUrl}/interview/reschedule/${tokens.rescheduleToken}`;

  const event = {
    summary: `${formatType} Interview: ${eventData.candidateName} - ${eventData.jobTitle}`,
    description: `
🔔 IMPORTANT: Please use the links below to respond to this interview invitation 🔔

📅 CONFIRM ATTENDANCE: ${acceptUrl}
🔄 RESCHEDULE REQUEST: ${rescheduleUrl}

═══════════════════════════════════════════════════════

Interview Details:
- Candidate: ${eventData.candidateName} (${eventData.candidateEmail})
- Position: ${eventData.jobTitle}
- Interview Format: ${formatType} Interview
- Duration: ${eventData.duration} minutes
${meetingInstructions}

${eventData.agenda ? `\nInterview Agenda:\n${eventData.agenda}\n` : ''}
${eventData.notes ? `\nAdditional Notes:\n${eventData.notes}\n` : ''}

═══════════════════════════════════════════════════════

⚠️ PLEASE NOTE: Do not use the default Yes/No/Maybe buttons below. 
Instead, click the links above to properly confirm or reschedule your interview.

We look forward to speaking with you!
    `.trim(),
    start: {
      dateTime: eventData.startDateTime,
      timeZone: eventData.timezone || 'America/Toronto',
    },
    end: {
      dateTime: eventData.endDateTime,
      timeZone: eventData.timezone || 'America/Toronto',
    },
    attendees: [
      { 
        email: eventData.candidateEmail, 
        displayName: eventData.candidateName,
        responseStatus: 'needsAction' // This will show as pending
      },
      ...eventData.interviewers.map(interviewer => ({
        email: interviewer.email,
        displayName: interviewer.name,
        responseStatus: 'accepted' // Interviewers are automatically accepted
      }))
    ],
    conferenceData: eventData.type === 'video' ? {
      createRequest: {
        requestId: `interview-${eventData.applicationId}-${Date.now()}`,
        conferenceSolutionKey: {
          type: 'hangoutsMeet'
        }
      }
    } : undefined,
    location: eventData.type === 'in-person' ? eventData.location : undefined,
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 }, // 24 hours
        { method: 'email', minutes: 60 },      // 1 hour
        { method: 'popup', minutes: 30 },      // 30 minutes
      ],
    },
  };

  const response = await calendar.events.insert({
    calendarId: 'primary',
    resource: event,
    conferenceDataVersion: eventData.type === 'video' ? 1 : 0,
    sendUpdates: 'all', // Send email invitations to all attendees
  });

  return response.data;
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
      interviewData
    } = await request.json();

    if (!applicationId || !selectedTimeSlot || !interviewData) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get user's calendar integration info
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        calendarIntegrationEnabled: true,
        googleAccessToken: true,
        googleRefreshToken: true,
        googleTokenExpiresAt: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    if (!user?.calendarIntegrationEnabled || !user.googleAccessToken) {
      return NextResponse.json(
        { error: "Google Calendar not connected. Please connect your calendar in settings." },
        { status: 400 }
      );
    }

    // Get application details
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: {
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
      access_token: user.googleAccessToken,
      refresh_token: user.googleRefreshToken,
    });

    // Refresh token if needed
    await refreshTokenIfNeeded(oauth2Client, user);

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Create start and end date times
    const startDateTime = new Date(`${selectedTimeSlot.date}T${selectedTimeSlot.time}`);
    const endDateTime = new Date(startDateTime.getTime() + (interviewData.duration * 60 * 1000));

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
      interviewers: interviewData.interviewers.filter(i => i.name && i.email),
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

    // Create calendar event with tokens
    const tokens = { rescheduleToken, acceptanceToken };
    const calendarEvent = await createCalendarEvent(calendar, eventData, tokens);

    // Create InterviewToken record
    const interviewToken = await prisma.interviewToken.create({
      data: {
        applicationId: applicationId,
        rescheduleToken,
        acceptanceToken,
        scheduledAt: startDateTime,
        duration: interviewData.duration,
        type: interviewData.type,
        interviewers: eventData.interviewers,
        location: interviewData.location,
        agenda: interviewData.agenda,
        notes: interviewData.notes,
        calendarEventId: calendarEvent.id,
        expiresAt,
      },
    });

    // Add application note
    await prisma.applicationNote.create({
      data: {
        applicationId: applicationId,
        content: `Interview scheduled for ${new Date(startDateTime).toLocaleString()} (${interviewData.type} interview, ${interviewData.duration} minutes)`,
        type: "interview_scheduled",
        authorId: session.user.id,
        authorName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
        metadata: {
          calendarEventId: calendarEvent.id,
          interviewType: interviewData.type,
          duration: interviewData.duration,
          interviewers: eventData.interviewers,
          meetingLink: calendarEvent.conferenceData?.entryPoints?.[0]?.uri,
          rescheduleToken,
          acceptanceToken,
        },
        isSystemGenerated: false,
      },
    });

    // Update application status to "Interview" if not already
    if (application.status !== 'Interview') {
      await prisma.application.update({
        where: { id: applicationId },
        data: { status: 'Interview' }
      });
    }

    return NextResponse.json({
      success: true,
      message: "Interview scheduled successfully",
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