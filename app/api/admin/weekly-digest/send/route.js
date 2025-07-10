import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { weeklyDigestService } from "../../../../lib/weeklyDigest";

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

    console.log("📧 Weekly digest requested by:", session.user.email);

    const result = await weeklyDigestService.generateAndSend();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Weekly digest sent successfully",
        sent: result.sent,
        failed: result.failed || 0,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: result.message || "Failed to send weekly digest",
          error: result.error,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("❌ Weekly digest API error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
