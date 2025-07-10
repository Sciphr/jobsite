// app/api/admin/weekly-digest/route.js
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { weeklyDigestService } from "../../../lib/weeklyDigest";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is admin (privilege level 1 or higher for testing)
    if (
      !session ||
      !session.user.privilegeLevel ||
      session.user.privilegeLevel < 1
    ) {
      return new Response(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
      });
    }

    console.log("📧 Manual weekly digest triggered by:", session.user.email);

    const result = await weeklyDigestService.generateAndSend();

    if (result.success) {
      return new Response(
        JSON.stringify({
          message: "Weekly digest sent successfully",
          sent: result.sent,
          failed: result.failed,
          details: result.results,
        }),
        { status: 200 }
      );
    } else {
      return new Response(
        JSON.stringify({
          message: "Failed to send weekly digest",
          error: result.error,
        }),
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Weekly digest API error:", error);
    return new Response(
      JSON.stringify({
        message: "Internal server error",
        error: error.message,
      }),
      { status: 500 }
    );
  }
}

// GET method for testing data collection (without sending emails)
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !session.user.privilegeLevel ||
      session.user.privilegeLevel < 1
    ) {
      return new Response(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
      });
    }

    console.log(
      "🔍 Weekly digest data preview requested by:",
      session.user.email
    );

    // Just collect data without sending emails
    weeklyDigestService.calculateDateRanges();
    const digestData = await weeklyDigestService.collectWeeklyData();

    return new Response(
      JSON.stringify({
        message: "Weekly digest data preview",
        data: digestData,
        preview: true,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Weekly digest preview error:", error);
    return new Response(
      JSON.stringify({
        message: "Internal server error",
        error: error.message,
      }),
      { status: 500 }
    );
  }
}
