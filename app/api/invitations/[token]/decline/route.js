// app/api/invitations/[token]/decline/route.js
import { NextResponse } from "next/server";
import { appPrisma } from "@/app/lib/prisma";

/**
 * POST /api/invitations/[token]/decline
 * Decline a job invitation
 */
export async function POST(request, { params }) {
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
          },
        },
        candidate: {
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
        { error: "Invalid invitation token" },
        { status: 404 }
      );
    }

    // Check if invitation has expired
    if (new Date() > new Date(invitation.expires_at)) {
      return NextResponse.json(
        { error: "This invitation has expired" },
        { status: 400 }
      );
    }

    // Check if invitation has already been actioned
    if (["applied", "declined"].includes(invitation.status)) {
      return NextResponse.json(
        { error: `This invitation has already been ${invitation.status}` },
        { status: 400 }
      );
    }

    // Update invitation status to declined
    await appPrisma.job_invitations.update({
      where: { id: invitation.id },
      data: {
        status: "declined",
      },
    });

    // Log interaction
    await appPrisma.talent_pool_interactions.create({
      data: {
        admin_id: invitation.invited_by,
        candidate_id: invitation.candidate_id,
        job_id: invitation.job_id,
        interaction_type: "declined_invitation",
        metadata: {
          invitationId: invitation.id,
          declinedAt: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Invitation declined successfully",
      invitation: {
        jobTitle: invitation.job.title,
        status: "declined",
      },
    });
  } catch (error) {
    console.error("Error declining invitation:", error);
    return NextResponse.json(
      { error: "Failed to decline invitation" },
      { status: 500 }
    );
  }
}
