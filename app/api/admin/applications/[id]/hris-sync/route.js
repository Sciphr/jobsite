// app/api/admin/applications/[id]/hris-sync/route.js
import { NextResponse } from "next/server";
import { protectRoute } from "@/app/lib/middleware/apiProtection";
import { appPrisma } from "@/app/lib/prisma";
import { logAuditEvent } from "@/lib/auditMiddleware";
import crypto from "crypto";

// Decryption function
function decrypt(text) {
  const algorithm = "aes-256-cbc";
  const key = Buffer.from(
    process.env.ENCRYPTION_KEY || "12345678901234567890123456789012",
    "utf-8"
  ).slice(0, 32);
  const parts = text.split(":");
  const iv = Buffer.from(parts.shift(), "hex");
  const encryptedText = parts.join(":");
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export async function POST(request, { params }) {
  try {
    const authResult = await protectRoute("applications", "update");
    if (authResult.error) return authResult.error;

    const session = authResult.session;
    const resolvedParams = await params;
    const applicationId = resolvedParams.id;

    // Get the application
    const application = await appPrisma.applications.findUnique({
      where: { id: applicationId },
      include: {
        jobs: {
          select: {
            title: true,
            department: true,
          },
        },
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Check if application is in "Hired" status
    if (application.status !== "Hired") {
      return NextResponse.json(
        { error: "Only hired candidates can be synced to HRIS" },
        { status: 400 }
      );
    }

    // Check if already synced
    if (application.hris_synced) {
      return NextResponse.json(
        {
          error: "Candidate already synced to HRIS",
          syncedAt: application.hris_synced_at,
          employeeId: application.hris_employee_id,
        },
        { status: 400 }
      );
    }

    // Check which HRIS integration is active
    const bamboohrConnected = await appPrisma.settings.findFirst({
      where: { key: "bamboohr_connected" },
    });

    if (bamboohrConnected?.value !== "true") {
      return NextResponse.json(
        { error: "No HRIS integration is currently active" },
        { status: 400 }
      );
    }

    // Get BambooHR credentials
    const bamboohrSubdomain = await appPrisma.settings.findFirst({
      where: { key: "bamboohr_subdomain" },
    });

    const bamboohrApiKey = await appPrisma.settings.findFirst({
      where: { key: "bamboohr_api_key" },
    });

    if (!bamboohrApiKey?.value || !bamboohrSubdomain?.value) {
      return NextResponse.json(
        { error: "BambooHR integration is not properly configured" },
        { status: 400 }
      );
    }

    // Decrypt credentials
    const apiKey = decrypt(bamboohrApiKey.value);
    const subdomain = bamboohrSubdomain.value;

    // Prepare employee data for BambooHR
    // Note: Don't include jobTitle in initial creation as it's a list-type field
    const employeeData = {
      firstName: application.name?.split(" ")[0] || "",
      lastName: application.name?.split(" ").slice(1).join(" ") || "",
      email: application.email,
      mobilePhone: application.phone,
      department: application.jobs.department,
      hireDate: new Date().toISOString().split("T")[0], // Today's date in YYYY-MM-DD
    };

    // Make actual API call to BambooHR to create employee
    const response = await fetch(
      `https://api.bamboohr.com/api/gateway.php/${subdomain}/v1/employees`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${apiKey}:x`).toString("base64")}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(employeeData),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("BambooHR API error:", errorText);

      // Log the error to the application record
      await appPrisma.applications.update({
        where: { id: applicationId },
        data: {
          hris_sync_error: `BambooHR API error: ${response.status} - ${errorText}`,
        },
      });

      return NextResponse.json(
        {
          error: "Failed to sync candidate to BambooHR",
          details: errorText,
          status: response.status
        },
        { status: 500 }
      );
    }

    // BambooHR returns the employee ID in the Location header
    const locationHeader = response.headers.get("Location");
    let employeeId = null;

    if (locationHeader) {
      // Location header format: https://api.bamboohr.com/api/gateway.php/{subdomain}/v1/employees/{id}
      const matches = locationHeader.match(/\/employees\/(\d+)/);
      if (matches && matches[1]) {
        employeeId = matches[1];
      }
    }

    // If we couldn't get ID from Location header, try response body
    if (!employeeId) {
      try {
        const responseData = await response.json();
        employeeId = responseData.id || responseData.employeeId || `EMP-${Date.now()}`;
      } catch (e) {
        // If response body is empty or not JSON, use timestamp as fallback
        employeeId = `EMP-${Date.now()}`;
      }
    }

    // Note: Job titles are managed at the admin level in BambooHR
    // We sync basic employee info, and BambooHR admins assign job titles manually

    // Update application with sync information
    await appPrisma.applications.update({
      where: { id: applicationId },
      data: {
        hris_synced: true,
        hris_synced_at: new Date(),
        hris_employee_id: employeeId,
        hris_sync_error: null,
      },
    });

    // Update last sync timestamp
    await appPrisma.settings.updateMany({
      where: { key: "bamboohr_last_sync" },
      data: {
        value: new Date().toISOString(),
        updatedAt: new Date(),
      },
    });

    // Log audit event
    await logAuditEvent({
      eventType: "CREATE",
      category: "HRIS",
      subcategory: "SYNC",
      entityType: "hris_sync",
      entityId: applicationId,
      entityName: application.name,
      actorId: session.user.id,
      actorName: session.user.name || session.user.email,
      actorType: "user",
      action: "Sync candidate to HRIS",
      description: `Candidate ${application.name} synced to BambooHR as employee ${employeeId}`,
      relatedApplicationId: applicationId,
      metadata: {
        provider: "bamboohr",
        employeeId: employeeId,
        jobTitle: application.jobs.title,
        department: application.jobs.department,
        syncedAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Candidate successfully synced to BambooHR",
      employeeId: employeeId,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error syncing candidate to HRIS:", error);

    // Log the error to the application record
    try {
      const resolvedParams = await params;
      await appPrisma.applications.update({
        where: { id: resolvedParams.id },
        data: {
          hris_sync_error: error.message,
        },
      });
    } catch (updateError) {
      console.error("Failed to log sync error:", updateError);
    }

    return NextResponse.json(
      { error: "Failed to sync candidate to HRIS" },
      { status: 500 }
    );
  }
}

// GET endpoint to check sync status
export async function GET(request, { params }) {
  try {
    const authResult = await protectRoute("applications", "read");
    if (authResult.error) return authResult.error;

    const resolvedParams = await params;
    const application = await appPrisma.applications.findUnique({
      where: { id: resolvedParams.id },
      select: {
        hris_synced: true,
        hris_synced_at: true,
        hris_employee_id: true,
        hris_sync_error: true,
        status: true,
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      synced: application.hris_synced || false,
      syncedAt: application.hris_synced_at,
      employeeId: application.hris_employee_id,
      error: application.hris_sync_error,
      canSync: application.status === "Hired" && !application.hris_synced,
    });
  } catch (error) {
    console.error("Error checking HRIS sync status:", error);
    return NextResponse.json(
      { error: "Failed to check sync status" },
      { status: 500 }
    );
  }
}
