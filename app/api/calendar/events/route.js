// app/api/calendar/events/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { appPrisma } from "@/app/lib/prisma";
import { google } from "googleapis";

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

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { startTime, endTime, timezone } = await request.json();

    if (!startTime || !endTime) {
      return NextResponse.json(
        { error: "Start time and end time are required" },
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
      },
    });

    if (!user?.calendar_integration_enabled || !user.google_access_token) {
      return NextResponse.json(
        { error: "Google Calendar not connected" },
        { status: 400 }
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

    // Get calendar events for the specified time range
    const eventsResponse = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startTime,
      timeMax: endTime,
      maxResults: 500,
      singleEvents: true,
      orderBy: 'startTime',
      timeZone: timezone || 'America/Toronto'
    });

    const events = eventsResponse.data.items || [];

    // Process and group events by date
    const eventsByDate = {};
    
    events.forEach(event => {
      if (!event.start) return;
      
      // Get event start date
      const eventStart = event.start.dateTime || event.start.date;
      const eventDate = new Date(eventStart).toDateString();
      
      if (!eventsByDate[eventDate]) {
        eventsByDate[eventDate] = [];
      }
      
      // Process event
      const processedEvent = {
        id: event.id,
        summary: event.summary || 'Untitled Event',
        start: event.start,
        end: event.end,
        isAllDay: !!event.start.date, // All-day events have .date instead of .dateTime
        location: event.location,
        description: event.description,
        attendees: event.attendees?.map(attendee => ({
          email: attendee.email,
          displayName: attendee.displayName,
          responseStatus: attendee.responseStatus
        })),
        status: event.status,
        transparency: event.transparency, // 'transparent' for free time, 'opaque' for busy
      };
      
      eventsByDate[eventDate].push(processedEvent);
    });

    // Sort events within each date by start time
    Object.keys(eventsByDate).forEach(date => {
      eventsByDate[date].sort((a, b) => {
        const timeA = a.start.dateTime || a.start.date;
        const timeB = b.start.dateTime || b.start.date;
        return new Date(timeA) - new Date(timeB);
      });
    });

    return NextResponse.json({
      success: true,
      events: eventsByDate,
      totalEvents: events.length,
      timeRange: {
        start: startTime,
        end: endTime,
        timezone: timezone || 'America/Toronto'
      }
    });

  } catch (error) {
    console.error("Error fetching calendar events:", error);
    
    // Check if it's an authentication error
    if (error.code === 401 || error.message?.includes('invalid_grant')) {
      return NextResponse.json(
        { error: "Calendar access expired. Please reconnect your Google Calendar in settings." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch calendar events", details: error.message },
      { status: 500 }
    );
  }
}