// app/api/example/protected-jobs/route.js
import { NextResponse } from "next/server";
import { withPermission } from "@/app/lib/middleware/permissions";
import { RESOURCES, ACTIONS } from "@/app/lib/permissions";

// Example: Simple protection for viewing jobs
export const GET = withPermission(RESOURCES.JOBS, ACTIONS.VIEW, async (request) => {
  // This handler only runs if user has 'jobs:view' permission
  return NextResponse.json({
    message: "You have permission to view jobs!",
    user: request.user.email
  });
});

// Example: Protection for creating jobs
export const POST = withPermission(RESOURCES.JOBS, ACTIONS.CREATE, async (request) => {
  try {
    const jobData = await request.json();
    
    // Additional permission check within handler
    const canFeature = await request.userHasPermission(RESOURCES.JOBS, ACTIONS.FEATURE);
    if (jobData.featured && !canFeature) {
      return NextResponse.json(
        { error: "Cannot create featured jobs without feature permission" },
        { status: 403 }
      );
    }

    // Your job creation logic here
    return NextResponse.json({
      message: "Job created successfully!",
      job: jobData,
      createdBy: request.user.email
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create job" },
      { status: 500 }
    );
  }
});

// Example: Multiple permission check
import { requirePermissions } from "@/app/lib/middleware/permissions";

export const DELETE = requirePermissions([
  { resource: RESOURCES.JOBS, action: ACTIONS.DELETE },
  { resource: RESOURCES.AUDIT_LOGS, action: ACTIONS.VIEW } // Also requires audit log access
])(async (request, { params }) => {
  // This handler only runs if user has BOTH permissions
  return NextResponse.json({
    message: "Job deleted and logged to audit trail",
    user: request.user.email
  });
});