// app/api/calendar/integration/status/route.js
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

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        calendarIntegrationEnabled: true,
        googleEmail: true,
        googleCalendarId: true,
        calendarIntegrationConnectedAt: true,
        calendarTimezone: true,
        googleTokenExpiresAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isTokenValid = user.googleTokenExpiresAt && new Date(user.googleTokenExpiresAt) > new Date();

    return NextResponse.json({
      connected: user.calendarIntegrationEnabled && isTokenValid,
      googleEmail: user.googleEmail,
      calendarId: user.googleCalendarId,
      connectedAt: user.calendarIntegrationConnectedAt,
      timezone: user.calendarTimezone,
      tokenValid: isTokenValid,
    });
  } catch (error) {
    console.error("Error checking calendar integration status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}