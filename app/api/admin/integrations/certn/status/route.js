// app/api/admin/integrations/certn/status/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { protectRoute } from "@/app/lib/middleware/apiProtection";
import { appPrisma } from "@/app/lib/prisma";
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

export async function GET(request) {
  try {
    const authResult = await protectRoute("settings", "read");
    if (authResult.error) return authResult.error;

    // Check if CERTN is configured
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
      return NextResponse.json({
        connected: false,
        environment: null,
        accountInfo: null,
      });
    }

    // Get account info if connected
    let accountInfo = null;
    try {
      const clientId = decrypt(certnClientId.value);
      const clientSecret = decrypt(certnClientSecret.value);
      const environment = certnEnvironment?.value || "demo";

      const baseUrl = environment === "demo"
        ? "https://demo-api.certn.co"
        : "https://api.certn.co";

      // Get access token using OAuth flow
      const accessToken = await getCertnAccessToken(clientId, clientSecret, environment);

      const response = await fetch(`${baseUrl}/v1/account`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        accountInfo = {
          name: data.name || data.company_name || "CERTN Account",
          email: data.email || data.contact_email,
          id: data.id || data.account_id,
        };
      }
    } catch (error) {
      console.error("Error fetching CERTN account info:", error);
    }

    return NextResponse.json({
      connected: true,
      environment: certnEnvironment?.value || "demo",
      accountInfo,
    });
  } catch (error) {
    console.error("Error checking CERTN status:", error);
    return NextResponse.json(
      { error: "Failed to check CERTN integration status" },
      { status: 500 }
    );
  }
}
