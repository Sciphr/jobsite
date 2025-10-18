// app/api/invitations/[token]/route.js
import { NextResponse } from "next/server";
import { appPrisma } from "@/app/lib/prisma";

/**
 * GET /api/invitations/[token]
 * Validate an invitation token and return invitation details
 */
export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const token = resolvedParams.token;

    if (!token) {
      return NextResponse.json(
        { error: "Invitation token is required" },
        { status: 400 }
      );
    }

    // Find invitation by token
    const invitation = await appPrisma.job_invitations.findUnique({
      where: { invitation_token: token },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
          },
        },
        candidate: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        invited_by_user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        {
          valid: false,
          error: "Invalid invitation token",
          reason: "not_found"
        },
        { status: 404 }
      );
    }

    // Check if invitation has expired
    if (new Date() > new Date(invitation.expires_at)) {
      // Update invitation status to expired if not already
      if (invitation.status !== "expired") {
        await appPrisma.job_invitations.update({
          where: { id: invitation.id },
          data: { status: "expired" },
        });
      }

      return NextResponse.json({
        valid: false,
        error: "This invitation has expired",
        reason: "expired",
        invitation: {
          jobTitle: invitation.job.title,
          expiredAt: invitation.expires_at,
        },
      });
    }

    // Check if job is still active
    if (invitation.job.status !== "Active") {
      return NextResponse.json({
        valid: false,
        error: "This job is no longer active",
        reason: "job_inactive",
        invitation: {
          jobTitle: invitation.job.title,
        },
      });
    }

    // Check if invitation has already been used (applied or declined)
    if (["applied", "declined"].includes(invitation.status)) {
      return NextResponse.json({
        valid: false,
        error: `This invitation has already been ${invitation.status}`,
        reason: invitation.status,
        invitation: {
          jobTitle: invitation.job.title,
        },
      });
    }

    // Mark as viewed if still in "sent" status
    if (invitation.status === "sent") {
      await appPrisma.job_invitations.update({
        where: { id: invitation.id },
        data: {
          status: "viewed",
          viewed_at: new Date(),
        },
      });

      // Log interaction
      await appPrisma.talent_pool_interactions.create({
        data: {
          admin_id: invitation.invited_by,
          candidate_id: invitation.candidate_id,
          job_id: invitation.job_id,
          interaction_type: "viewed_invitation",
          metadata: {
            invitationId: invitation.id,
            viewedAt: new Date().toISOString(),
          },
        },
      });
    }

    // Invitation is valid
    return NextResponse.json({
      valid: true,
      invitation: {
        id: invitation.id,
        jobId: invitation.job.id,
        jobTitle: invitation.job.title,
        jobSlug: invitation.job.slug,
        candidateId: invitation.candidate_id,
        candidateName: invitation.candidate.name,
        candidateEmail: invitation.candidate.email,
        message: invitation.message,
        invitedBy: invitation.invited_by_user.name || invitation.invited_by_user.email,
        sentAt: invitation.sent_at,
        expiresAt: invitation.expires_at,
        status: "viewed", // Always return viewed since we just marked it
      },
    });
  } catch (error) {
    console.error("Error validating invitation:", error);
    return NextResponse.json(
      {
        valid: false,
        error: "Failed to validate invitation"
      },
      { status: 500 }
    );
  }
}
