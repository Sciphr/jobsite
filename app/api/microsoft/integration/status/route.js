import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PrismaClient } from "@/app/generated/prisma";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's Microsoft integration status
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          microsoftIntegrationEnabled: true,
          microsoftIntegrationConnectedAt: true,
          microsoftEmail: true,
          microsoftUserId: true,
          microsoftTenantId: true,
          microsoftTokenExpiresAt: true,
          calendarTimezone: true,
        },
      });
    } catch (dbError) {
      // If Microsoft fields don't exist yet, return disconnected status
      if (dbError.code === 'P2021' || dbError.message.includes('column') || dbError.message.includes('microsoft')) {
        return NextResponse.json({
          connected: false,
          microsoftEmail: null,
          userId: null,
          tenantId: null,
          connectedAt: null,
          timezone: "America/Toronto",
          tokenExpired: false,
          needsMigration: true,
        });
      }
      throw dbError;
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isConnected = user.microsoftIntegrationEnabled && 
                       user.microsoftTokenExpiresAt && 
                       new Date(user.microsoftTokenExpiresAt) > new Date();

    return NextResponse.json({
      connected: isConnected,
      microsoftEmail: user.microsoftEmail,
      userId: user.microsoftUserId,
      tenantId: user.microsoftTenantId,
      connectedAt: user.microsoftIntegrationConnectedAt,
      timezone: user.calendarTimezone || "America/Toronto",
      tokenExpired: user.microsoftTokenExpiresAt && new Date(user.microsoftTokenExpiresAt) <= new Date(),
    });

  } catch (error) {
    console.error("Error fetching Microsoft integration status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}