// app/api/admin/integrations/bamboohr/disconnect/route.js
import { NextResponse } from "next/server";
import { protectRoute } from "@/app/lib/middleware/apiProtection";
import { appPrisma } from "@/app/lib/prisma";
import { logAuditEvent } from "@/lib/auditMiddleware";

export async function POST(request) {
  try {
    const authResult = await protectRoute("settings", "update");
    if (authResult.error) return authResult.error;

    const session = authResult.session;

    // Get subdomain before deleting for audit log
    const subdomainSetting = await appPrisma.settings.findFirst({
      where: { key: "bamboohr_subdomain" },
    });
    const subdomain = subdomainSetting?.value || "unknown";

    // Update the connected status to false
    await appPrisma.settings.updateMany({
      where: { key: "bamboohr_connected" },
      data: {
        value: "false",
        updatedAt: new Date(),
      },
    });

    // Optionally, delete the stored credentials for security
    await appPrisma.settings.deleteMany({
      where: {
        key: {
          in: ["bamboohr_api_key", "bamboohr_subdomain"],
        },
      },
    });

    // Log audit event
    await logAuditEvent({
      eventType: "DELETE",
      category: "INTEGRATION",
      subcategory: "DISCONNECT",
      entityType: "integration",
      entityId: "bamboohr",
      entityName: "BambooHR",
      actorId: session.user.id,
      actorName: session.user.name || session.user.email,
      actorType: "user",
      action: "Disconnect BambooHR integration",
      description: `Disconnected BambooHR integration for subdomain: ${subdomain}`,
      metadata: {
        provider: "bamboohr",
        subdomain,
        disconnectedAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Successfully disconnected from BambooHR",
    });
  } catch (error) {
    console.error("Error disconnecting from BambooHR:", error);
    return NextResponse.json(
      { error: "Failed to disconnect from BambooHR" },
      { status: 500 }
    );
  }
}
