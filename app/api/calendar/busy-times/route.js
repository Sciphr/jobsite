// app/api/calendar/busy-times/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PrismaClient } from "@/app/generated/prisma";
import { google } from "googleapis";

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
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        calendarIntegrationEnabled: true,
        googleAccessToken: true,
        googleRefreshToken: true,
        googleTokenExpiresAt: true,
      },
    });

    if (!user?.calendarIntegrationEnabled || !user.googleAccessToken) {
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
      access_token: user.googleAccessToken,
      refresh_token: user.googleRefreshToken,
    });

    // Refresh token if needed
    await refreshTokenIfNeeded(oauth2Client, user);

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Use freebusy query to get busy times
    const freeBusyResponse = await calendar.freebusy.query({
      resource: {
        timeMin: startTime,
        timeMax: endTime,
        timeZone: timezone || 'America/Toronto',
        items: [{ id: 'primary' }]
      }
    });

    const busyTimes = freeBusyResponse.data.calendars?.primary?.busy || [];

    return NextResponse.json({
      success: true,
      busyTimes,
      timeRange: {
        start: startTime,
        end: endTime,
        timezone: timezone || 'America/Toronto'
      }
    });

  } catch (error) {
    console.error("Error fetching busy times:", error);
    
    // Check if it's an authentication error
    if (error.code === 401 || error.message?.includes('invalid_grant')) {
      return NextResponse.json(
        { error: "Calendar access expired. Please reconnect your Google Calendar in settings." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch calendar data", details: error.message },
      { status: 500 }
    );
  }
}