// app/api/zoom/integration/auth-url/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = process.env.ZOOM_CLIENT_ID;
    const redirectUri = process.env.ZOOM_REDIRECT_URI;
    
    console.log("Zoom OAuth Config Check:", {
      hasClientId: !!clientId,
      hasRedirectUri: !!redirectUri,
      redirectUri: redirectUri
    });
    
    if (!clientId || !redirectUri) {
      return NextResponse.json(
        { error: "Zoom OAuth not configured. Please check environment variables." },
        { status: 500 }
      );
    }

    const scopes = [
      'meeting:write',
      'meeting:read',
      'user:read'
    ].join(' ');

    const state = Buffer.from(JSON.stringify({
      userId: session.user.id,
      timestamp: Date.now()
    })).toString('base64');

    const authUrl = new URL('https://zoom.us/oauth/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('state', state);

    console.log("Generated Zoom OAuth URL:", authUrl.toString());

    return NextResponse.json({ authUrl: authUrl.toString() });

  } catch (error) {
    console.error("Error generating Zoom OAuth URL:", error);
    return NextResponse.json(
      { error: "Failed to generate OAuth URL" },
      { status: 500 }
    );
  }
}