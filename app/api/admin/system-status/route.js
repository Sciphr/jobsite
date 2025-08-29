import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { appPrisma } from "../../../lib/prisma";
import { fileStorage } from "../../../lib/minio";
// import { weeklyDigestScheduler } from "../../../lib/weeklyDigestScheduler";
// import { autoArchiveScheduler } from "../../../lib/autoArchiveScheduler";
// import { autoProgressScheduler } from "../../../lib/autoProgressScheduler";

export async function GET(req) {
  const session = await getServerSession(authOptions);

  // Check if user has any admin privileges (privilege level 1 or higher)
  if (
    !session ||
    !session.user.privilegeLevel ||
    session.user.privilegeLevel < 1
  ) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
    });
  }

  try {
    const status = {};

    // 1. Database Health Check
    try {
      await appPrisma.$queryRaw`SELECT 1`;
      const userCount = await appPrisma.users.count();
      status.database = {
        status: "Connected",
        healthy: true,
        details: `${userCount} users in database`,
      };
    } catch (error) {
      status.database = {
        status: "Connection Failed",
        healthy: false,
        details: error.message,
      };
    }

    // 2. Email Service Health Check
    try {
      // Check for Resend API key (environment variable)
      const hasResendConfig = !!process.env.RESEND_API_KEY;
      
      // Check for SMTP configuration in database settings
      let hasSMTPConfig = false;
      let smtpEnabled = false;
      try {
        // Check if SMTP is enabled in system settings
        const smtpEnabledSetting = await appPrisma.settings.findFirst({
          where: { key: 'smtp_enabled' }
        });
        smtpEnabled = smtpEnabledSetting?.value === 'true' || smtpEnabledSetting?.value === true;

        if (smtpEnabled) {
          // Check for required SMTP settings
          const smtpSettings = await appPrisma.settings.findMany({
            where: {
              key: {
                in: ['smtp_host', 'smtp_from_email']
              }
            }
          });
          
          const hasHost = smtpSettings.some(s => s.key === 'smtp_host' && s.value);
          const hasFromEmail = smtpSettings.some(s => s.key === 'smtp_from_email' && s.value);
          
          hasSMTPConfig = hasHost && hasFromEmail;
        }
      } catch (dbError) {
        console.error('Error checking SMTP settings:', dbError);
      }

      // Determine which service is configured and set status
      if (smtpEnabled && hasSMTPConfig) {
        status.emailService = {
          status: "SMTP configured",
          healthy: true,
          details: "Custom SMTP service active",
          serviceType: 'SMTP',
        };
      } else if (hasResendConfig) {
        status.emailService = {
          status: "Resend configured",
          healthy: true,
          details: "Resend service active",
          serviceType: 'Resend',
        };
      } else {
        status.emailService = {
          status: "Not Configured",
          healthy: false,
          details: "No email service configured",
        };
      }
    } catch (error) {
      console.error('Email service check error:', error);
      status.emailService = {
        status: "Check Failed",
        healthy: false,
        details: `Error checking email configuration: ${error.message}`,
      };
    }

    // 3. Storage Usage Check (MinIO Storage)
    try {
      const minioEndpoint = process.env.MINIO_ENDPOINT;
      const minioPort = process.env.MINIO_PORT;
      const minioAccessKey = process.env.MINIO_ACCESS_KEY;
      const minioSecretKey = process.env.MINIO_SECRET_KEY;

      if (!minioEndpoint || !minioAccessKey || !minioSecretKey) {
        status.storage = {
          status: "Not Configured",
          healthy: false,
          details: "Missing MinIO environment variables",
          fileCount: 0,
          sizeInMB: 0,
        };
      } else {
        try {
          // List files in MinIO to get count and size
          const files = await fileStorage.listFiles('');
          
          let totalSize = 0;
          for (const file of files) {
            totalSize += file.size || 0;
          }
          
          status.storage = {
            status: "Connected",
            healthy: true,
            details: `MinIO storage at ${minioEndpoint}:${minioPort || 9000}`,
            fileCount: files.length,
            sizeInMB: Math.round((totalSize / (1024 * 1024)) * 100) / 100,
          };
        } catch (minioError) {
          status.storage = {
            status: "Connection Failed",
            healthy: false,
            details: `MinIO connection error: ${minioError.message}`,
            fileCount: 0,
            sizeInMB: 0,
          };
        }
      }
    } catch (error) {
      status.storage = {
        status: "Check Failed",
        healthy: false,
        details: `Could not connect to MinIO Storage: ${error.message}`,
        fileCount: 0,
        sizeInMB: 0,
      };
    }

    // 4. Scheduled Tasks Status - Now handled by external cron
    try {
      // Check if cron jobs are configured by looking at settings
      const cronSettings = await appPrisma.settings.findMany({
        where: {
          key: {
            in: [
              'weekly_digest_enabled',
              'weekly_digest_last_run',
              'auto_archive_rejected_days',
              'auto_archive_last_run',
              'auto_progress_days',
              'auto_progress_last_run'
            ]
          },
          userId: null
        }
      });

      const settingsMap = {};
      cronSettings.forEach(setting => {
        settingsMap[setting.key] = setting.value;
      });

      status.scheduledTasks = {
        status: "External System Cron",
        healthy: true,
        details: {
          message: "Cron jobs managed by external system cron calling /api/cron/scheduler",
          weeklyDigest: {
            enabled: settingsMap.weekly_digest_enabled === 'true',
            lastRun: settingsMap.weekly_digest_last_run || 'Never',
            status: settingsMap.weekly_digest_enabled === 'true' ? 'Configured' : 'Disabled'
          },
          autoArchive: {
            enabled: !!settingsMap.auto_archive_rejected_days,
            daysThreshold: settingsMap.auto_archive_rejected_days,
            lastRun: settingsMap.auto_archive_last_run || 'Never',
            status: settingsMap.auto_archive_rejected_days ? 'Configured' : 'Not Configured'
          },
          autoProgress: {
            enabled: !!settingsMap.auto_progress_days,
            daysThreshold: settingsMap.auto_progress_days,
            lastRun: settingsMap.auto_progress_last_run || 'Never',
            status: settingsMap.auto_progress_days ? 'Configured' : 'Not Configured'
          }
        }
      };
    } catch (error) {
      status.scheduledTasks = {
        status: "Check Failed",
        healthy: false,
        details: `Error checking cron settings: ${error.message}`,
      };
    }

    return new Response(JSON.stringify(status), { status: 200 });
  } catch (error) {
    console.error("System status error:", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}
