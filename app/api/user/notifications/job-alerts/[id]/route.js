// app/api/user/notifications/job-alerts/[id]/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PrismaClient } from "@/app/generated/prisma";

const prisma = new PrismaClient();

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: alertId } = await params;

    // Verify the alert belongs to the user
    const alert = await prisma.job_alert_subscriptions.findFirst({
      where: {
        id: alertId,
        user_id: session.user.id
      }
    });

    if (!alert) {
      return NextResponse.json(
        { error: "Alert not found or not authorized" },
        { status: 404 }
      );
    }

    await prisma.job_alert_subscriptions.delete({
      where: { id: alertId }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error deleting job alert:", error);
    return NextResponse.json(
      { error: "Failed to delete job alert" },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: alertId } = await params;
    const { isActive } = await request.json();

    // Verify the alert belongs to the user
    const alert = await prisma.job_alert_subscriptions.findFirst({
      where: {
        id: alertId,
        user_id: session.user.id
      }
    });

    if (!alert) {
      return NextResponse.json(
        { error: "Alert not found or not authorized" },
        { status: 404 }
      );
    }

    const updatedAlert = await prisma.job_alert_subscriptions.update({
      where: { id: alertId },
      data: { is_active: Boolean(isActive) },
      select: {
        id: true,
        department: true,
        keywords: true,
        created_at: true,
        is_active: true
      }
    });

    return NextResponse.json({
      alert: {
        id: updatedAlert.id,
        department: updatedAlert.department,
        keywords: updatedAlert.keywords,
        createdAt: updatedAlert.created_at,
        isActive: updatedAlert.is_active
      }
    });

  } catch (error) {
    console.error("Error updating job alert:", error);
    return NextResponse.json(
      { error: "Failed to update job alert" },
      { status: 500 }
    );
  }
}