import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../auth/[...nextauth]/route";
import { userHasPermission } from "../../../../../lib/permissions";
import { securityMonitor } from "../../../../../lib/security-monitor";

export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check permission for security management
    const hasSecurityPermission = await userHasPermission(
      session.user.id,
      "security",
      "manage"
    );

    if (!hasSecurityPermission) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { id } = params;
    const { resolved } = await request.json();

    if (resolved) {
      // Mark alert as resolved
      const updatedAlert = await securityMonitor.resolveAlert(id, session.user.id);
      
      if (updatedAlert) {
        return NextResponse.json({
          success: true,
          data: updatedAlert,
        });
      } else {
        return NextResponse.json(
          { success: false, error: "Alert not found or could not be resolved" },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error updating security alert:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update security alert" },
      { status: 500 }
    );
  }
}