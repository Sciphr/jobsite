// app/api/jobs/expire/route.js
import { appPrisma } from "../../../lib/prisma";
import { getSystemSetting } from "../../../lib/settings";

export async function POST(req) {
  try {
    // Simple API key check (optional - you can skip this for now)
    const apiKey = req.headers.get("x-api-key");
    const expectedApiKey = process.env.CRON_API_KEY;

    // If you set CRON_API_KEY in env, check it. Otherwise, allow access.
    if (expectedApiKey && apiKey !== expectedApiKey) {
      return new Response(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
      });
    }

    console.log("🔍 Starting job expiration check...");

    const autoExpireDays = await getSystemSetting("auto_expire_jobs_days", 0);

    if (autoExpireDays <= 0) {
      console.log("⏹️ Auto-expiration is disabled");
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
  try {
    console.log("🔍 Job expiration preview mode...");

    const autoExpireDays = await getSystemSetting("auto_expire_jobs_days", 0);

    if (autoExpireDays <= 0) {
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
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}
