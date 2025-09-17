import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/app/lib/db";

async function refreshMicrosoftToken(user) {
  if (!user.microsoftRefreshToken) {
    throw new Error("No refresh token available");
  }

  const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: user.microsoftRefreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh Microsoft token");
  }

  const tokens = await response.json();
  
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expires_in);

  await db.user.update({
    where: { id: user.id },
    data: {
      microsoftAccessToken: tokens.access_token,
      microsoftRefreshToken: tokens.refresh_token || user.microsoftRefreshToken,
      microsoftTokenExpiresAt: expiresAt,
    },
  });

  return tokens.access_token;
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { startTime, endTime } = await request.json();

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        microsoftAccessToken: true,
        microsoftRefreshToken: true,
        microsoftTokenExpiresAt: true,
        microsoftIntegrationEnabled: true,
      },
    });

    if (!user?.microsoftIntegrationEnabled) {
      return NextResponse.json({ error: "Microsoft integration not enabled" }, { status: 400 });
    }

    let accessToken = user.microsoftAccessToken;

    // Check if token needs refresh
    if (!accessToken || new Date(user.microsoftTokenExpiresAt) <= new Date()) {
      try {
        accessToken = await refreshMicrosoftToken(user);
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);
        return NextResponse.json({ error: "Microsoft token expired and refresh failed" }, { status: 401 });
      }
    }

    // Get calendar events from Microsoft Graph
    const startDateTime = new Date(startTime).toISOString();
    const endDateTime = new Date(endTime).toISOString();

    const eventsResponse = await fetch(`https://graph.microsoft.com/v1.0/me/calendar/events?$filter=start/dateTime ge '${startDateTime}' and end/dateTime le '${endDateTime}'&$select=subject,start,end,showAs,isCancelled`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!eventsResponse.ok) {
      const errorText = await eventsResponse.text();
      console.error("Microsoft Graph API error:", errorText);
      return NextResponse.json({ error: "Failed to fetch calendar events" }, { status: 400 });
    }

    const eventsData = await eventsResponse.json();

    // Transform Microsoft events to match expected format
    const events = eventsData.value
      .filter(event => !event.isCancelled)
      .map(event => ({
        id: event.id,
        summary: event.subject,
        start: {
          dateTime: event.start.dateTime,
          timeZone: event.start.timeZone
        },
        end: {
          dateTime: event.end.dateTime,  
          timeZone: event.end.timeZone
        },
        status: event.showAs || 'busy'
      }));

    return NextResponse.json({ items: events });

  } catch (error) {
    console.error("Error fetching Microsoft calendar events:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}