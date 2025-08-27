// app/api/jobs/expire/route.js
import { appPrisma } from "../../../lib/prisma";
import { getSystemSetting } from "../../../lib/settings";
import { logAuditEvent } from "../../../../lib/auditMiddleware";
import { extractRequestContext } from "../../../lib/auditLog";

export async function POST(req) {
  const requestContext = extractRequestContext(req);
  
  try {
    // Check for Vercel cron authentication or API key
    const authHeader = req.headers.get("authorization");
    const apiKey = req.headers.get("x-api-key");
    const expectedApiKey = process.env.CRON_API_KEY;
    const cronSecret = process.env.CRON_SECRET;

    // Allow if:
    // 1. Vercel cron with proper auth header
    // 2. Manual call with correct API key
    // 3. No security configured (for testing)
    const isVercelCron = authHeader === `Bearer ${cronSecret}`;
    const isValidApiKey = expectedApiKey && apiKey === expectedApiKey;
    const noSecurityConfigured = !expectedApiKey && !cronSecret;

    if (!isVercelCron && !isValidApiKey && !noSecurityConfigured) {
      // Log unauthorized job expiration attempt
      await logAuditEvent({
        eventType: "ERROR",
        category: "SECURITY",
        action: "Unauthorized job expiration attempt",
        description: "Job expiration attempted with invalid or missing API key",
        actorType: "system",
        actorName: "cron_job",
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        severity: "warning",
        status: "failure",
        tags: ["jobs", "expiration", "unauthorized", "security", "cron"]
      }, req).catch(console.error);

      return new Response(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
      });
    }

    console.log("🔍 Starting job expiration check...");

    const autoExpireDays = await getSystemSetting("auto_expire_jobs_days", 0);

    if (autoExpireDays <= 0) {
      console.log("⏹️ Auto-expiration is disabled");
      
      // Log auto-expiration disabled
      await logAuditEvent({
        eventType: "INFO",
        category: "JOB",
        action: "Job auto-expiration disabled",
        description: "Job expiration cron job ran but auto-expiration is disabled in settings",
        actorType: "system",
        actorName: "cron_job",
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        severity: "info",
        status: "success",
        tags: ["jobs", "expiration", "disabled", "cron"],
        metadata: {
          autoExpireDays: 0,
          expiredCount: 0
        }
      }, req).catch(console.error);
      
      return new Response(
        JSON.stringify({
          message: "Auto-expiration is disabled",
          expiredCount: 0,
          autoExpireDays: 0,
        }),
        { status: 200 }
      );
    }

    console.log(`⏰ Auto-expiration enabled: ${autoExpireDays} days`);

    // Calculate cutoff date (jobs older than this should expire)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - autoExpireDays);

    console.log(`📅 Cutoff date: ${cutoffDate.toISOString()}`);

    // Find and expire jobs that are too old
    const expiredByAge = await appPrisma.jobs.updateMany({
      where: {
        status: "Active",
        postedAt: {
          lte: cutoffDate,
        },
      },
      data: {
        status: "Closed",
        updatedAt: new Date(),
        lastExpiredCheck: new Date(),
      },
    });

    console.log(`📊 Expired ${expiredByAge.count} jobs by age`);

    // Also handle jobs with specific expiration dates that have passed
    const expiredByDeadline = await appPrisma.jobs.updateMany({
      where: {
        status: "Active",
        applicationDeadline: {
          lte: new Date(),
        },
      },
      data: {
        status: "Closed",
        updatedAt: new Date(),
        lastExpiredCheck: new Date(),
      },
    });

    console.log(`📊 Expired ${expiredByDeadline.count} jobs by deadline`);

    const totalExpired = expiredByAge.count + expiredByDeadline.count;

    console.log(`✅ Total expired: ${totalExpired} jobs`);

    // Log successful job expiration
    await logAuditEvent({
      eventType: "UPDATE",
      category: "JOB",
      action: "Jobs expired successfully",
      description: `Job expiration cron successfully expired ${totalExpired} jobs (${expiredByAge.count} by age, ${expiredByDeadline.count} by deadline)`,
      actorType: "system",
      actorName: "cron_job",
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      severity: "info",
      status: "success",
      tags: ["jobs", "expiration", "success", "cron", "bulk_update"],
      metadata: {
        totalExpired: totalExpired,
        expiredByAge: expiredByAge.count,
        expiredByDeadline: expiredByDeadline.count,
        autoExpireDays: autoExpireDays,
        cutoffDate: cutoffDate.toISOString(),
        timestamp: new Date().toISOString()
      }
    }, req).catch(console.error);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully expired ${totalExpired} jobs`,
        expiredByAge: expiredByAge.count,
        expiredByDeadline: expiredByDeadline.count,
        autoExpireDays,
        cutoffDate: cutoffDate.toISOString(),
        timestamp: new Date().toISOString(),
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Job expiration error:", error);
    
    // Log job expiration error
    await logAuditEvent({
      eventType: "ERROR",
      category: "SYSTEM",
      action: "Job expiration failed - server error",
      description: `Job expiration cron failed with server error: ${error.message}`,
      actorType: "system",
      actorName: "cron_job",
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      severity: "error",
      status: "failure",
      tags: ["jobs", "expiration", "server_error", "system", "cron"],
      metadata: {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }
    }, req).catch(console.error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: "Internal server error",
        error: error.message,
      }),
      { status: 500 }
    );
  }
}

// GET method for manual testing/preview
export async function GET(req) {
  const requestContext = extractRequestContext(req);
  
  try {
    console.log("🔍 Job expiration preview mode...");
    
    // Log job expiration preview access
    await logAuditEvent({
      eventType: "VIEW",
      category: "JOB",
      action: "Job expiration preview accessed",
      description: "Job expiration preview mode accessed for testing",
      actorType: "system",
      actorName: "administrator",
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      severity: "info",
      status: "success",
      tags: ["jobs", "expiration", "preview", "testing"]
    }, req).catch(console.error);

    const autoExpireDays = await getSystemSetting("auto_expire_jobs_days", 0);

    if (autoExpireDays <= 0) {
      // Log preview with auto-expiration disabled
      await logAuditEvent({
        eventType: "VIEW",
        category: "JOB",
        action: "Job expiration preview - disabled",
        description: "Job expiration preview accessed but auto-expiration is disabled",
        actorType: "system",
        actorName: "administrator",
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        severity: "info",
        status: "success",
        tags: ["jobs", "expiration", "preview", "disabled"],
        metadata: {
          autoExpireDays: 0,
          jobsToExpire: 0
        }
      }, req).catch(console.error);
      
      return new Response(
        JSON.stringify({
          message: "Auto-expiration is disabled",
          jobsToExpire: [],
          settings: { autoExpireDays: 0 },
        }),
        { status: 200 }
      );
    }

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - autoExpireDays);

    // Find jobs that WOULD be expired (preview mode - don't actually expire)
    const jobsToExpireByAge = await appPrisma.jobs.findMany({
      where: {
        status: "Active",
        postedAt: {
          lte: cutoffDate,
        },
      },
      select: {
        id: true,
        title: true,
        department: true,
        postedAt: true,
        status: true,
      },
    });

    const jobsToExpireByDeadline = await appPrisma.jobs.findMany({
      where: {
        status: "Active",
        applicationDeadline: {
          lte: new Date(),
        },
      },
      select: {
        id: true,
        title: true,
        department: true,
        applicationDeadline: true,
        status: true,
      },
    });

    const allJobsToExpire = [
      ...jobsToExpireByAge.map((job) => ({ ...job, reason: "age" })),
      ...jobsToExpireByDeadline.map((job) => ({ ...job, reason: "deadline" })),
    ];

    // Log successful job expiration preview
    await logAuditEvent({
      eventType: "VIEW",
      category: "JOB",
      action: "Job expiration preview completed",
      description: `Job expiration preview found ${allJobsToExpire.length} jobs that would be expired`,
      actorType: "system",
      actorName: "administrator",
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      severity: "info",
      status: "success",
      tags: ["jobs", "expiration", "preview", "success"],
      metadata: {
        jobsToExpire: allJobsToExpire.length,
        jobsToExpireByAge: jobsToExpireByAge.length,
        jobsToExpireByDeadline: jobsToExpireByDeadline.length,
        autoExpireDays: autoExpireDays,
        cutoffDate: cutoffDate.toISOString(),
        previewMode: true
      }
    }, req).catch(console.error);

    return new Response(
      JSON.stringify({
        message: `Found ${allJobsToExpire.length} jobs that would be expired`,
        jobsToExpire: allJobsToExpire,
        settings: { autoExpireDays },
        cutoffDate: cutoffDate.toISOString(),
        previewMode: true,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Job expiration preview error:", error);
    
    // Log job expiration preview error
    await logAuditEvent({
      eventType: "ERROR",
      category: "SYSTEM",
      action: "Job expiration preview failed - server error",
      description: `Job expiration preview failed with server error: ${error.message}`,
      actorType: "system",
      actorName: "administrator",
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      severity: "error",
      status: "failure",
      tags: ["jobs", "expiration", "preview", "server_error", "system"],
      metadata: {
        error: error.message,
        stack: error.stack
      }
    }, req).catch(console.error);
    
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}
