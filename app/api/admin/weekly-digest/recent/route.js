// app/api/admin/weekly-digest/recent/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { appPrisma } from "../../../../lib/prisma";
import { protectRoute } from "../../../../lib/middleware/apiProtection";

export async function GET(req) {
  try {
    const authResult = await protectRoute("weekly_digest", "view");
    if (authResult.error) return authResult.error;
    const { session } = authResult;

    // Get recent digests, ordered by most recent first
    const recentDigests = await appPrisma.weekly_digests.findMany({
      orderBy: {
        sent_at: "desc",
      },
      take: 10, // Get last 10 digests
      include: {
        users: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Format the data for the frontend
    const formattedDigests = recentDigests.map((digest) => ({
      id: digest.id,
      dateRange: digest.date_range,
      weekStart: digest.week_start,
      weekEnd: digest.week_end,
      digestType: digest.digest_type,
      recipientCount: digest.recipient_count,
      successfulSends: digest.successful_sends,
      failedSends: digest.failed_sends,
      sentAt: digest.sent_at,
      theme: digest.theme,
      status: digest.status,
      errorMessage: digest.error_message,
      sender: digest.users
        ? {
            name:
              `${digest.users.firstName || ""} ${digest.users.lastName || ""}`.trim() ||
              "System",
            email: digest.users.email,
          }
        : {
            name: "System",
            email: "system",
          },
      // Format for display
      displayName:
        digest.digest_type === "test"
          ? `Test Digest - ${digest.date_range}`
          : `Weekly Digest - ${digest.date_range}`,
      displayStatus:
        digest.status === "completed"
          ? `Sent to ${digest.successful_sends} recipient${digest.successful_sends !== 1 ? "s" : ""}`
          : digest.status === "failed"
            ? `Failed - ${digest.error_message}`
            : digest.status,
      sentAgo: formatTimeAgo(digest.sent_at),
    }));

    return NextResponse.json({
      success: true,
      data: formattedDigests,
    });
  } catch (error) {
    console.error("❌ Failed to fetch recent digests:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch recent digests",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// Helper function to format time ago
function formatTimeAgo(date) {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return "Just now";
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  } else {
    return new Date(date).toLocaleDateString();
  }
}
