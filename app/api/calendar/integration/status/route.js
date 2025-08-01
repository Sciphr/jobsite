// app/api/calendar/integration/status/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PrismaClient } from "@/app/generated/prisma";
import { google } from "googleapis";

const prisma = new PrismaClient();

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
      
      await prisma.users.update({
        where: { id: user.id },
        data: {
          google_access_token: credentials.access_token,
          google_token_expires_at: expiresAt,
          ...(credentials.refresh_token && { google_refresh_token: credentials.refresh_token }),
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
  
  return { success: true, accessToken: user.google_access_token };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        calendar_integration_enabled: true,
        google_email: true,
        google_calendar_id: true,
        calendar_integration_connected_at: true,
        calendar_timezone: true,
        google_token_expires_at: true,
        google_access_token: true,
        google_refresh_token: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let isConnected = false;
    let tokenValid = false;
    let updatedExpiresAt = user.google_token_expires_at;

    if (user.calendar_integration_enabled && user.google_access_token && user.google_token_expires_at) {
      // Check if we need to refresh the token
      if (user.google_refresh_token) {
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET
        );

        oauth2Client.setCredentials({
          access_token: user.google_access_token,
          refresh_token: user.google_refresh_token,
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
          await prisma.users.update({
            where: { id: user.id },
            data: {
              calendar_integration_enabled: false,
              google_access_token: null,
              google_refresh_token: null,
              google_token_expires_at: null,
            },
          });
          isConnected = false;
          tokenValid = false;
        }
      } else {
        // No refresh token, check if current token is still valid
        tokenValid = new Date(user.google_token_expires_at) > new Date();
        isConnected = tokenValid;
      }
    }

    return NextResponse.json({
      connected: isConnected,
      googleEmail: user.google_email,
      calendarId: user.google_calendar_id,
      connectedAt: user.calendar_integration_connected_at,
      timezone: user.calendar_timezone,
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