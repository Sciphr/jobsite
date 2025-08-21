import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { appPrisma } from "../../../../lib/prisma";
import { userHasPermission } from "../../../../lib/permissions";

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

    let alerts = [];

    try {
      // Try to get alerts from database if security tables exist
      if (appPrisma.security_alerts) {
        alerts = await appPrisma.security_alerts.findMany({
          orderBy: { created_at: 'desc' },
          take: 50,
          include: {
            resolved_by_user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        });
      }
    } catch (error) {
      console.log("Security alerts table not found or accessible:", error.message);
      // Return empty array if tables don't exist yet
      alerts = [];
    }

    return NextResponse.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    console.error("Error fetching security alerts:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch security alerts" },
      { status: 500 }
    );
  }
}