// app/api/admin/talent-pool/analytics/route.js
import { NextResponse } from "next/server";
import { protectPremiumFeature } from "@/app/lib/middleware/apiProtection";
import { appPrisma } from "@/app/lib/prisma";

/**
 * GET /api/admin/talent-pool/analytics
 * Get analytics data for talent pool
 * PREMIUM FEATURE - Requires Applications Manager access
 */
export async function GET(request) {
  try {
    const authResult = await protectPremiumFeature(request, "Talent Pool Analytics");
    if (authResult.error) return authResult.error;

    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "30d";

    // Calculate date range
    const endDate = new Date();
    let startDate = new Date();

    switch (range) {
      case "7d":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(startDate.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(startDate.getDate() - 90);
        break;
      case "1y":
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Get total candidates
    const totalCandidates = await appPrisma.users.count({
      where: {
        role: { not: "admin" },
      },
    });

    // Get candidates added in time range
    const newCandidates = await appPrisma.users.count({
      where: {
        role: { not: "admin" },
        createdAt: { gte: startDate },
      },
    });

    // Get active invitations
    const activeInvitations = await appPrisma.job_invitations.count({
      where: {
        status: { in: ["sent", "viewed"] },
        expires_at: { gt: new Date() },
      },
    });

    // Get invitation metrics
    const invitationStats = await appPrisma.job_invitations.groupBy({
      by: ["status"],
      _count: { status: true },
      where: {
        created_at: { gte: startDate },
      },
    });

    const invitationMetrics = {
      sent: 0,
      viewed: 0,
      applied: 0,
      declined: 0,
      expired: 0,
    };

    invitationStats.forEach((stat) => {
      invitationMetrics[stat.status] = stat._count.status;
    });

    const totalInvitations = Object.values(invitationMetrics).reduce((a, b) => a + b, 0);
    const respondedInvitations = invitationMetrics.applied + invitationMetrics.declined;
    const responseRate = totalInvitations > 0
      ? ((respondedInvitations / totalInvitations) * 100).toFixed(1)
      : 0;

    // Get sourced candidates
    const sourcedCandidates = await appPrisma.applications.count({
      where: {
        source_type: "sourced",
        appliedAt: { gte: startDate },
      },
    });

    // Get sourcing metrics by status
    const sourcingByStatus = await appPrisma.applications.groupBy({
      by: ["status"],
      _count: { status: true },
      where: {
        source_type: "sourced",
        appliedAt: { gte: startDate },
      },
    });

    const sourcingMetrics = {
      Applied: 0,
      Reviewing: 0,
      Interview: 0,
      Hired: 0,
      Rejected: 0,
    };

    sourcingByStatus.forEach((stat) => {
      if (sourcingMetrics.hasOwnProperty(stat.status)) {
        sourcingMetrics[stat.status] = stat._count.status;
      }
    });

    // Get hired sourced candidates for conversion rate
    const hiredSourced = sourcingMetrics.Hired || 0;
    const conversionRate = sourcedCandidates > 0
      ? ((hiredSourced / sourcedCandidates) * 100).toFixed(1)
      : 0;

    // Get top skills
    const allCandidates = await appPrisma.users.findMany({
      where: { role: { not: "admin" } },
      select: { skills: true },
    });

    const skillCounts = {};
    allCandidates.forEach((candidate) => {
      if (candidate.skills && Array.isArray(candidate.skills)) {
        candidate.skills.forEach((skill) => {
          skillCounts[skill] = (skillCounts[skill] || 0) + 1;
        });
      }
    });

    const topSkills = Object.entries(skillCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({
        name,
        count,
        percentage: ((count / totalCandidates) * 100).toFixed(1),
      }));

    // Get top locations
    const locationStats = await appPrisma.users.groupBy({
      by: ["location"],
      _count: { location: true },
      where: {
        role: { not: "admin" },
        location: { not: null },
      },
      orderBy: {
        _count: {
          location: "desc",
        },
      },
      take: 5,
    });

    const topLocations = locationStats.map((stat) => ({
      name: stat.location,
      count: stat._count.location,
      percentage: ((stat._count.location / totalCandidates) * 100).toFixed(1),
    }));

    // Get activity timeline (last 7 days)
    const activityTimeline = [];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));

      const invitations = await appPrisma.job_invitations.count({
        where: {
          created_at: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
      });

      const sourcings = await appPrisma.applications.count({
        where: {
          source_type: "sourced",
          appliedAt: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
      });

      const interactions = await appPrisma.talent_pool_interactions.count({
        where: {
          created_at: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
      });

      activityTimeline.push({
        date: dayNames[dayStart.getDay()],
        invitations,
        sourcings,
        interactions,
      });
    }

    // Calculate percentage changes (mock for now - you'd compare with previous period)
    const calculateChange = () => Math.random() * 20 - 10; // Random between -10 and +10

    return NextResponse.json({
      overview: {
        totalCandidates,
        totalCandidatesChange: calculateChange(),
        activeInvitations,
        activeInvitationsChange: calculateChange(),
        sourcedCandidates,
        sourcedCandidatesChange: calculateChange(),
        responseRate: parseFloat(responseRate),
        responseRateChange: calculateChange(),
      },
      invitationMetrics: {
        ...invitationMetrics,
        responseRate: parseFloat(responseRate),
        averageResponseTime: "2.3 days", // Would need to calculate from actual data
      },
      sourcingMetrics: {
        totalSourced: sourcedCandidates,
        byStatus: sourcingMetrics,
        conversionRate: parseFloat(conversionRate),
        averageTimeToHire: "18 days", // Would need to calculate from actual data
      },
      topPerformers: {
        skills: topSkills,
        locations: topLocations,
      },
      activityTimeline,
      timeRange: range,
    });
  } catch (error) {
    console.error("Error fetching talent pool analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}