// app/api/test-email/route.js
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { sendTestEmail, testEmailConfiguration } from "../../lib/email";

export async function POST(req) {
  const session = await getServerSession(authOptions);

  // Only allow admins to test email
  if (
    !session ||
    !session.user.privilegeLevel ||
    session.user.privilegeLevel < 1
  ) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
    });
  }

  try {
    const { email, testType } = await req.json();

    if (testType === "configuration") {
      // Test email configuration without sending an email
      console.log("🧪 Testing email configuration...");
      const result = await testEmailConfiguration();

      return new Response(
        JSON.stringify({
          message: result.success
            ? "Email configuration test successful"
            : "Email configuration test failed",
          ...result,
        }),
        { status: result.success ? 200 : 500 }
      );
    }

    if (!email) {
      return new Response(
        JSON.stringify({ message: "Email address is required" }),
        { status: 400 }
      );
    }

    console.log(`🧪 Testing email to: ${email}`);

    const result = await sendTestEmail(email);

    if (result.success) {
      return new Response(
        JSON.stringify({
          message: "Test email sent successfully",
          provider: result.provider,
          data: result.data,
        }),
        { status: 200 }
      );
    } else {
      return new Response(
        JSON.stringify({
          message: "Failed to send test email",
          error: result.error,
        }),
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Test email error:", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}
