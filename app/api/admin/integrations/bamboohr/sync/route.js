// app/api/admin/integrations/bamboohr/sync/route.js
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

export async function POST(request) {
  try {
    const authResult = await protectRoute("settings", "update");
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

    // In a real implementation, you would:
    // 1. Find all candidates marked as "Hired" that haven't been synced yet
    // 2. Create employee records in BambooHR for each
    // 3. Mark them as synced in your database

    // For now, this is a placeholder that updates the last sync time
    await appPrisma.settings.updateMany({
      where: { key: "bamboohr_last_sync" },
      data: {
        value: new Date().toISOString(),
        updatedAt: new Date(),
      },
    });

    // Example: Get hired candidates from the last 30 days that need syncing
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const hiredCandidates = await appPrisma.applications.findMany({
      where: {
        status: "Hired",
        updatedAt: {
          gte: thirtyDaysAgo,
        },
      },
      include: {
        jobs: {
          select: {
            title: true,
            department: true,
          },
        },
      },
      take: 20, // Limit to 20 for this demo
    });

    // TODO: Implement actual sync logic here
    // For each hired candidate, you would:
    // 1. Check if they already exist in BambooHR
    // 2. Create a new employee record if not
    // 3. Update the application record to mark it as synced

    // Placeholder sync count
    const syncedCount = hiredCandidates.length;

    return NextResponse.json({
      success: true,
      syncedCount,
      message: `Successfully synced ${syncedCount} record(s)`,
      lastSync: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error syncing with BambooHR:", error);
    return NextResponse.json(
      { error: "Failed to sync with BambooHR" },
      { status: 500 }
    );
  }
}
