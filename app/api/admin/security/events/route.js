import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { appPrisma } from "../../../../lib/prisma";
import { userHasPermission } from "../../../../lib/permissions";
import { securityMonitor } from "../../../../lib/security-monitor";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check permission for security access
    const hasSecurityPermission = await userHasPermission(
      session.user.id,
      "security",
      "view"
    );

    if (!hasSecurityPermission) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get("timeframe") || "24h";
    const limit = parseInt(searchParams.get("limit")) || 100;
    const severity = searchParams.get("severity");

    // Try to get recent events from security monitor
    const events = await securityMonitor.getRecentEvents(limit, severity);

    return NextResponse.json({
      success: true,
      data: events,
      timeframe,
      total: events.length,
    });
  } catch (error) {
    console.error("Error fetching security events:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch security events" },
      { status: 500 }
    );
  }
}