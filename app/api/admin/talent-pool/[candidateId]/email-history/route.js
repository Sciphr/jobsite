// app/api/admin/talent-pool/[candidateId]/email-history/route.js
import { NextResponse } from "next/server";
import { protectPremiumFeature } from "@/app/lib/middleware/apiProtection";
import { appPrisma } from "@/app/lib/prisma";

/**
 * GET /api/admin/talent-pool/[candidateId]/email-history
 * Get email history for a candidate
 * PREMIUM FEATURE - Requires Applications Manager access
 */
export async function GET(request, { params }) {
  try {
    const authResult = await protectPremiumFeature(request, "Email History Tracking");
    if (authResult.error) return authResult.error;

    const resolvedParams = await params;
    const candidateId = resolvedParams.candidateId;

    // Get candidate to verify they exist
    const candidate = await appPrisma.users.findUnique({
      where: { id: candidateId },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!candidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }

    // Don't show admin users
    if (candidate.role === "admin") {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }

    // Get emails sent to/from this candidate
    // This would typically come from an email tracking table
    // For now, we'll create mock data based on invitations and interactions

    const invitations = await appPrisma.job_invitations.findMany({
      where: { candidate_id: candidateId },
      include: {
        jobs: {
          select: {
            title: true,
          },
        },
        users_job_invitations_invited_byTousers: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { sent_at: "desc" },
      take: 20,
    });

    // Transform invitations into email history format
    const emailHistory = invitations.map((invitation) => ({
      id: invitation.id,
      subject: `Invitation to apply for ${invitation.jobs.title}`,
      preview: invitation.message || "You've been invited to apply for a position that matches your skills...",
      direction: "outbound",
      from: invitation.users_job_invitations_invited_byTousers.email,
      to: candidate.email,
      status: invitation.status === "viewed" ? "opened" :
              invitation.status === "applied" ? "clicked" : "sent",
      sent_at: invitation.sent_at,
      opened_at: invitation.viewed_at,
      clicked_at: invitation.status === "applied" ? invitation.responded_at : null,
      type: "invitation",
      metadata: {
        job_id: invitation.job_id,
        invitation_token: invitation.invitation_token,
      },
    }));

    // In a real implementation, you would also fetch:
    // - Regular email communications
    // - Follow-up emails
    // - Candidate responses
    // - Automated campaign emails
    // These would come from an email tracking table

    return NextResponse.json({
      success: true,
      emails: emailHistory,
      summary: {
        total_sent: emailHistory.filter(e => e.direction === "outbound").length,
        total_received: emailHistory.filter(e => e.direction === "inbound").length,
        opened_rate: emailHistory.filter(e => e.status === "opened" || e.status === "clicked").length / emailHistory.length * 100,
        clicked_rate: emailHistory.filter(e => e.status === "clicked").length / emailHistory.length * 100,
      },
    });
  } catch (error) {
    console.error("Error fetching email history:", error);
    return NextResponse.json(
      { error: "Failed to fetch email history" },
      { status: 500 }
    );
  }
}