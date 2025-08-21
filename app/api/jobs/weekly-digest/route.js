// app/api/jobs/weekly-digest/route.js
import { NextResponse } from "next/server";
import { PrismaClient } from "@/app/generated/prisma";
import nodemailer from "nodemailer";

const prisma = new PrismaClient();

// This endpoint can be called by a cron job or scheduled task
export async function POST(request) {
  try {
    console.log("🗓️ Starting weekly job digest process...");

    // Get date range for the past week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Get all jobs created in the past week
    const recentJobs = await prisma.jobs.findMany({
      where: {
        createdAt: {
          gte: oneWeekAgo
        },
        status: "Active"
      },
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
        salaryMin: true,
        salaryMax: true,
        salaryCurrency: true,
        slug: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📊 Found ${recentJobs.length} new jobs from the past week`);

    if (recentJobs.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No new jobs this week, skipping digest",
        jobsFound: 0,
        emailsSent: 0
      });
    }

    // Get users who have weekly digest enabled
    const users = await prisma.users.findMany({
      where: {
        email_notifications_enabled: true,
        weekly_digest_enabled: true
      },
      include: {
        job_alert_subscriptions: {
          where: { is_active: true }
        }
      }
    });

    console.log(`👥 Found ${users.length} users with weekly digest enabled`);

    let emailsSent = 0;

    // Get email configuration
    let transporter;
    try {
      const emailConfig = await getEmailConfig();
      transporter = nodemailer.createTransporter(emailConfig);
    } catch (error) {
      console.error("Failed to create email transporter:", error);
      return NextResponse.json(
        { error: "Email configuration error" },
        { status: 500 }
      );
    }

    // Send digest to each user
    for (const user of users) {
      try {
        // Filter jobs relevant to this user's subscriptions
        const relevantJobs = filterJobsForUser(recentJobs, user.job_alert_subscriptions);
        
        // Always include some jobs even if user has no specific subscriptions
        const jobsToInclude = relevantJobs.length > 0 ? relevantJobs : recentJobs.slice(0, 5);

        if (jobsToInclude.length > 0) {
          const emailAddress = user.notification_email || user.email;
          const userName = user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Job Seeker';

          const emailContent = generateWeeklyDigestEmail(jobsToInclude, userName, recentJobs.length);

          await transporter.sendMail({
            from: emailConfig.from,
            to: emailAddress,
            subject: `Weekly Job Digest - ${jobsToInclude.length} New Jobs`,
            html: emailContent
          });

          emailsSent++;
          console.log(`✅ Sent weekly digest to ${emailAddress} with ${jobsToInclude.length} jobs`);
        }
      } catch (error) {
        console.error(`❌ Failed to send weekly digest to ${user.email}:`, error);
      }
    }

    console.log(`📧 Weekly digest process completed: ${emailsSent} emails sent`);

    return NextResponse.json({
      success: true,
      jobsFound: recentJobs.length,
      usersWithDigestEnabled: users.length,
      emailsSent: emailsSent
    });

  } catch (error) {
    console.error("Error processing weekly digest:", error);
    return NextResponse.json(
      { error: "Failed to process weekly digest" },
      { status: 500 }
    );
  }
}

function filterJobsForUser(jobs, subscriptions) {
  if (!subscriptions || subscriptions.length === 0) {
    return [];
  }

  const relevantJobs = [];

  for (const job of jobs) {
    for (const subscription of subscriptions) {
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
        const jobText = `${job.title} ${job.description}`.toLowerCase();
        
        for (const keyword of keywords) {
          if (keyword && jobText.includes(keyword)) {
            isMatch = true;
            break;
          }
        }
      }

      if (isMatch && !relevantJobs.find(j => j.id === job.id)) {
        relevantJobs.push(job);
        break;
      }
    }
  }

  return relevantJobs;
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

function generateWeeklyDigestEmail(jobs, userName, totalJobsThisWeek) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Weekly Job Digest</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #2563eb, #3b82f6); color: white; padding: 30px 20px; border-radius: 12px; margin-bottom: 30px; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">📅 Weekly Job Digest</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your personalized job updates for this week</p>
      </div>

      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="margin: 0 0 10px 0; color: #1f2937;">Hello ${userName}! 👋</h2>
        <p style="margin: 0; color: #4b5563;">
          This week we have <strong>${totalJobsThisWeek} new job posting${totalJobsThisWeek !== 1 ? 's' : ''}</strong>. 
          Below are ${jobs.length} job${jobs.length !== 1 ? 's' : ''} that match your interests:
        </p>
      </div>

      <div style="margin: 20px 0;">
        ${jobs.map(job => `
          <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 15px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h3 style="margin: 0 0 10px 0; color: #1f2937; font-size: 18px;">
              <a href="${baseUrl}/jobs/${job.slug}" style="color: #2563eb; text-decoration: none;">
                ${job.title}
              </a>
            </h3>
            
            <div style="margin: 10px 0;">
              <span style="background-color: #eff6ff; color: #1d4ed8; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500;">
                ${job.department || 'General'}
              </span>
            </div>

            <div style="margin: 12px 0; color: #6b7280; font-size: 14px; display: flex; flex-wrap: wrap; gap: 15px;">
              <div style="display: flex; align-items: center;">
                <span style="margin-right: 5px;">📍</span>
                ${job.location || 'Remote'}
              </div>
              <div style="display: flex; align-items: center;">
                <span style="margin-right: 5px;">💼</span>
                ${job.employment_types?.name || 'Full-time'}
              </div>
              ${job.remote_policies?.name ? `
                <div style="display: flex; align-items: center;">
                  <span style="margin-right: 5px;">🏠</span>
                  ${job.remote_policies.name}
                </div>
              ` : ''}
              ${job.salaryMin && job.salaryMax ? `
                <div style="display: flex; align-items: center;">
                  <span style="margin-right: 5px;">💰</span>
                  ${job.salaryCurrency || '$'}${job.salaryMin.toLocaleString()} - ${job.salaryCurrency || '$'}${job.salaryMax.toLocaleString()}
                </div>
              ` : ''}
            </div>

            ${job.description ? `
              <p style="margin: 12px 0; color: #4b5563; font-size: 14px; line-height: 1.5;">
                ${job.description.substring(0, 150)}${job.description.length > 150 ? '...' : ''}
              </p>
            ` : ''}

            <div style="margin-top: 15px;">
              <a href="${baseUrl}/jobs/${job.slug}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 14px; font-weight: 500;">
                View Details & Apply
              </a>
            </div>

            <div style="margin-top: 10px; color: #9ca3af; font-size: 12px;">
              Posted ${formatDate(job.createdAt)}
            </div>
          </div>
        `).join('')}
      </div>

      ${jobs.length < totalJobsThisWeek ? `
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <h3 style="margin: 0 0 10px 0; color: #1f2937;">See All ${totalJobsThisWeek} Jobs This Week</h3>
          <p style="margin: 0 0 15px 0; color: #6b7280;">Browse all new job postings and find your perfect match!</p>
          <a href="${baseUrl}/jobs" style="background-color: #374151; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
            Browse All Jobs
          </a>
        </div>
      ` : ''}

      <div style="text-align: center; color: #9ca3af; font-size: 12px; padding: 30px 20px 20px 20px; border-top: 1px solid #e5e7eb; margin-top: 30px;">
        <p style="margin: 0 0 10px 0;">📧 This weekly digest was sent because you have email notifications enabled.</p>
        <p style="margin: 0 0 10px 0;">To manage your notification preferences or job alerts, visit your <a href="${baseUrl}/profile" style="color: #2563eb;">profile page</a>.</p>
        <p style="margin: 0; color: #d1d5db;">© ${new Date().getFullYear()} JobSite. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return 'yesterday';
  if (diffDays <= 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}