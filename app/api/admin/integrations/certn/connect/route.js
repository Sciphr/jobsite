// app/api/admin/integrations/certn/connect/route.js
import { NextResponse } from "next/server";
import { protectRoute } from "@/app/lib/middleware/apiProtection";
import { appPrisma } from "@/app/lib/prisma";
import { logAuditEvent } from "@/lib/auditMiddleware";
import crypto from "crypto";

// Encryption functions (in production, use a proper encryption library)
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

export async function POST(request) {
  try {
    const authResult = await protectRoute("settings", "update");
    if (authResult.error) return authResult.error;

    const session = authResult.session;
    const { clientId, clientSecret, environment } = await request.json();

    if (!clientId || !clientSecret || !environment) {
      return NextResponse.json(
        { error: "Client ID, Client Secret, and environment are required" },
        { status: 400 }
      );
    }

    // Validate credentials by getting an access token and testing with CERTN
    const baseUrl = environment === "demo"
      ? "https://demo-api.certn.co"
      : "https://api.certn.co";

    try {
      // Get access token using OAuth flow
      const accessToken = await getCertnAccessToken(clientId, clientSecret, environment);

      // Validate by fetching account info
      const response = await fetch(`${baseUrl}/v1/account`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return NextResponse.json(
          {
            error:
              "Invalid credentials or unable to connect to CERTN. Please verify your Client ID and Secret.",
          },
          { status: 400 }
        );
      }

      const accountData = await response.json();

      // Encrypt and store the credentials
      const encryptedClientId = encrypt(clientId);
      const encryptedClientSecret = encrypt(clientSecret);

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

      // Store in settings
      await upsertSystemSetting(
        "certn_client_id",
        encryptedClientId,
        "Encrypted Client ID for CERTN integration",
        "string"
      );

      await upsertSystemSetting(
        "certn_client_secret",
        encryptedClientSecret,
        "Encrypted Client Secret for CERTN integration",
        "string"
      );

      await upsertSystemSetting(
        "certn_environment",
        environment,
        "Demo or Production environment",
        "string"
      );

      // Log audit event
      await logAuditEvent({
        eventType: "CREATE",
        category: "INTEGRATION",
        subcategory: "CONNECT",
        entityType: "integration",
        entityId: "certn",
        entityName: "CERTN",
        actorId: session.user.id,
        actorName: session.user.name || session.user.email,
        actorType: "user",
        action: "Connect CERTN integration",
        description: `Connected CERTN integration in ${environment} environment`,
        metadata: {
          provider: "certn",
          environment,
          accountName: accountData.name || accountData.company_name || "CERTN Account",
          accountId: accountData.id || accountData.account_id,
          connectedAt: new Date().toISOString(),
        },
      });

      return NextResponse.json({
        success: true,
        accountInfo: {
          name: accountData.name || accountData.company_name || "CERTN Account",
          email: accountData.email || accountData.contact_email,
          id: accountData.id || accountData.account_id,
        },
      });
    } catch (error) {
      console.error("Error validating CERTN credentials:", error);
      return NextResponse.json(
        { error: "Failed to connect to CERTN. Please try again." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error connecting to CERTN:", error);
    return NextResponse.json(
      { error: "Failed to save CERTN integration" },
      { status: 500 }
    );
  }
}
