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

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        zoomIntegrationEnabled: true,
        zoomIntegrationConnectedAt: true,
        zoomEmail: true,
        zoomUserId: true,
        zoomTokenExpiresAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isTokenValid = user.zoomTokenExpiresAt && new Date() < new Date(user.zoomTokenExpiresAt);

    return NextResponse.json({
      connected: user.zoomIntegrationEnabled && isTokenValid,
      zoomEmail: user.zoomEmail,
      zoomUserId: user.zoomUserId,
      connectedAt: user.zoomIntegrationConnectedAt,
      tokenExpiresAt: user.zoomTokenExpiresAt,
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