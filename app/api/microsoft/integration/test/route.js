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
  
  // Calculate new expiration
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expires_in);

  // Update user with new tokens
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
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    // Get user's Microsoft integration data
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        microsoftAccessToken: true,
        microsoftRefreshToken: true,
        microsoftTokenExpiresAt: true,
        microsoftIntegrationEnabled: true,
      },
    });

    if (!user?.microsoftIntegrationEnabled) {
      return NextResponse.json(
        { message: "Microsoft integration not enabled" },
        { status: 400 }
      );
    }

    let accessToken = user.microsoftAccessToken;

    // Check if token needs refresh
    if (!accessToken || new Date(user.microsoftTokenExpiresAt) <= new Date()) {
      try {
        accessToken = await refreshMicrosoftToken(user);
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);
        return NextResponse.json(
          { message: "Microsoft token expired and refresh failed. Please reconnect." },
          { status: 401 }
        );
      }
    }

    // Test calendar access
    const calendarResponse = await fetch('https://graph.microsoft.com/v1.0/me/calendars', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!calendarResponse.ok) {
      const errorText = await calendarResponse.text();
      console.error("Microsoft calendar test failed:", errorText);
      return NextResponse.json(
        { message: "Failed to access Microsoft calendars" },
        { status: 400 }
      );
    }

    const calendars = await calendarResponse.json();

    // Test Teams access by checking if we can create an online meeting
    const teamsTestResponse = await fetch('https://graph.microsoft.com/v1.0/me/onlineMeetings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subject: 'Test Meeting - Connection Verification',
        startDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        endDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(), // Tomorrow + 30 min
      }),
    });

    let teamsAccessible = false;
    if (teamsTestResponse.ok) {
      // Delete the test meeting immediately
      const testMeeting = await teamsTestResponse.json();
      if (testMeeting.id) {
        await fetch(`https://graph.microsoft.com/v1.0/me/onlineMeetings/${testMeeting.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
      }
      teamsAccessible = true;
    }

    return NextResponse.json({
      success: true,
      calendarCount: calendars.value?.length || 0,
      teamsAccessible,
      message: "Microsoft integration test successful",
    });

  } catch (error) {
    console.error("Error testing Microsoft integration:", error);
    return NextResponse.json(
      { message: "Failed to test Microsoft integration" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}