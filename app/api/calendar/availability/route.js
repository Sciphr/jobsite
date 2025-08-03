// app/api/calendar/availability/route.js
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

    const { timeSlots, duration, timezone } = await request.json();

    if (!timeSlots || !Array.isArray(timeSlots) || timeSlots.length === 0) {
      return NextResponse.json(
        { error: "Time slots are required" },
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

    // Check availability for each time slot
    const availabilityResults = await Promise.all(
      timeSlots.map(async (slot) => {
        try {
          const startDateTime = new Date(`${slot.date}T${slot.time}`);
          const endDateTime = new Date(startDateTime.getTime() + ((duration || 45) * 60 * 1000));

          // Use freebusy query to check availability
          const freeBusyResponse = await calendar.freebusy.query({
            resource: {
              timeMin: startDateTime.toISOString(),
              timeMax: endDateTime.toISOString(),
              timeZone: timezone || 'America/Toronto',
              items: [{ id: 'primary' }]
            }
          });

          const busyTimes = freeBusyResponse.data.calendars?.primary?.busy || [];
          const isAvailable = busyTimes.length === 0;

          return {
            id: slot.id,
            date: slot.date,
            time: slot.time,
            available: isAvailable,
            conflicts: busyTimes.map(busy => ({
              start: busy.start,
              end: busy.end
            }))
          };
        } catch (error) {
          console.error(`Error checking availability for slot ${slot.id}:`, error);
          return {
            id: slot.id,
            date: slot.date,
            time: slot.time,
            available: false,
            error: error.message
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      availability: availabilityResults
    });

  } catch (error) {
    console.error("Error checking calendar availability:", error);
    
    // Check if it's an authentication error
    if (error.code === 401 || error.message?.includes('invalid_grant')) {
      return NextResponse.json(
        { error: "Calendar access expired. Please reconnect your Google Calendar in settings." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to check availability", details: error.message },
      { status: 500 }
    );
  }
}