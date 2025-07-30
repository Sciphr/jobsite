// app/api/admin/weekly-digest/recent/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { appPrisma } from "../../../../lib/prisma";

export async function GET(req) {
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

    // Get recent digests, ordered by most recent first
    const recentDigests = await appPrisma.weeklyDigests.findMany({
      orderBy: {
        sentAt: "desc",
      },
      take: 10, // Get last 10 digests
      include: {
        sender: {
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
      dateRange: digest.dateRange,
      weekStart: digest.weekStart,
      weekEnd: digest.weekEnd,
      digestType: digest.digestType,
      recipientCount: digest.recipientCount,
      successfulSends: digest.successfulSends,
      failedSends: digest.failedSends,
      sentAt: digest.sentAt,
      theme: digest.theme,
      status: digest.status,
      errorMessage: digest.errorMessage,
      sender: digest.sender
        ? {
            name:
              `${digest.sender.firstName || ""} ${digest.sender.lastName || ""}`.trim() ||
              "System",
            email: digest.sender.email,
          }
        : {
            name: "System",
            email: "system",
          },
      // Format for display
      displayName:
        digest.digestType === "test"
          ? `Test Digest - ${digest.dateRange}`
          : `Weekly Digest - ${digest.dateRange}`,
      displayStatus:
        digest.status === "completed"
          ? `Sent to ${digest.successfulSends} recipient${digest.successfulSends !== 1 ? "s" : ""}`
          : digest.status === "failed"
            ? `Failed - ${digest.errorMessage}`
            : digest.status,
      sentAgo: formatTimeAgo(digest.sentAt),
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
