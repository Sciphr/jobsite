// app/api/admin/talent-pool/[candidateId]/invite/route.js
import { NextResponse } from "next/server";
import { protectRoute } from "@/app/lib/middleware/apiProtection";
import { appPrisma } from "@/app/lib/prisma";
import { logAuditEvent } from "@/lib/auditMiddleware";
import { sendJobInvitation } from "@/app/lib/email";
import { getSystemSetting } from "@/app/lib/settings";
import crypto from "crypto";

/**
 * POST /api/admin/talent-pool/[candidateId]/invite
 * Send a job invitation to a talent pool candidate
 * Body: { jobId, subject, content, customMessage, templateId }
 */
export async function POST(request, { params }) {
  try {
    const authResult = await protectRoute("talent_pool", "invite");
    if (authResult.error) return authResult.error;

    const session = authResult.session;
    const resolvedParams = await params;
    const candidateId = resolvedParams.candidateId;
    const { jobId, subject, content, customMessage, templateId } = await request.json();

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    // Verify candidate exists
    const candidate = await appPrisma.users.findUnique({
      where: { id: candidateId },
      select: {
        id: true,
        name: true,
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

    if (candidate.role === "admin") {
      return NextResponse.json(
        { error: "Cannot invite admin users" },
        { status: 400 }
      );
    }

    // Verify job exists
    const job = await appPrisma.jobs.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    if (job.status !== "Active") {
      return NextResponse.json(
        { error: "Cannot invite to inactive job" },
        { status: 400 }
      );
    }

    // Check if candidate already has an application for this job
    const existingApplication = await appPrisma.applications.findFirst({
      where: {
        job_id: jobId,
        user_id: candidateId,
      },
    });

    if (existingApplication) {
      return NextResponse.json(
        { error: "Candidate has already applied to this job" },
        { status: 400 }
      );
    }

    // Check if there's already an active invitation
    const existingInvitation = await appPrisma.job_invitations.findFirst({
      where: {
        job_id: jobId,
        candidate_id: candidateId,
        status: { in: ["sent", "viewed"] },
      },
    });

    if (existingInvitation) {
      return NextResponse.json(
        { error: "An active invitation already exists for this candidate and job" },
        { status: 400 }
      );
    }

    // Generate invitation token
    const invitationToken = crypto.randomBytes(32).toString("hex");

    // Set expiration to 30 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Create invitation with template info
    const invitation = await appPrisma.job_invitations.create({
      data: {
        job_id: jobId,
        candidate_id: candidateId,
        invited_by: session.user.id,
        invitation_token: invitationToken,
        message: customMessage || null,
        status: "sent",
        expires_at: expiresAt,
        metadata: templateId ? { templateId, subject, content } : {},
      },
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

    // Log talent pool interaction
    await appPrisma.talent_pool_interactions.create({
      data: {
        admin_id: session.user.id,
        candidate_id: candidateId,
        job_id: jobId,
        interaction_type: "sent_invitation",
        notes: customMessage || null,
        metadata: {
          invitationId: invitation.id,
          invitationToken,
          expiresAt: expiresAt.toISOString(),
          templateId: templateId || null,
        },
      },
    });

    // Log audit event
    await logAuditEvent({
      eventType: "CREATE",
      category: "TALENT_POOL",
      subcategory: "INVITE",
      entityType: "job_invitation",
      entityId: invitation.id,
      entityName: `Invitation to ${job.title}`,
      actorId: session.user.id,
      actorName: session.user.name || session.user.email,
      actorType: "user",
      action: "Send job invitation",
      description: `Invited ${candidate.name || candidate.email} to apply for ${job.title}`,
      metadata: {
        candidateId,
        candidateName: candidate.name,
        candidateEmail: candidate.email,
        jobId,
        jobTitle: job.title,
        invitationToken,
        expiresAt: expiresAt.toISOString(),
        hasCustomMessage: !!message,
      },
    });

    // Send email notification to candidate with template content
    const companyName = await getSystemSetting("site_name", "Our Company");

    // Use template subject and content if provided, otherwise use defaults
    const emailSubject = subject || `You're invited to apply for ${job.title} at ${companyName}`;
    const emailContent = content || `Hi ${candidate.name || 'there'},\n\nYou've been invited to apply for the ${job.title} position at ${companyName}.`;

    const emailResult = await sendJobInvitation({
      candidateEmail: candidate.email,
      candidateName: candidate.name,
      jobTitle: job.title,
      jobSlug: job.slug,
      invitationToken,
      customMessage: customMessage,
      invitedByName: session.user.name || session.user.email,
      companyName,
      expiresAt,
      subject: emailSubject,
      content: emailContent,
    });

    if (!emailResult.success) {
      console.error("Failed to send invitation email:", emailResult.error);
      // Don't fail the request - invitation was created successfully
      // Just log the error for admin awareness
    }

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        token: invitationToken,
        expiresAt,
        job: invitation.job,
        candidate: invitation.candidate,
      },
      message: "Invitation sent successfully",
    });
  } catch (error) {
    console.error("Error sending job invitation:", error);
    return NextResponse.json(
      { error: "Failed to send job invitation" },
      { status: 500 }
    );
  }
}
