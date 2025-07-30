// app/api/admin/weekly-digest/preview/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { weeklyDigestService } from "../../../../lib/weeklyDigest";
import { getSystemSetting } from "../../../../lib/settings";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is admin (privilege level 1 or higher)
    if (
      !session ||
      !session.user.privilegeLevel ||
      session.user.privilegeLevel < 1
    ) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { digestConfig } = await req.json();

    if (!digestConfig) {
      return NextResponse.json(
        { success: false, message: "Digest configuration required" },
        { status: 400 }
      );
    }

    console.log("🔍 Generating email preview for:", session.user.email);
    console.log("📋 Digest config received:", JSON.stringify(digestConfig, null, 2));

    // Calculate date ranges
    weeklyDigestService.calculateDateRanges();
    console.log("📅 Date ranges calculated");

    // Collect data using the provided configuration
    const digestData = await weeklyDigestService.collectWeeklyData(digestConfig);
    console.log("📊 Data collected successfully");

    // Create a mock admin user for preview
    const mockAdmin = {
      id: session.user.id,
      email: session.user.email,
      firstName: session.user.firstName || "Admin",
      lastName: session.user.lastName || "User",
    };
    console.log("👤 Mock admin created:", mockAdmin);

    // Generate the email HTML
    const emailHtml = await weeklyDigestService.generateEmailHTML(mockAdmin, digestData);
    console.log("📧 Email HTML generated, length:", emailHtml?.length);

    return NextResponse.json({
      success: true,
      html: emailHtml,
      dateRange: digestData.dateRange.formatted,
      message: "Preview generated successfully"
    });

  } catch (error) {
    console.error("❌ Preview generation error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to generate preview",
        error: error.message,
      },
      { status: 500 }
    );
  }
}