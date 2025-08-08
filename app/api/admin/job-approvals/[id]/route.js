// app/api/admin/job-approvals/[id]/route.js
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { protectRoute } from "../../../../lib/middleware/apiProtection";
import { approveJob, rejectJob } from "../../../../lib/jobApprovalService";

export async function POST(req, { params }) {
  // Check if user has permission to approve jobs
  const authResult = await protectRoute("jobs", "approve");
  if (authResult.error) return authResult.error;

  const { session } = authResult;
  const { id: approvalRequestId } = await params;

  try {
    const { action, notes, rejectionReason } = await req.json();

    if (!action || !['approve', 'reject'].includes(action)) {
      return new Response(JSON.stringify({
        success: false,
        error: "Invalid action. Must be 'approve' or 'reject'"
      }), { status: 400 });
    }

    let result;
    if (action === 'approve') {
      result = await approveJob(approvalRequestId, session.user.id, notes);
    } else if (action === 'reject') {
      if (!rejectionReason) {
        return new Response(JSON.stringify({
          success: false,
          error: "Rejection reason is required"
        }), { status: 400 });
      }
      result = await rejectJob(approvalRequestId, session.user.id, rejectionReason, notes);
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Job ${action}d successfully`,
      data: result
    }), { status: 200 });

  } catch (error) {
    console.error(`Error ${action}ing job:`, error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || `Failed to ${action} job`
    }), { status: 500 });
  }
}