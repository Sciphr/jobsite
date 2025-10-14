// app/api/admin/integrations/hris/recent-syncs/route.js
import { NextResponse } from "next/server";
import { protectRoute } from "@/app/lib/middleware/apiProtection";
import { appPrisma } from "@/app/lib/prisma";

export async function GET(request) {
  try {
    const authResult = await protectRoute("settings", "read");
    if (authResult.error) return authResult.error;

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");

    // Get recently hired candidates (these would be synced to HRIS)
    // In a full implementation, you'd have a separate sync_history table
    // For now, we'll show hired candidates from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const hiredCandidates = await appPrisma.applications.findMany({
      where: {
        status: "Hired",
        updatedAt: {
          gte: thirtyDaysAgo,
        },
      },
      include: {
        jobs: {
          select: {
            title: true,
            department: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: limit,
    });

    // Format the response
    const formattedSyncs = hiredCandidates.map((app) => ({
      id: app.id,
      candidateName: app.name,
      candidateEmail: app.email,
      jobTitle: app.jobs.title,
      department: app.jobs.department,
      hiredDate: app.updatedAt,
      syncStatus: "synced", // In a real implementation, this would come from a sync_history table
      // TODO: Add actual sync status tracking
    }));

    return NextResponse.json({
      syncs: formattedSyncs,
      total: formattedSyncs.length,
    });
  } catch (error) {
    console.error("Error fetching recent HRIS syncs:", error);
    return NextResponse.json(
      { error: "Failed to fetch recent syncs" },
      { status: 500 }
    );
  }
}
