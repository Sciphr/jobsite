// app/api/user/notifications/job-alerts/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PrismaClient } from "@/app/generated/prisma";

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const alerts = await prisma.job_alert_subscriptions.findMany({
      where: { user_id: session.user.id },
      select: {
        id: true,
        department: true,
        keywords: true,
        created_at: true,
        is_active: true
      },
      orderBy: { created_at: 'desc' }
    });

    return NextResponse.json({
      alerts: alerts.map(alert => ({
        id: alert.id,
        department: alert.department,
        keywords: alert.keywords,
        createdAt: alert.created_at,
        isActive: alert.is_active
      }))
    });

  } catch (error) {
    console.error("Error fetching job alerts:", error);
    return NextResponse.json(
      { error: "Failed to fetch job alerts" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { department, keywords } = await request.json();

    // Validate input
    if (!department && !keywords) {
      return NextResponse.json(
        { error: "Either department or keywords must be provided" },
        { status: 400 }
      );
    }

    // Check if user already has this alert
    const existingAlert = await prisma.job_alert_subscriptions.findFirst({
      where: {
        user_id: session.user.id,
        department: department || null,
        keywords: keywords || null
      }
    });

    if (existingAlert) {
      return NextResponse.json(
        { error: "Alert with these criteria already exists" },
        { status: 409 }
      );
    }

    const newAlert = await prisma.job_alert_subscriptions.create({
      data: {
        user_id: session.user.id,
        department: department || null,
        keywords: keywords || null,
        is_active: true
      },
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
        id: newAlert.id,
        department: newAlert.department,
        keywords: newAlert.keywords,
        createdAt: newAlert.created_at,
        isActive: newAlert.is_active
      }
    });

  } catch (error) {
    console.error("Error creating job alert:", error);
    return NextResponse.json(
      { error: "Failed to create job alert" },
      { status: 500 }
    );
  }
}