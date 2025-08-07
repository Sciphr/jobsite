import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { getBulkHireApprovalStatus } from "../../../../lib/statusChangeHandler";

export async function POST(req) {
  const session = await getServerSession(authOptions);

  // Check if user is admin (privilege level 1 or higher)
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
    const body = await req.json();
    const { applicationIds } = body;

    if (!applicationIds || !Array.isArray(applicationIds)) {
      return new Response(
        JSON.stringify({ message: "applicationIds array is required" }),
        {
          status: 400,
        }
      );
    }

    const hireApprovalStatus = await getBulkHireApprovalStatus(applicationIds);

    return new Response(JSON.stringify({ success: true, hireApprovalStatus }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error fetching hire approval status:", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}