// app/api/admin/integrations/bamboohr/connect/route.js
import { NextResponse } from "next/server";
import { protectRoute } from "@/app/lib/middleware/apiProtection";
import { appPrisma } from "@/app/lib/prisma";
import { logAuditEvent } from "@/lib/auditMiddleware";
import crypto from "crypto";

// Encryption function
function encrypt(text) {
  const algorithm = "aes-256-cbc";
  const key = Buffer.from(
    process.env.ENCRYPTION_KEY || "12345678901234567890123456789012",
    "utf-8"
  ).slice(0, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

export async function POST(request) {
  try {
    const authResult = await protectRoute("settings", "update");
    if (authResult.error) return authResult.error;

    const session = authResult.session;
    const { subdomain, apiKey } = await request.json();

    if (!subdomain || !apiKey) {
      return NextResponse.json(
        { error: "Subdomain and API Key are required" },
        { status: 400 }
      );
    }

    // Validate credentials by testing connection to BambooHR
    try {
      // Test the API key by fetching company info
      const response = await fetch(
        `https://api.bamboohr.com/api/gateway.php/${subdomain}/v1/meta/users`,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`${apiKey}:x`).toString("base64")}`,
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        return NextResponse.json(
          {
            error:
              "Invalid credentials or unable to connect to BambooHR. Please verify your subdomain and API key.",
          },
          { status: 400 }
        );
      }

      // Encrypt and store the credentials
      const encryptedApiKey = encrypt(apiKey);

      // Helper function to upsert system settings (where userId is null)
      const upsertSystemSetting = async (key, value, description, dataType = "string") => {
        const existing = await appPrisma.settings.findFirst({
          where: { key, userId: null },
        });

        if (existing) {
          await appPrisma.settings.update({
            where: { id: existing.id },
            data: { value, updatedAt: new Date() },
          });
        } else {
          await appPrisma.settings.create({
            data: {
              key,
              value,
              category: "hiring_integrations",
              privilegeLevel: 2,
              dataType,
              description,
              userId: null,
            },
          });
        }
      };

      // Store in settings table
      await upsertSystemSetting(
        "bamboohr_subdomain",
        subdomain,
        "BambooHR company subdomain",
        "string"
      );

      await upsertSystemSetting(
        "bamboohr_api_key",
        encryptedApiKey,
        "Encrypted BambooHR API key",
        "string"
      );

      await upsertSystemSetting(
        "bamboohr_connected",
        "true",
        "Whether BambooHR integration is connected",
        "boolean"
      );

      await upsertSystemSetting(
        "bamboohr_last_sync",
        new Date().toISOString(),
        "Timestamp of last sync with BambooHR",
        "string"
      );

      // Log audit event
      await logAuditEvent({
        eventType: "CREATE",
        category: "INTEGRATION",
        subcategory: "CONNECT",
        entityType: "integration",
        entityId: "bamboohr",
        entityName: "BambooHR",
        actorId: session.user.id,
        actorName: session.user.name || session.user.email,
        actorType: "user",
        action: "Connect BambooHR integration",
        description: `Connected BambooHR integration for subdomain: ${subdomain}`,
        metadata: {
          provider: "bamboohr",
          subdomain,
          connectedAt: new Date().toISOString(),
        },
      });

      return NextResponse.json({
        success: true,
        connectionInfo: {
          companyName: subdomain,
          lastSync: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Error validating BambooHR credentials:", error);
      return NextResponse.json(
        { error: "Failed to connect to BambooHR. Please try again." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error connecting to BambooHR:", error);
    return NextResponse.json(
      { error: "Failed to save BambooHR integration" },
      { status: 500 }
    );
  }
}
