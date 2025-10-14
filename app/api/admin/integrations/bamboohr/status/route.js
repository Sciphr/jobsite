// app/api/admin/integrations/bamboohr/status/route.js
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

export async function GET(request) {
  try {
    const authResult = await protectRoute("settings", "read");
    if (authResult.error) return authResult.error;

    // Check if BambooHR is configured
    const bamboohrSubdomain = await appPrisma.settings.findFirst({
      where: { key: "bamboohr_subdomain" },
    });

    const bamboohrApiKey = await appPrisma.settings.findFirst({
      where: { key: "bamboohr_api_key" },
    });

    const bamboohrConnected = await appPrisma.settings.findFirst({
      where: { key: "bamboohr_connected" },
    });

    const bamboohrLastSync = await appPrisma.settings.findFirst({
      where: { key: "bamboohr_last_sync" },
    });

    const bamboohrAutoSync = await appPrisma.settings.findFirst({
      where: { key: "bamboohr_auto_sync" },
    });

    if (!bamboohrApiKey?.value || !bamboohrSubdomain?.value) {
      return NextResponse.json({
        connected: false,
        subdomain: null,
        connectionInfo: null,
        autoSync: false,
      });
    }

    // Get connection info if connected
    let connectionInfo = null;
    try {
      const apiKey = decrypt(bamboohrApiKey.value);
      const subdomain = bamboohrSubdomain.value;

      // Test connection by fetching company info
      const response = await fetch(
        `https://api.bamboohr.com/api/gateway.php/${subdomain}/v1/meta/users`,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`${apiKey}:x`).toString("base64")}`,
            Accept: "application/json",
          },
        }
      );

      if (response.ok) {
        connectionInfo = {
          lastSync: bamboohrLastSync?.value || null,
          companyName: subdomain,
        };
      }
    } catch (error) {
      console.error("Error fetching BambooHR connection info:", error);
    }

    return NextResponse.json({
      connected: bamboohrConnected?.value === "true",
      subdomain: bamboohrSubdomain.value,
      connectionInfo,
      autoSync: bamboohrAutoSync?.value === "true",
    });
  } catch (error) {
    console.error("Error checking BambooHR status:", error);
    return NextResponse.json(
      { error: "Failed to check BambooHR integration status" },
      { status: 500 }
    );
  }
}
