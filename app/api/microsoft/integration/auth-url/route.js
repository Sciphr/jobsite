import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    // Microsoft Graph OAuth configuration
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const redirectUri = process.env.MICROSOFT_REDIRECT_URI;
    
    // Debug request headers to see if there's something forcing HTTPS
    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const origin = request.headers.get('origin');
    
    console.log("Request Debug:");
    console.log("Host:", host);
    console.log("Protocol:", protocol);
    console.log("Origin:", origin);
    console.log("X-Forwarded-Proto:", request.headers.get('x-forwarded-proto'));
    
    console.log("Microsoft OAuth Config Debug:");
    console.log("Client ID:", clientId);
    console.log("MICROSOFT_REDIRECT_URI from env:", process.env.MICROSOFT_REDIRECT_URI);
    console.log("NEXTAUTH_URL from env:", process.env.NEXTAUTH_URL);
    console.log("Final Redirect URI:", redirectUri);
    
    if (!clientId || !redirectUri) {
      return NextResponse.json(
        { message: "Microsoft integration not configured. Missing CLIENT_ID or REDIRECT_URI." },
        { status: 500 }
      );
    }

    // Microsoft Graph scopes for calendar and Teams
    const scopes = [
      'openid',
      'profile',
      'email',
      'offline_access',
      'https://graph.microsoft.com/Calendars.ReadWrite',
      'https://graph.microsoft.com/OnlineMeetings.ReadWrite',
      'https://graph.microsoft.com/User.Read'
    ].join(' ');

    // Build Microsoft OAuth URL
    const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('response_mode', 'query');
    authUrl.searchParams.set('state', session.user.id); // Pass user ID as state for security

    return NextResponse.json({ authUrl: authUrl.toString() });

  } catch (error) {
    console.error("Error generating Microsoft auth URL:", error);
    return NextResponse.json(
      { message: "Failed to generate authorization URL" },
      { status: 500 }
    );
  }
}