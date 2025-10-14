// app/api/admin/integrations/bamboohr/test/route.js
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

    // Get BambooHR credentials
    const bamboohrSubdomain = await appPrisma.settings.findFirst({
      where: { key: "bamboohr_subdomain" },
    });

    const bamboohrApiKey = await appPrisma.settings.findFirst({
      where: { key: "bamboohr_api_key" },
    });

    if (!bamboohrApiKey?.value || !bamboohrSubdomain?.value) {
      return NextResponse.json(
        { error: "BambooHR integration is not configured" },
        { status: 400 }
      );
    }

    // Decrypt credentials
    const apiKey = decrypt(bamboohrApiKey.value);
    const subdomain = bamboohrSubdomain.value;

    // Test connection by fetching company directory
    const response = await fetch(
      `https://api.bamboohr.com/api/gateway.php/${subdomain}/v1/employees/directory`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${apiKey}:x`).toString("base64")}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to connect to BambooHR. Please check your credentials." },
        { status: 400 }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      companyName: subdomain,
      employeeCount: data.employees?.length || 0,
      message: "Connection successful",
    });
  } catch (error) {
    console.error("Error testing BambooHR connection:", error);
    return NextResponse.json(
      { error: "Failed to test BambooHR connection" },
      { status: 500 }
    );
  }
}
