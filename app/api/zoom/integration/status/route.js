// app/api/zoom/integration/status/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PrismaClient } from "@/app/generated/prisma";

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: {
        zoom_integration_enabled: true,
        zoom_integration_connected_at: true,
        zoom_email: true,
        zoom_user_id: true,
        zoom_token_expires_at: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isTokenValid = user.zoom_token_expires_at && new Date() < new Date(user.zoom_token_expires_at);

    return NextResponse.json({
      connected: user.zoom_integration_enabled && isTokenValid,
      zoomEmail: user.zoom_email,
      zoomUserId: user.zoom_user_id,
      connectedAt: user.zoom_integration_connected_at,
      tokenExpiresAt: user.zoom_token_expires_at,
      tokenValid: isTokenValid,
    });

  } catch (error) {
    console.error("Error fetching Zoom integration status:", error);
    return NextResponse.json(
      { error: "Failed to fetch Zoom integration status" },
      { status: 500 }
    );
  }
}