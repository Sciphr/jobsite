// app/api/calendar/integration/callback/route.js
import { NextResponse } from "next/server";
import { google } from "googleapis";
import { PrismaClient } from "@/app/generated/prisma";

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // This should be the user ID
    const error = searchParams.get('error');

    if (error) {
      console.error("Google OAuth error:", error);
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/admin/settings?calendar_error=access_denied`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/admin/settings?calendar_error=invalid_request`
      );
    }

    // Verify user exists
    const user = await prisma.users.findUnique({
      where: { id: state },
    });

    if (!user) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/admin/settings?calendar_error=user_not_found`
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/calendar/integration/callback`
    );

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user's Google account info
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    // Calculate token expiration
    const expiresAt = new Date();
    if (tokens.expiry_date) {
      expiresAt.setTime(tokens.expiry_date);
    } else {
      // Default to 1 hour if not provided
      expiresAt.setHours(expiresAt.getHours() + 1);
    }

    // Save tokens to database
    await prisma.users.update({
      where: { id: state },
      data: {
        google_access_token: tokens.access_token,
        google_refresh_token: tokens.refresh_token,
        google_token_expires_at: expiresAt,
        google_email: userInfo.email,
        calendar_integration_enabled: true,
        calendar_integration_connected_at: new Date(),
      },
    });

    // Redirect back to settings with success
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/admin/settings?calendar_success=connected&refresh_session=true`
    );
  } catch (error) {
    console.error("Error in Google Calendar OAuth callback:", error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/admin/settings?calendar_error=connection_failed`
    );
  }
}