import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { appPrisma } from "../../../lib/prisma";
import { Client } from "minio";

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

    // 3. Storage Usage Check (MinIO)
    try {
      const minioClient = new Client({
        endPoint: process.env.MINIO_ENDPOINT || "localhost",
        port: parseInt(process.env.MINIO_PORT) || 9000,
        useSSL: process.env.MINIO_USE_SSL === "true" || false,
        accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
        secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
      });

      const bucketName = process.env.MINIO_BUCKET_NAME || "resumes";

      // Check if bucket exists
      const bucketExists = await minioClient.bucketExists(bucketName);

      if (!bucketExists) {
        status.storage = {
          status: "Bucket not found",
          healthy: false,
          details: `Bucket '${bucketName}' does not exist`,
          fileCount: 0,
          sizeInMB: 0,
        };
      } else {
        // List objects to get count and size
        const objectsStream = minioClient.listObjects(bucketName, "", true);
        let fileCount = 0;
        let totalSize = 0;

        for await (const obj of objectsStream) {
          fileCount++;
          totalSize += obj.size || 0;
        }

        const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);

        status.storage = {
          status: `${fileCount} files (${sizeInMB} MB)`,
          healthy: true,
          details: `Storage operational`,
          fileCount,
          sizeInMB: parseFloat(sizeInMB),
        };
      }
    } catch (error) {
      status.storage = {
        status: "Check Failed",
        healthy: false,
        details: "Could not connect to MinIO",
        fileCount: 0,
        sizeInMB: 0,
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
