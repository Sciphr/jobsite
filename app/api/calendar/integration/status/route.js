// app/api/calendar/integration/status/route.js
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
      
      return { 
        success: true, 
        accessToken: credentials.access_token,
        expiresAt: expiresAt
      };
    } catch (error) {
      console.error("Failed to refresh token:", error);
      return { success: false, error };
    }
  }
  
  return { success: true, accessToken: user.googleAccessToken };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        calendarIntegrationEnabled: true,
        googleEmail: true,
        googleCalendarId: true,
        calendarIntegrationConnectedAt: true,
        calendarTimezone: true,
        googleTokenExpiresAt: true,
        googleAccessToken: true,
        googleRefreshToken: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let isConnected = false;
    let tokenValid = false;
    let updatedExpiresAt = user.googleTokenExpiresAt;

    if (user.calendarIntegrationEnabled && user.googleAccessToken && user.googleTokenExpiresAt) {
      // Check if we need to refresh the token
      if (user.googleRefreshToken) {
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET
        );

        oauth2Client.setCredentials({
          access_token: user.googleAccessToken,
          refresh_token: user.googleRefreshToken,
        });

        const refreshResult = await refreshTokenIfNeeded(oauth2Client, user);
        
        if (refreshResult.success) {
          tokenValid = true;
          isConnected = true;
          if (refreshResult.expiresAt) {
            updatedExpiresAt = refreshResult.expiresAt;
          }
        } else {
          // Refresh failed, disable integration
          await prisma.user.update({
            where: { id: user.id },
            data: {
              calendarIntegrationEnabled: false,
              googleAccessToken: null,
              googleRefreshToken: null,
              googleTokenExpiresAt: null,
            },
          });
          isConnected = false;
          tokenValid = false;
        }
      } else {
        // No refresh token, check if current token is still valid
        tokenValid = new Date(user.googleTokenExpiresAt) > new Date();
        isConnected = tokenValid;
      }
    }

    return NextResponse.json({
      connected: isConnected,
      googleEmail: user.googleEmail,
      calendarId: user.googleCalendarId,
      connectedAt: user.calendarIntegrationConnectedAt,
      timezone: user.calendarTimezone,
      tokenValid: tokenValid,
      tokenExpiresAt: updatedExpiresAt,
    });
  } catch (error) {
    console.error("Error checking calendar integration status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}