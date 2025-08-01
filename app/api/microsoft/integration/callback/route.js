import { NextResponse } from "next/server";
import { PrismaClient } from "@/app/generated/prisma";

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // This should be the user ID
    const error = searchParams.get('error');

    // Get the correct base URL for redirects
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (error) {
      console.error("Microsoft OAuth error:", error);
      return NextResponse.redirect(
        new URL(`/admin/settings?microsoft_error=${error}`, baseUrl)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/admin/settings?microsoft_error=invalid_request', baseUrl)
      );
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.MICROSOFT_REDIRECT_URI,
        scope: 'https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/OnlineMeetings.ReadWrite https://graph.microsoft.com/User.Read offline_access',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Microsoft token exchange failed:", errorData);
      return NextResponse.redirect(
        new URL('/admin/settings?microsoft_error=connection_failed', baseUrl)
      );
    }

    const tokens = await tokenResponse.json();

    // Get user info from Microsoft Graph
    const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    });

    if (!userResponse.ok) {
      console.error("Failed to get Microsoft user info");
      return NextResponse.redirect(
        new URL('/admin/settings?microsoft_error=connection_failed', baseUrl)
      );
    }

    const microsoftUser = await userResponse.json();

    // Calculate token expiration
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expires_in);

    // Update user with Microsoft integration data
    try {
      await prisma.users.update({
        where: { id: state },
        data: {
          microsoft_access_token: tokens.access_token,
          microsoft_refresh_token: tokens.refresh_token,
          microsoft_token_expires_at: expiresAt,
          microsoft_user_id: microsoftUser.id,
          microsoft_email: microsoftUser.mail || microsoftUser.userPrincipalName,
          microsoft_tenant_id: microsoftUser.tenant || 'common',
          microsoft_integration_enabled: true,
          microsoft_integration_connected_at: new Date(),
        },
      });

      // Add session refresh trigger to URL to force NextAuth to refresh the session
      return NextResponse.redirect(
        new URL('/admin/settings?microsoft_success=connected&refresh_session=true', baseUrl)
      );
    } catch (dbError) {
      console.error("Database error during Microsoft integration:", dbError);
      return NextResponse.redirect(
        new URL('/admin/settings?microsoft_error=connection_failed', baseUrl)
      );
    }

  } catch (error) {
    console.error("Microsoft OAuth callback error:", error);
    return NextResponse.redirect(
      new URL('/admin/settings?microsoft_error=connection_failed', baseUrl)
    );
  } finally {
    await prisma.$disconnect();
  }
}