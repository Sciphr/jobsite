import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
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

    // Get security statistics from security monitor
    const stats = await securityMonitor.getSecurityStats(timeframe);

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching security stats:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch security statistics" },
      { status: 500 }
    );
  }
}