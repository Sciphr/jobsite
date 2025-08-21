// app/api/jobs/notifications/route.js
import { NextResponse } from "next/server";
import { PrismaClient } from "@/app/generated/prisma";
import nodemailer from "nodemailer";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();

// This endpoint will be called when a new job is created
export async function POST(request) {
  try {
    const { jobId } = await request.json();

    if (!jobId) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
    }

    // Get the job details
    const job = await prisma.jobs.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        title: true,
        department: true,
        location: true,
        employment_types: {
          select: {
            name: true
          }
        },
        remote_policies: {
          select: {
            name: true
          }
        },
        categories: {
          select: {
            name: true
          }
        },
        description: true,
        requirements: true,
        salaryMin: true,
        salaryMax: true,
        salaryCurrency: true,
        slug: true,
        createdAt: true
      }
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    console.log(`🔔 Processing job alerts for new job: ${job.title}`);

    // Get all active job alert subscriptions with user rate limiting info
    const subscriptions = await prisma.job_alert_subscriptions.findMany({
      where: { is_active: true },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            email_notifications_enabled: true,
            instant_job_alerts_enabled: true,
            weekly_digest_enabled: true,
            notification_email: true,
            max_daily_notifications: true,
            notification_batch_minutes: true,
            last_notification_sent_at: true
          }
        }
      }
    });

    console.log(`📊 Found ${subscriptions.length} active job alert subscriptions`);

    const matchedSubscriptions = [];
    const batchedUsers = new Map(); // Group users for batching

    // Check each subscription for matches
    for (const subscription of subscriptions) {
      const user = subscription.user;
      
      // Skip if user doesn't have email notifications enabled
      if (!user.email_notifications_enabled) {
        continue;
      }

      // Check if user has hit their daily notification limit
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const todayNotificationCount = await prisma.notification_logs.count({
        where: {
          user_id: user.id,
          sent_at: {
            gte: todayStart
          }
        }
      });

      if (todayNotificationCount >= (user.max_daily_notifications || 5)) {
        console.log(`⏸️  User ${user.email} has reached daily notification limit (${user.max_daily_notifications || 5})`);
        continue;
      }

      // Check if user is within batch window to prevent spam
      const batchMinutes = user.notification_batch_minutes || 30;
      const lastNotificationTime = user.last_notification_sent_at;
      
      if (lastNotificationTime) {
        const timeSinceLastNotification = now - new Date(lastNotificationTime);
        const minutesSinceLastNotification = timeSinceLastNotification / (1000 * 60);
        
        if (minutesSinceLastNotification < batchMinutes) {
          // Add to batch instead of sending immediately
          if (!batchedUsers.has(user.id)) {
            batchedUsers.set(user.id, {
              user,
              jobs: [],
              subscriptions: []
            });
          }
          
          const userBatch = batchedUsers.get(user.id);
          let isMatch = false;

          // Check department match
          if (subscription.department) {
            if (job.department && job.department.toLowerCase() === subscription.department.toLowerCase()) {
              isMatch = true;
            }
          }

          // Check keywords match
          if (subscription.keywords && !isMatch) {
            const keywords = subscription.keywords.split(',').map(k => k.trim().toLowerCase());
            const jobText = `${job.title} ${job.description} ${job.requirements}`.toLowerCase();
            
            for (const keyword of keywords) {
              if (keyword && jobText.includes(keyword)) {
                isMatch = true;
                break;
              }
            }
          }

          if (isMatch) {
            userBatch.jobs.push(job);
            userBatch.subscriptions.push(subscription);
            console.log(`📦 Added job to batch for user ${user.email} (${minutesSinceLastNotification.toFixed(1)} min since last notification)`);
          }
          continue;
        }
      }

      let isMatch = false;

      // Check department match
      if (subscription.department) {
        if (job.department && job.department.toLowerCase() === subscription.department.toLowerCase()) {
          isMatch = true;
          console.log(`✅ Department match for user ${user.email}: ${subscription.department}`);
        }
      }

      // Check keywords match
      if (subscription.keywords && !isMatch) {
        const keywords = subscription.keywords.split(',').map(k => k.trim().toLowerCase());
        const jobText = `${job.title} ${job.description} ${job.requirements}`.toLowerCase();
        
        for (const keyword of keywords) {
          if (keyword && jobText.includes(keyword)) {
            isMatch = true;
            console.log(`✅ Keyword match for user ${user.email}: "${keyword}"`);
            break;
          }
        }
      }

      if (isMatch) {
        matchedSubscriptions.push({
          subscription,
          user,
          isInstant: user.instant_job_alerts_enabled && subscription.keywords // Keywords = instant alerts
        });
      }
    }

    console.log(`🎯 Found ${matchedSubscriptions.length} matching subscriptions`);
    console.log(`📦 Found ${batchedUsers.size} users with batched notifications`);

    // Send instant notifications
    const instantNotifications = matchedSubscriptions.filter(m => m.isInstant);
    if (instantNotifications.length > 0) {
      console.log(`📧 Sending ${instantNotifications.length} instant notifications`);
      await sendInstantJobAlerts([job], instantNotifications);
    }

    // Send batched notifications
    let batchedNotificationsSent = 0;
    if (batchedUsers.size > 0) {
      console.log(`📧 Sending ${batchedUsers.size} batched notifications`);
      for (const [userId, batch] of batchedUsers) {
        if (batch.jobs.length > 0) {
          await sendBatchedJobAlerts(batch.jobs, [{
            user: batch.user,
            subscriptions: batch.subscriptions
          }]);
          batchedNotificationsSent++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      processedJob: job.title,
      totalSubscriptions: subscriptions.length,
      matchedSubscriptions: matchedSubscriptions.length,
      instantNotificationsSent: instantNotifications.length,
      batchedNotificationsSent
    });

  } catch (error) {
    console.error("Error processing job notifications:", error);
    return NextResponse.json(
      { error: "Failed to process job notifications" },
      { status: 500 }
    );
  }
}

async function sendInstantJobAlerts(jobs, notifications) {
  // Get email configuration from settings
  let transporter;
  let emailConfig;
  try {
    emailConfig = await getEmailConfig();
    transporter = nodemailer.createTransporter(emailConfig);
  } catch (error) {
    console.error("Failed to create email transporter:", error);
    return;
  }

  for (const { user, subscription } of notifications) {
    try {
      const emailAddress = user.notification_email || user.email;
      const userName = user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Job Seeker';

      const emailContent = jobs.length === 1 ? 
        generateJobAlertEmail(jobs[0], userName) : 
        generateBatchedJobAlertEmail(jobs, userName);

      const subject = jobs.length === 1 ? 
        `New Job Alert: ${jobs[0].title}` :
        `${jobs.length} New Job Alerts`;

      await transporter.sendMail({
        from: emailConfig.from,
        to: emailAddress,
        subject,
        html: emailContent
      });

      // Log notifications and update user's last notification time
      const batchId = jobs.length > 1 ? uuidv4() : null;
      const notificationPromises = jobs.map(job => 
        prisma.notification_logs.create({
          data: {
            user_id: user.id,
            job_id: job.id,
            subscription_id: subscription.id,
            notification_type: 'instant',
            email_address: emailAddress,
            batch_id: batchId
          }
        })
      );

      await Promise.all([
        ...notificationPromises,
        prisma.users.update({
          where: { id: user.id },
          data: { last_notification_sent_at: new Date() }
        })
      ]);

      console.log(`✅ Sent instant job alert to ${emailAddress} for ${jobs.length} job(s)`);
    } catch (error) {
      console.error(`❌ Failed to send email to ${user.email}:`, error);
    }
  }
}

async function sendBatchedJobAlerts(jobs, userBatches) {
  // Get email configuration from settings
  let transporter;
  let emailConfig;
  try {
    emailConfig = await getEmailConfig();
    transporter = nodemailer.createTransporter(emailConfig);
  } catch (error) {
    console.error("Failed to create email transporter:", error);
    return;
  }

  for (const { user, subscriptions } of userBatches) {
    try {
      const emailAddress = user.notification_email || user.email;
      const userName = user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Job Seeker';

      const emailContent = generateBatchedJobAlertEmail(jobs, userName);
      const subject = `${jobs.length} New Job Alerts - Batched Update`;

      await transporter.sendMail({
        from: emailConfig.from,
        to: emailAddress,
        subject,
        html: emailContent
      });

      // Log notifications and update user's last notification time
      const batchId = uuidv4();
      const notificationPromises = jobs.map((job, index) => 
        prisma.notification_logs.create({
          data: {
            user_id: user.id,
            job_id: job.id,
            subscription_id: subscriptions[index]?.id || subscriptions[0].id,
            notification_type: 'digest_batch',
            email_address: emailAddress,
            batch_id: batchId
          }
        })
      );

      await Promise.all([
        ...notificationPromises,
        prisma.users.update({
          where: { id: user.id },
          data: { last_notification_sent_at: new Date() }
        })
      ]);

      console.log(`✅ Sent batched job alert to ${emailAddress} for ${jobs.length} job(s)`);
    } catch (error) {
      console.error(`❌ Failed to send batched email to ${user.email}:`, error);
    }
  }
}

async function getEmailConfig() {
  const [hostSetting, portSetting, userSetting, passSetting, fromSetting] = await Promise.all([
    prisma.settings.findFirst({ where: { key: 'smtp_host' } }),
    prisma.settings.findFirst({ where: { key: 'smtp_port' } }),
    prisma.settings.findFirst({ where: { key: 'smtp_user' } }),
    prisma.settings.findFirst({ where: { key: 'smtp_password' } }),
    prisma.settings.findFirst({ where: { key: 'from_email' } })
  ]);

  if (!hostSetting?.value || !userSetting?.value || !passSetting?.value) {
    throw new Error('Email configuration incomplete');
  }

  return {
    host: hostSetting.value,
    port: parseInt(portSetting?.value || '587'),
    secure: parseInt(portSetting?.value || '587') === 465,
    auth: {
      user: userSetting.value,
      pass: passSetting.value
    },
    from: fromSetting?.value || userSetting.value
  };
}

function generateJobAlertEmail(job, userName) {
  const jobUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/jobs/${job.slug}`;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New Job Alert</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #2563eb; margin: 0;">🎯 New Job Alert</h2>
        <p style="margin: 5px 0 0 0; color: #6b7280;">A new job matching your criteria has been posted!</p>
      </div>

      <div style="background-color: white; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 10px 0; color: #1f2937;">${job.title}</h3>
        
        <div style="margin: 10px 0;">
          <span style="background-color: #eff6ff; color: #1d4ed8; padding: 4px 8px; border-radius: 4px; font-size: 14px;">
            ${job.department || 'General'}
          </span>
        </div>

        <div style="margin: 15px 0; color: #6b7280; font-size: 14px;">
          <div style="margin: 5px 0;">📍 ${job.location || 'Not specified'}</div>
          <div style="margin: 5px 0;">💼 ${job.employment_types?.name || 'Not specified'}</div>
          <div style="margin: 5px 0;">🏠 ${job.remote_policies?.name || 'Not specified'}</div>
          ${job.salaryMin && job.salaryMax ? 
            `<div style="margin: 5px 0;">💰 ${job.salaryCurrency || '$'}${job.salaryMin.toLocaleString()} - ${job.salaryCurrency || '$'}${job.salaryMax.toLocaleString()}</div>` 
            : ''
          }
        </div>

        ${job.description ? 
          `<div style="margin: 15px 0;">
            <p style="margin: 0; color: #4b5563;">${job.description.substring(0, 200)}${job.description.length > 200 ? '...' : ''}</p>
          </div>` 
          : ''
        }

        <div style="margin: 20px 0;">
          <a href="${jobUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
            View Job Details
          </a>
        </div>
      </div>

      <div style="text-align: center; color: #9ca3af; font-size: 12px; padding: 20px 0; border-top: 1px solid #e5e7eb;">
        <p>This email was sent because you have job alerts enabled for matching criteria.</p>
        <p>To manage your notification preferences, visit your <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/profile" style="color: #2563eb;">profile page</a>.</p>
        <p>© ${new Date().getFullYear()} JobSite. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;
}

function generateBatchedJobAlertEmail(jobs, userName) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  
  const jobsHtml = jobs.map(job => {
    const jobUrl = `${baseUrl}/jobs/${job.slug}`;
    return `
      <div style="background-color: white; padding: 15px; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 15px;">
        <h4 style="margin: 0 0 8px 0; color: #1f2937;">
          <a href="${jobUrl}" style="color: #1f2937; text-decoration: none;">${job.title}</a>
        </h4>
        
        <div style="margin: 8px 0;">
          <span style="background-color: #eff6ff; color: #1d4ed8; padding: 2px 6px; border-radius: 3px; font-size: 12px;">
            ${job.department || 'General'}
          </span>
        </div>

        <div style="margin: 8px 0; color: #6b7280; font-size: 13px;">
          <span style="margin-right: 15px;">📍 ${job.location || 'Not specified'}</span>
          <span style="margin-right: 15px;">💼 ${job.employment_types?.name || 'Not specified'}</span>
          ${job.salaryMin && job.salaryMax ? 
            `<span>💰 ${job.salaryCurrency || '$'}${job.salaryMin.toLocaleString()}-${job.salaryMax.toLocaleString()}</span>` 
            : ''
          }
        </div>

        ${job.description ? 
          `<p style="margin: 8px 0 0 0; color: #4b5563; font-size: 13px; line-height: 1.4;">
            ${job.description.substring(0, 150)}${job.description.length > 150 ? '...' : ''}
          </p>` 
          : ''
        }

        <div style="margin: 12px 0 0 0;">
          <a href="${jobUrl}" style="background-color: #2563eb; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; display: inline-block; font-size: 13px;">
            View Details
          </a>
        </div>
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Batched Job Alerts</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #2563eb; margin: 0;">📦 ${jobs.length} New Job Alert${jobs.length > 1 ? 's' : ''}</h2>
        <p style="margin: 5px 0 0 0; color: #6b7280;">
          Hi ${userName}! Here are ${jobs.length} new job${jobs.length > 1 ? 's' : ''} matching your criteria.
          <br><small style="color: #9ca3af;">These jobs were grouped together to avoid spam.</small>
        </p>
      </div>

      <div style="margin-bottom: 20px;">
        ${jobsHtml}
      </div>

      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
        <p style="margin: 0; color: #4b5563; font-size: 14px;">
          <strong>💡 Tip:</strong> These jobs were batched together because they were posted close to each other. 
          You can adjust your notification frequency in your 
          <a href="${baseUrl}/profile" style="color: #2563eb;">profile settings</a>.
        </p>
      </div>

      <div style="text-align: center; color: #9ca3af; font-size: 12px; padding: 20px 0; border-top: 1px solid #e5e7eb;">
        <p>This batched email was sent to prevent notification spam.</p>
        <p>To manage your notification preferences, visit your <a href="${baseUrl}/profile" style="color: #2563eb;">profile page</a>.</p>
        <p>© ${new Date().getFullYear()} JobSite. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;
}