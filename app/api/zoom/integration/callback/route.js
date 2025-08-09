// app/api/zoom/integration/callback/route.js
import { NextResponse } from "next/server";

import { PrismaClient } from "@/app/generated/prisma";

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    console.log("🔄 Starting Zoom OAuth callback processing...");
    
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    console.log("📥 Zoom OAuth callback received:", {
      hasCode: !!code,
      hasState: !!state,
      error: error,
      errorDescription: errorDescription,
      allParams: Object.fromEntries(searchParams.entries())
    });

    if (error) {
      console.error("Zoom OAuth error:", { error, errorDescription });
      return NextResponse.redirect(
        new URL(`/admin/settings?zoom_error=${error}`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/admin/settings?zoom_error=invalid_request', request.url)
      );
    }

    // Decode state to get user ID
    console.log("🔍 Decoding state:", state);
    let userId;
    try {
      const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
      userId = decodedState.userId;
      console.log("✅ Successfully decoded user ID:", userId);
    } catch (err) {
      console.error("❌ Error decoding state:", err);
      return NextResponse.redirect(
        new URL('/admin/settings?zoom_error=invalid_state', request.url)
      );
    }

    if (!userId) {
      return NextResponse.redirect(
        new URL('/admin/settings?zoom_error=user_not_found', request.url)
      );
    }

    // Exchange code for access token
    console.log("🔄 Exchanging code for access token...");
    const tokenResponse = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.ZOOM_REDIRECT_URI
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Zoom token exchange failed:", errorData);
      return NextResponse.redirect(
        new URL('/admin/settings?zoom_error=token_exchange_failed', request.url)
      );
    }

    const tokenData = await tokenResponse.json();
    console.log("✅ Token exchange successful, expires in:", tokenData.expires_in, "seconds");
    console.log("🔍 Token lengths:", {
      access_token: tokenData.access_token?.length || 0,
      refresh_token: tokenData.refresh_token?.length || 0
    });

    // Get user info from Zoom
    console.log("🔄 Getting user info from Zoom...");
    const userResponse = await fetch('https://api.zoom.us/v2/users/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    if (!userResponse.ok) {
      console.error("Failed to get Zoom user info");
      return NextResponse.redirect(
        new URL('/admin/settings?zoom_error=user_info_failed', request.url)
      );
    }

    const zoomUser = await userResponse.json();
    console.log("✅ Got Zoom user info:", { id: zoomUser.id, email: zoomUser.email });

    // Calculate token expiry
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);
    console.log("🔄 Token expires at:", expiresAt);

    // Update user with Zoom integration data
    console.log("🔄 Updating database for user:", userId);
    await prisma.users.update({
      where: { id: userId },
      data: {
        zoom_access_token: tokenData.access_token,
        zoom_refresh_token: tokenData.refresh_token,
        zoom_token_expires_at: expiresAt,
        zoom_user_id: zoomUser.id,
        zoom_email: zoomUser.email,
        zoom_integration_enabled: true,
        zoom_integration_connected_at: new Date(),
      },
    });
    console.log("✅ Database updated successfully!");

    console.log("🎉 Zoom integration completed, redirecting to settings...");
    return NextResponse.redirect(
      new URL('/admin/settings?zoom_success=connected&refresh_session=true', request.url)
    );

  } catch (error) {
    console.error("❌ Error in Zoom OAuth callback:", error);
    console.error("❌ Error stack:", error.stack);
    console.error("❌ Error message:", error.message);
    return NextResponse.redirect(
      new URL('/admin/settings?zoom_error=connection_failed', request.url)
    );
  }
}