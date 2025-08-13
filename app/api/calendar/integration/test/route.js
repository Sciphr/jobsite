// app/api/calendar/integration/test/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PrismaClient } from "@/app/generated/prisma";
import { google } from "googleapis";

async function refreshTokenIfNeeded(oauth2Client, user, prisma) {
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
      
      await prisma.users.update({
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

export async function POST() {
  const prisma = new PrismaClient();
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        google_access_token: true,
        google_refresh_token: true,
        google_token_expires_at: true,
        calendar_integration_enabled: true,
      },
    });

    if (!user || !user.calendar_integration_enabled || !user.google_access_token) {
      return NextResponse.json(
        { error: "Google Calendar not connected" },
        { status: 400 }
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: user.google_access_token,
      refresh_token: user.google_refresh_token,
    });

    // Refresh token if needed and get the current access token
    const currentToken = await refreshTokenIfNeeded(oauth2Client, user, prisma);
    
    // Make sure we're using the current token
    oauth2Client.setCredentials({
      access_token: currentToken,
      refresh_token: user.google_refresh_token,
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Test calendar access by listing calendars
    const response = await calendar.calendarList.list();
    const calendars = response.data.items || [];

    return NextResponse.json({
      success: true,
      calendarCount: calendars.length,
      calendars: calendars.map(cal => ({
        id: cal.id,
        summary: cal.summary,
        primary: cal.primary,
      })),
    });
  } catch (error) {
    console.error("Error testing calendar access:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      status: error.status,
      response: error.response?.data
    });
    
    // Check if it's an authentication error
    if (error.code === 401 || error.message?.includes('invalid_grant')) {
      // Token is invalid, disconnect the integration
      await prisma.users.update({
        where: { id: session.user.id },
        data: {
          calendar_integration_enabled: false,
          google_access_token: null,
          google_refresh_token: null,
          google_token_expires_at: null,
        },
      });
      
      return NextResponse.json(
        { error: "Calendar access expired. Please reconnect your Google Calendar." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to access Google Calendar" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}