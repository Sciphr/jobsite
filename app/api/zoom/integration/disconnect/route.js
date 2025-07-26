// app/api/zoom/integration/disconnect/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PrismaClient } from "@/app/generated/prisma";

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's current Zoom tokens
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        zoomAccessToken: true,
      },
    });

    // Optionally revoke the token with Zoom (if they support it)
    if (user?.zoomAccessToken) {
      try {
        await fetch('https://zoom.us/oauth/revoke', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`).toString('base64')}`
          },
          body: new URLSearchParams({
            token: user.zoomAccessToken
          })
        });
      } catch (revokeError) {
        console.error("Error revoking Zoom token:", revokeError);
        // Continue with local cleanup even if revoke fails
      }
    }

    // Clear Zoom integration data from database
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        zoomAccessToken: null,
        zoomRefreshToken: null,
        zoomTokenExpiresAt: null,
        zoomUserId: null,
        zoomEmail: null,
        zoomIntegrationEnabled: false,
        zoomIntegrationConnectedAt: null,
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Zoom integration disconnected successfully" 
    });

  } catch (error) {
    console.error("Error disconnecting Zoom integration:", error);
    return NextResponse.json(
      { error: "Failed to disconnect Zoom integration" },
      { status: 500 }
    );
  }
}