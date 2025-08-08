// app/api/admin/job-approvals/route.js
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { protectRoute } from "../../../lib/middleware/apiProtection";
import { getPendingJobApprovals, hasJobApprovalPermission } from "../../../lib/jobApprovalService";

export async function GET(req) {
  // Check if user has permission to view approvals
  const authResult = await protectRoute("jobs", "approve");
  if (authResult.error) return authResult.error;

  const { session } = authResult;

  try {
    // Get pending job approvals
    const pendingApprovals = await getPendingJobApprovals(session.user.id);

    return new Response(JSON.stringify({
      success: true,
      approvals: pendingApprovals,
      count: pendingApprovals.length
    }), { status: 200 });

  } catch (error) {
    console.error("Error fetching job approvals:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "Failed to fetch job approvals"
    }), { status: 500 });
  }
}