// app/api/zoom/integration/status/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { appPrisma } from "@/app/lib/prisma";
import { getValidZoomToken } from "@/app/lib/zoomAuth";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await appPrisma.users.findUnique({
      where: { id: session.user.id },
      select: {
        zoom_integration_enabled: true,
        zoom_integration_connected_at: true,
        zoom_email: true,
        zoom_user_id: true,
        zoom_token_expires_at: true,
        zoom_access_token: true,
        zoom_refresh_token: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let isConnected = false;
    let tokenValid = false;

    if (user.zoom_integration_enabled && user.zoom_access_token) {
      try {
        // This will refresh the token if needed
        await getValidZoomToken(session.user.id);
        isConnected = true;
        tokenValid = true;
      } catch (error) {
        console.log("Zoom token validation failed:", error.message);
        // Token refresh failed - integration is effectively disconnected
        isConnected = false;
        tokenValid = false;
      }
    }

    return NextResponse.json({
      connected: isConnected,
      zoomEmail: user.zoom_email,
      zoomUserId: user.zoom_user_id,
      connectedAt: user.zoom_integration_connected_at,
      tokenExpiresAt: user.zoom_token_expires_at,
      tokenValid: tokenValid,
    });

  } catch (error) {
    console.error("Error fetching Zoom integration status:", error);
    return NextResponse.json(
      { error: "Failed to fetch Zoom integration status" },
      { status: 500 }
    );
  }
}