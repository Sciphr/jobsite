// app/api/admin/weekly-digest/test/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { weeklyDigestService } from "../../../../lib/weeklyDigest";
import { appPrisma } from "../../../../lib/prisma";

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

    console.log("🧪 Test weekly digest requested by:", session.user.email);

    // Get test recipients from settings
    const testRecipientsSettings = await appPrisma.settings.findFirst({
      where: {
        key: "weekly_digest_test_recipients",
        userId: null,
      },
    });

    let testRecipients = [];
    if (testRecipientsSettings) {
      try {
        testRecipients = JSON.parse(testRecipientsSettings.value || "[]");
      } catch (parseError) {
        console.warn("Failed to parse test recipients:", parseError);
      }
    }

    // If no test recipients configured, fall back to the requesting user
    if (!testRecipients || testRecipients.length === 0) {
      testRecipients = [session.user.id];
      console.log(
        "🧪 No test recipients configured, sending to requester only"
      );
    }

    console.log(
      `🧪 Sending test digest to ${testRecipients.length} test recipients`
    );

    // Generate and send to test recipients only
    const result = await weeklyDigestService.generateAndSend(
      testRecipients,
      session.user.id
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Test digest sent successfully to ${result.sent} test recipient(s)`,
        sent: result.sent,
        failed: result.failed || 0,
        testMode: true,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: result.message || "Failed to send test digest",
          error: result.error,
          testMode: true,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("❌ Test weekly digest API error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error: error.message,
        testMode: true,
      },
      { status: 500 }
    );
  }
}
