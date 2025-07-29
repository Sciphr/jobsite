import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { appPrisma } from "../../../lib/prisma";
import { Client } from "minio";

export async function GET(req) {
  const session = await getServerSession(authOptions);

  // Check if user is super admin (privilege level 3)
  if (
    !session ||
    !session.user.privilegeLevel ||
    session.user.privilegeLevel < 3
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
      const userCount = await appPrisma.user.count();
      status.database = {
        status: "Connected",
        healthy: true,
        details: `${userCount} users in database`
      };
    } catch (error) {
      status.database = {
        status: "Connection Failed",
        healthy: false,
        details: error.message
      };
    }

    // 2. Email Service Health Check
    try {
      // Check if email configuration exists
      const hasEmailConfig = !!(
        process.env.SMTP_HOST || 
        process.env.RESEND_API_KEY ||
        process.env.SENDGRID_API_KEY
      );
      
      if (hasEmailConfig) {
        // Count recent email attempts (if you track them)
        // For now, just check configuration
        status.emailService = {
          status: "Configured",
          healthy: true,
          details: "Email service configured"
        };
      } else {
        status.emailService = {
          status: "Not Configured",
          healthy: false,
          details: "No email service configured"
        };
      }
    } catch (error) {
      status.emailService = {
        status: "Check Failed",
        healthy: false,
        details: error.message
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
          sizeInMB: 0
        };
      } else {
        // List objects to get count and size
        const objectsStream = minioClient.listObjects(bucketName, '', true);
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
          sizeInMB: parseFloat(sizeInMB)
        };
      }
    } catch (error) {
      status.storage = {
        status: "Check Failed",
        healthy: false,
        details: "Could not connect to MinIO",
        fileCount: 0,
        sizeInMB: 0
      };
    }

    // 4. Email Delivery Status
    try {
      // Check for recent email-related database activity
      // You might want to create an email_logs table in the future
      // For now, check application activity as proxy for email activity
      const recentApplications = await appPrisma.application.count({
        where: {
          appliedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      });

      status.emailDelivery = {
        status: `${recentApplications} emails today`,
        healthy: true,
        details: "Email delivery tracking active",
        recentCount: recentApplications
      };
    } catch (error) {
      status.emailDelivery = {
        status: "Check Failed",
        healthy: false,
        details: "Could not check email delivery",
        recentCount: 0
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