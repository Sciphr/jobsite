// app/api/user/notifications/preferences/route.js
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

    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: {
        email_notifications_enabled: true,
        weekly_digest_enabled: true,
        instant_job_alerts_enabled: true,
        notification_email: true,
        max_daily_notifications: true,
        notification_batch_minutes: true,
        email: true
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      emailNotificationsEnabled: user.email_notifications_enabled ?? true,
      weeklyDigestEnabled: user.weekly_digest_enabled ?? false,
      instantJobAlertsEnabled: user.instant_job_alerts_enabled ?? false,
      notificationEmail: user.notification_email || user.email,
      maxDailyNotifications: user.max_daily_notifications ?? 5,
      notificationBatchMinutes: user.notification_batch_minutes ?? 30,
    });

  } catch (error) {
    console.error("Error fetching notification preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch notification preferences" },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updates = await request.json();

    // Validate the updates
    const allowedFields = [
      'emailNotificationsEnabled',
      'weeklyDigestEnabled', 
      'instantJobAlertsEnabled',
      'notificationEmail',
      'maxDailyNotifications',
      'notificationBatchMinutes'
    ];

    const updateData = {};
    
    if ('emailNotificationsEnabled' in updates) {
      updateData.email_notifications_enabled = Boolean(updates.emailNotificationsEnabled);
    }
    if ('weeklyDigestEnabled' in updates) {
      updateData.weekly_digest_enabled = Boolean(updates.weeklyDigestEnabled);
    }
    if ('instantJobAlertsEnabled' in updates) {
      updateData.instant_job_alerts_enabled = Boolean(updates.instantJobAlertsEnabled);
    }
    if ('notificationEmail' in updates && updates.notificationEmail) {
      updateData.notification_email = updates.notificationEmail;
    }
    if ('maxDailyNotifications' in updates) {
      const maxDaily = parseInt(updates.maxDailyNotifications);
      if (!isNaN(maxDaily) && maxDaily >= 1 && maxDaily <= 50) {
        updateData.max_daily_notifications = maxDaily;
      }
    }
    if ('notificationBatchMinutes' in updates) {
      const batchMinutes = parseInt(updates.notificationBatchMinutes);
      if (!isNaN(batchMinutes) && batchMinutes >= 0 && batchMinutes <= 1440) { // Max 24 hours
        updateData.notification_batch_minutes = batchMinutes;
      }
    }

    const updatedUser = await prisma.users.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        email_notifications_enabled: true,
        weekly_digest_enabled: true,
        instant_job_alerts_enabled: true,
        notification_email: true,
        max_daily_notifications: true,
        notification_batch_minutes: true,
        email: true
      },
    });

    return NextResponse.json({
      emailNotificationsEnabled: updatedUser.email_notifications_enabled ?? true,
      weeklyDigestEnabled: updatedUser.weekly_digest_enabled ?? false,
      instantJobAlertsEnabled: updatedUser.instant_job_alerts_enabled ?? false,
      notificationEmail: updatedUser.notification_email || updatedUser.email,
      maxDailyNotifications: updatedUser.max_daily_notifications ?? 5,
      notificationBatchMinutes: updatedUser.notification_batch_minutes ?? 30,
    });

  } catch (error) {
    console.error("Error updating notification preferences:", error);
    return NextResponse.json(
      { error: "Failed to update notification preferences" },
      { status: 500 }
    );
  }
}