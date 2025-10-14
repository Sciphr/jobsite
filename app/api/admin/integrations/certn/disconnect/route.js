// app/api/admin/integrations/certn/disconnect/route.js
import { NextResponse } from "next/server";
import { protectRoute } from "@/app/lib/middleware/apiProtection";
import { appPrisma } from "@/app/lib/prisma";
import { logAuditEvent } from "@/lib/auditMiddleware";

export async function POST(request) {
  try {
    const authResult = await protectRoute("settings", "update");
    if (authResult.error) return authResult.error;

    const session = authResult.session;

    // Get environment before deleting for audit log
    const environmentSetting = await appPrisma.settings.findFirst({
      where: { key: "certn_environment" },
    });
    const environment = environmentSetting?.value || "unknown";

    // Delete CERTN settings
    await appPrisma.settings.deleteMany({
      where: {
        key: {
          in: ["certn_client_id", "certn_client_secret", "certn_environment"],
        },
      },
    });

    // Log audit event
    await logAuditEvent({
      eventType: "DELETE",
      category: "INTEGRATION",
      subcategory: "DISCONNECT",
      entityType: "integration",
      entityId: "certn",
      entityName: "CERTN",
      actorId: session.user.id,
      actorName: session.user.name || session.user.email,
      actorType: "user",
      action: "Disconnect CERTN integration",
      description: `Disconnected CERTN integration (${environment} environment)`,
      metadata: {
        provider: "certn",
        environment,
        disconnectedAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "CERTN integration disconnected successfully",
    });
  } catch (error) {
    console.error("Error disconnecting from CERTN:", error);
    return NextResponse.json(
      { error: "Failed to disconnect from CERTN" },
      { status: 500 }
    );
  }
}
