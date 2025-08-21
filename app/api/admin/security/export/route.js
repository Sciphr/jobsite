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

    // Get security events and stats for export
    const [events, stats] = await Promise.all([
      securityMonitor.getRecentEvents(1000), // Get more events for export
      securityMonitor.getSecurityStats(timeframe)
    ]);

    // Create CSV content
    const csvHeader = "Timestamp,Event Type,Severity,IP Address,User,Details\n";
    const csvRows = events.map(event => {
      const userInfo = event.users ? `${event.users.firstName} ${event.users.lastName}` : "";
      const details = event.details && typeof event.details === 'string' 
        ? JSON.parse(event.details).description || JSON.parse(event.details).reason || ""
        : "";
      
      return [
        event.created_at,
        event.event_type,
        event.severity,
        event.ip_address || "",
        userInfo,
        details.replace(/"/g, '""') // Escape quotes for CSV
      ].map(field => `"${field}"`).join(",");
    }).join("\n");

    const csvContent = csvHeader + csvRows;

    // Add summary header
    const summaryHeader = `# Security Report - ${timeframe}\n` +
      `# Generated: ${new Date().toISOString()}\n` +
      `# Total Events: ${stats.totalEvents}\n` +
      `# Active Alerts: ${stats.activeAlerts}\n` +
      `# Critical Events: ${stats.eventsBySeverity?.critical || 0}\n` +
      `#\n`;

    const fullCsvContent = summaryHeader + csvContent;

    return new NextResponse(fullCsvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="security-report-${timeframe}-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error exporting security data:", error);
    return NextResponse.json(
      { success: false, error: "Failed to export security data" },
      { status: 500 }
    );
  }
}