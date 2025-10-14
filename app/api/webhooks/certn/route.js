// app/api/webhooks/certn/route.js
import { NextResponse } from "next/server";
import { appPrisma } from "@/app/lib/prisma";
import { logAuditEvent } from "@/lib/auditMiddleware";

/**
 * CERTN Webhook Handler
 *
 * CERTN sends webhooks when background check status changes.
 * This endpoint receives those webhooks and updates our database accordingly.
 *
 * Webhook events include:
 * - application.created
 * - application.updated
 * - application.completed
 * - application.status_changed
 *
 * Configure webhook URL in CERTN dashboard:
 * https://your-domain.com/api/webhooks/certn
 */

export async function POST(request) {
  try {
    const body = await request.json();

    console.log("📩 CERTN Webhook received:", {
      event: body.event,
      applicationId: body.data?.id,
      status: body.data?.status,
    });

    // Validate webhook payload
    if (!body.event || !body.data) {
      console.error("❌ Invalid webhook payload");
      return NextResponse.json(
        { error: "Invalid webhook payload" },
        { status: 400 }
      );
    }

    const { event, data } = body;

    // Handle different webhook events
    switch (event) {
      case "application.created":
      case "application.updated":
      case "application.status_changed":
      case "application.completed":
        await handleApplicationStatusUpdate(data);
        break;

      default:
        console.log(`ℹ️  Unhandled CERTN webhook event: ${event}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("❌ Error processing CERTN webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function handleApplicationStatusUpdate(data) {
  try {
    const certnApplicationId = data.id;
    const certnStatus = data.status; // CERTN statuses: pending, in_progress, complete, disputed, suspended

    // Find the background check by CERTN application ID
    const backgroundCheck = await appPrisma.background_checks.findFirst({
      where: {
        certn_application_id: certnApplicationId,
      },
      include: {
        applications: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!backgroundCheck) {
      console.warn(`⚠️  Background check not found for CERTN application ${certnApplicationId}`);
      return;
    }

    // Map CERTN status to our status
    const statusMapping = {
      pending: "pending",
      in_progress: "pending",
      complete: "complete",
      clear: "complete",
      disputed: "consider",
      consider: "consider",
      suspended: "suspended",
    };

    const ourStatus = statusMapping[certnStatus?.toLowerCase()] || "pending";
    const isComplete = ourStatus === "complete" || ourStatus === "consider" || ourStatus === "suspended";

    // Update background check status
    const updated = await appPrisma.background_checks.update({
      where: {
        id: backgroundCheck.id,
      },
      data: {
        status: ourStatus,
        completed_at: isComplete && !backgroundCheck.completed_at ? new Date() : backgroundCheck.completed_at,
        certn_report_url: data.report_url || data.url || backgroundCheck.certn_report_url,
        metadata: {
          ...backgroundCheck.metadata,
          latestWebhook: {
            receivedAt: new Date().toISOString(),
            certnStatus,
            event: data.event || "status_update",
            additionalData: {
              adjudication: data.adjudication,
              result: data.result,
            },
          },
        },
        updated_at: new Date(),
      },
    });

    console.log(`✅ Updated background check ${backgroundCheck.id} to status: ${ourStatus}`);

    // Add application note about status change
    await appPrisma.application_notes.create({
      data: {
        application_id: backgroundCheck.application_id,
        content: `Background check status updated: ${ourStatus}${isComplete ? " (completed)" : ""}`,
        type: "background_check",
        is_system_generated: true,
        metadata: {
          backgroundCheckId: backgroundCheck.id,
          certnApplicationId,
          previousStatus: backgroundCheck.status,
          newStatus: ourStatus,
          webhookEvent: data.event || "status_update",
        },
      },
    });

    // Log audit event
    await logAuditEvent({
      eventType: "UPDATE",
      category: "BACKGROUND_CHECK",
      subcategory: "WEBHOOK_UPDATE",
      entityType: "background_check",
      entityId: backgroundCheck.id,
      entityName: backgroundCheck.applications.name || backgroundCheck.applications.email,
      actorType: "system",
      actorName: "CERTN Webhook",
      action: "Update background check status via webhook",
      description: `Background check status updated from ${backgroundCheck.status} to ${ourStatus} via CERTN webhook`,
      relatedApplicationId: backgroundCheck.application_id,
      metadata: {
        certnApplicationId,
        previousStatus: backgroundCheck.status,
        newStatus: ourStatus,
        certnStatus,
        isComplete,
      },
    });

    // TODO: Send email notification to HR when check completes
    // if (isComplete) {
    //   await sendBackgroundCheckCompleteEmail(backgroundCheck);
    // }

  } catch (error) {
    console.error("❌ Error handling CERTN application status update:", error);
    throw error;
  }
}

// Verify webhook signature (if CERTN provides signing)
// This is a placeholder - check CERTN docs for actual signature verification
function verifyWebhookSignature(payload, signature, secret) {
  // TODO: Implement signature verification if CERTN supports it
  // const crypto = require('crypto');
  // const expectedSignature = crypto
  //   .createHmac('sha256', secret)
  //   .update(JSON.stringify(payload))
  //   .digest('hex');
  // return signature === expectedSignature;
  return true;
}
