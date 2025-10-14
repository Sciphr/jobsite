// app/api/admin/integrations/hris/status/route.js
import { NextResponse } from "next/server";
import { protectRoute } from "@/app/lib/middleware/apiProtection";
import { appPrisma } from "@/app/lib/prisma";

export async function GET(request) {
  try {
    const authResult = await protectRoute("settings", "read");
    if (authResult.error) return authResult.error;

    // Check for all HRIS integrations
    const integrations = [];

    // Check BambooHR
    const bamboohrConnected = await appPrisma.settings.findFirst({
      where: { key: "bamboohr_connected" },
    });

    if (bamboohrConnected?.value === "true") {
      const bamboohrSubdomain = await appPrisma.settings.findFirst({
        where: { key: "bamboohr_subdomain" },
      });
      const bamboohrLastSync = await appPrisma.settings.findFirst({
        where: { key: "bamboohr_last_sync" },
      });

      integrations.push({
        provider: "bamboohr",
        name: "BambooHR",
        connected: true,
        subdomain: bamboohrSubdomain?.value,
        lastSync: bamboohrLastSync?.value,
      });
    }

    // TODO: Add checks for other HRIS providers here
    // Example:
    // Check Workday
    // Check ADP
    // Check Rippling
    // etc.

    return NextResponse.json({
      hasActiveIntegration: integrations.length > 0,
      integrations,
      activeProvider: integrations[0]?.provider || null,
    });
  } catch (error) {
    console.error("Error checking HRIS integration status:", error);
    return NextResponse.json(
      { error: "Failed to check HRIS integration status" },
      { status: 500 }
    );
  }
}
