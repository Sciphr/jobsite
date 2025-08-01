// app/api/calendar/integration/disconnect/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PrismaClient } from "@/app/generated/prisma";
import { google } from "googleapis";

const prisma = new PrismaClient();

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: {
        google_access_token: true,
        google_refresh_token: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Try to revoke the Google token if it exists
    if (user.google_access_token) {
      try {
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET
        );
        
        oauth2Client.setCredentials({
          access_token: user.google_access_token,
          refresh_token: user.google_refresh_token,
        });

        await oauth2Client.revokeCredentials();
      } catch (revokeError) {
        console.warn("Failed to revoke Google token:", revokeError);
        // Continue with disconnect even if revoke fails
      }
    }

    // Clear calendar integration data from database
    await prisma.users.update({
      where: { id: session.user.id },
      data: {
        google_access_token: null,
        google_refresh_token: null,
        google_token_expires_at: null,
        google_email: null,
        calendar_integration_enabled: false,
        calendar_integration_connected_at: null,
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Google Calendar disconnected successfully" 
    });
  } catch (error) {
    console.error("Error disconnecting Google Calendar:", error);
    return NextResponse.json(
      { error: "Failed to disconnect Google Calendar" },
      { status: 500 }
    );
  }
}