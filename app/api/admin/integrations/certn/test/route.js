// app/api/admin/integrations/certn/test/route.js
import { NextResponse } from "next/server";
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

    // Get CERTN settings
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
        { error: "CERTN is not connected" },
        { status: 400 }
      );
    }

    // Decrypt credentials
    const clientId = decrypt(certnClientId.value);
    const clientSecret = decrypt(certnClientSecret.value);
    const environment = certnEnvironment?.value || "demo";

    const baseUrl = environment === "demo"
      ? "https://demo-api.certn.co"
      : "https://api.certn.co";

    // Get access token using OAuth flow
    const accessToken = await getCertnAccessToken(clientId, clientSecret, environment);

    // Test the connection
    const response = await fetch(`${baseUrl}/v1/account`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to connect to CERTN. Please check your credentials." },
        { status: 400 }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      version: "v1",
      accountName: data.name || data.company_name,
      accountEmail: data.email || data.contact_email,
      environment: environment,
    });
  } catch (error) {
    console.error("Error testing CERTN connection:", error);
    return NextResponse.json(
      { error: "Failed to test CERTN connection" },
      { status: 500 }
    );
  }
}
