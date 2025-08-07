// app/api/admin/hire-approvals/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { userHasPermission } from "../../../lib/permissions";
import {
  getPendingHireApprovalRequests,
  getHireApprovalRequestsCount,
  approveHireRequest,
  rejectHireRequest,
} from "../../../lib/hireApprovalUtils";

export async function GET(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has approve_hire permission
    const hasPermission = await userHasPermission(
      session.user.id,
      "applications",
      "approve_hire"
    );
    if (!hasPermission) {
      return NextResponse.json(
        { error: "You do not have permission to view hire approvals" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "pending";

    switch (type) {
      case "count":
        const status = searchParams.get("status") || "pending";
        const count = await getHireApprovalRequestsCount(status);
        return NextResponse.json({ count, status });

      case "pending":
      default:
        const requests = await getPendingHireApprovalRequests();
        return NextResponse.json({
          requests,
          count: requests.length,
          lastUpdated: new Date().toISOString(),
        });
    }
  } catch (error) {
    console.error("Error fetching hire approval requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch hire approval requests" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has approve_hire permission
    const hasPermission = await userHasPermission(
      session.user.id,
      "applications",
      "approve_hire"
    );
    if (!hasPermission) {
      return NextResponse.json(
        { error: "You do not have permission to process hire approvals" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, requestId, notes, changeApplicationStatus } = body;

    if (!requestId) {
      return NextResponse.json(
        { error: "Request ID is required" },
        { status: 400 }
      );
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be approve or reject" },
        { status: 400 }
      );
    }

    let result;
    if (action === "approve") {
      result = await approveHireRequest({
        requestId,
        reviewedBy: session.user.id,
        notes,
      });

      return NextResponse.json({
        success: true,
        message: "Hire request approved successfully",
        data: result,
      });
    } else if (action === "reject") {
      result = await rejectHireRequest({
        requestId,
        reviewedBy: session.user.id,
        notes,
        changeApplicationStatus,
      });

      return NextResponse.json({
        success: true,
        message: "Hire request rejected successfully",
        data: result,
      });
    }
  } catch (error) {
    console.error("Error processing hire approval request:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process hire approval request" },
      { status: 500 }
    );
  }
}
