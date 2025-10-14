// app/api/admin/background-checks/[id]/refresh/route.js
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

// Helper function to get CERTN access token
async function getCertnAccessToken(clientId, clientSecret, environment) {
  const baseUrl = environment === "demo"
    ? "https://demo-api.certn.co"
    : "https://api.certn.co";

  const tokenResponse = await fetch(`${baseUrl}/v1/auth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error("Failed to get CERTN access token");
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

export async function POST(request, { params }) {
  try {
    const authResult = await protectRoute("applications", "read");
    if (authResult.error) return authResult.error;
    const { session } = authResult;

    const backgroundCheckId = params.id;

    // Get background check
    const backgroundCheck = await appPrisma.background_checks.findUnique({
      where: { id: backgroundCheckId },
    });

    if (!backgroundCheck) {
      return NextResponse.json(
        { error: "Background check not found" },
        { status: 404 }
      );
    }

    // Get CERTN credentials
    const certnClientId = await appPrisma.settings.findFirst({
      where: { key: "certn_client_id" },
    });

    const certnClientSecret = await appPrisma.settings.findFirst({
      where: { key: "certn_client_secret" },
    });

    const certnEnvironment = await appPrisma.settings.findFirst({
      where: { key: "certn_environment" },
    });

    if (!certnClientId?.value || !certnClientSecret?.value) {
      return NextResponse.json(
        { error: "CERTN is not configured" },
        { status: 400 }
      );
    }

    const clientId = decrypt(certnClientId.value);
    const clientSecret = decrypt(certnClientSecret.value);
    const environment = certnEnvironment?.value || "demo";

    const baseUrl = environment === "demo"
      ? "https://demo-api.certn.co"
      : "https://api.certn.co";

    // Get access token using OAuth flow
    const accessToken = await getCertnAccessToken(clientId, clientSecret, environment);

    // Fetch latest application data from CERTN
    const reportResponse = await fetch(
      `${baseUrl}/v1/applications/${backgroundCheck.certn_application_id}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!reportResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch report from CERTN" },
        { status: 500 }
      );
    }

    const reportData = await reportResponse.json();

    // Map CERTN status to our status
    const statusMapping = {
      pending: "pending",
      in_progress: "pending",
      complete: "complete",
      completed: "complete",
      adjudication: "consider",
      on_hold: "suspended",
      canceled: "suspended",
      cancelled: "suspended",
    };

    const newStatus = statusMapping[reportData.status] || "pending";
    const isComplete = newStatus === "complete" || newStatus === "consider";

    // Update background check
    const updatedCheck = await appPrisma.background_checks.update({
      where: { id: backgroundCheckId },
      data: {
        status: newStatus,
        completed_at: isComplete && !backgroundCheck.completed_at ? new Date() : backgroundCheck.completed_at,
        checkr_report_url: reportData.report_url || reportData.url || backgroundCheck.checkr_report_url,
        metadata: {
          ...backgroundCheck.metadata,
          certnResponse: {
            reportStatus: reportData.status,
            result: reportData.result,
            adjudication: reportData.adjudication,
            completed_date: reportData.completed_date,
          },
          lastRefreshed: new Date().toISOString(),
        },
      },
    });

    // Log audit event if status changed
    if (newStatus !== backgroundCheck.status) {
      await logAuditEvent({
        eventType: "UPDATE",
        category: "BACKGROUND_CHECK",
        subcategory: "REFRESH",
        entityType: "background_check",
        entityId: backgroundCheck.id,
        entityName: backgroundCheck.metadata?.candidateInfo?.firstName + " " + backgroundCheck.metadata?.candidateInfo?.lastName,
        actorId: session.user.id,
        actorName: session.user.name || session.user.email,
        actorType: "user",
        action: "Refresh background check status",
        description: `Background check status updated from ${backgroundCheck.status} to ${newStatus} via manual refresh`,
        relatedApplicationId: backgroundCheck.application_id,
        metadata: {
          previousStatus: backgroundCheck.status,
          newStatus,
          certnStatus: reportData.status,
        },
      });
    }

    return NextResponse.json({
      success: true,
      backgroundCheck: updatedCheck,
      statusChanged: newStatus !== backgroundCheck.status,
    });
  } catch (error) {
    console.error("Error refreshing background check:", error);
    return NextResponse.json(
      { error: "Failed to refresh background check" },
      { status: 500 }
    );
  }
}
