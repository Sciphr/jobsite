import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PrismaClient } from "@/app/generated/prisma";

const prisma = new PrismaClient();

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

  await prisma.user.update({
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

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        microsoftAccessToken: true,
        microsoftRefreshToken: true,
        microsoftTokenExpiresAt: true,
        microsoftIntegrationEnabled: true,
        microsoftEmail: true,
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

    // Use Microsoft Graph Calendar API to get free/busy information
    const startDateTime = new Date(startTime).toISOString();
    const endDateTime = new Date(endTime).toISOString();

    const busyTimesResponse = await fetch('https://graph.microsoft.com/v1.0/me/calendar/getSchedule', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        schedules: [user.microsoftEmail],
        startTime: {
          dateTime: startDateTime,
          timeZone: 'UTC'
        },
        endTime: {
          dateTime: endDateTime,
          timeZone: 'UTC'
        },
        availabilityViewInterval: 15
      }),
    });

    if (!busyTimesResponse.ok) {
      const errorText = await busyTimesResponse.text();
      console.error("Microsoft Graph getSchedule API error:", errorText);
      return NextResponse.json({ error: "Failed to fetch busy times" }, { status: 400 });
    }

    const busyTimesData = await busyTimesResponse.json();

    // Transform Microsoft busy times to match expected format
    const busyTimes = [];
    
    if (busyTimesData.value && busyTimesData.value[0]) {
      const schedule = busyTimesData.value[0];
      
      if (schedule.busyViewData) {
        // Convert busy view data to time ranges
        schedule.busyViewData.forEach((busyValue, index) => {
          if (busyValue !== '0') { // 0 = free, 1 = tentative, 2 = busy, 3 = oof, 4 = working elsewhere
            const intervalStart = new Date(startTime);
            intervalStart.setMinutes(intervalStart.getMinutes() + (index * 15));
            
            const intervalEnd = new Date(intervalStart);
            intervalEnd.setMinutes(intervalEnd.getMinutes() + 15);
            
            busyTimes.push({
              start: intervalStart.toISOString(),
              end: intervalEnd.toISOString(),
            });
          }
        });
      }

      // Also include explicit busy times from freeBusyViewData
      if (schedule.freeBusyViewData) {
        schedule.freeBusyViewData.forEach((item, index) => {
          if (item.status === 'busy' || item.status === 'tentative' || item.status === 'oof') {
            const intervalStart = new Date(startTime);
            intervalStart.setMinutes(intervalStart.getMinutes() + (index * 15));
            
            const intervalEnd = new Date(intervalStart);
            intervalEnd.setMinutes(intervalEnd.getMinutes() + 15);
            
            busyTimes.push({
              start: intervalStart.toISOString(),
              end: intervalEnd.toISOString(),
            });
          }
        });
      }
    }

    return NextResponse.json({ busyTimes });

  } catch (error) {
    console.error("Error fetching Microsoft busy times:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}