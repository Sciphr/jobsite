// app/api/cron/scheduler/route.js
import { NextResponse } from 'next/server';
import { appPrisma } from '../../../lib/prisma';

// Security: Simple bearer token check
function verifyAuth(request) {
  const authHeader = request.headers.get('authorization');
  const expectedToken = process.env.CRON_SECRET || 'your-secure-random-token';
  
  if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
    return false;
  }
  return true;
}

// Helper to check if enough time has passed since last run
function shouldRunJob(lastRun, intervalMinutes) {
  if (!lastRun) return true;
  
  const timeSinceLastRun = Date.now() - new Date(lastRun).getTime();
  const intervalMs = intervalMinutes * 60 * 1000;
  
  return timeSinceLastRun >= intervalMs;
}

// Helper to get setting value
async function getSetting(key, defaultValue = null) {
  try {
    const setting = await appPrisma.settings.findFirst({
      where: { key, userId: null }
    });
    return setting ? setting.value : defaultValue;
  } catch (error) {
    console.error(`Error getting setting ${key}:`, error);
    return defaultValue;
  }
}

// Helper to update last run timestamp
async function updateLastRun(key) {
  try {
    await appPrisma.settings.upsert({
      where: { key_userId: { key, userId: null } },
      update: { value: new Date().toISOString() },
      create: { key, value: new Date().toISOString(), userId: null }
    });
  } catch (error) {
    console.error(`Error updating last run for ${key}:`, error);
  }
}

// Weekly Digest Logic
async function checkWeeklyDigest() {
  try {
    const enabled = await getSetting('weekly_digest_enabled', 'true') === 'true';
    if (!enabled) {
      console.log('📅 Weekly digest disabled, skipping');
      return { ran: false, reason: 'disabled' };
    }

    const day = await getSetting('weekly_digest_day', 'monday');
    const time = await getSetting('weekly_digest_time', '09:00');
    const lastRun = await getSetting('weekly_digest_last_run');

    // Check if it's the right day and time
    const now = new Date();
    const dayMap = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
    const targetDay = dayMap[day.toLowerCase()] ?? 1;
    
    const [hours, minutes] = time.split(':').map(n => parseInt(n));
    
    // Check if we're in the right day and time window (5-minute window)
    const isRightDay = now.getDay() === targetDay;
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Only run if we're within 5 minutes of the target time
    const isRightTime = currentHour === hours && Math.abs(currentMinute - minutes) <= 2;
    
    // Don't run if we already ran this week
    const lastRunDate = lastRun ? new Date(lastRun) : null;
    const daysSinceLastRun = lastRunDate ? Math.floor((now - lastRunDate) / (1000 * 60 * 60 * 24)) : 999;
    
    // Debug logging
    console.log(`📅 Weekly Digest Check: ${now.toISOString()}`);
    console.log(`📅 Target: ${day} at ${time} | Current: ${now.toLocaleString()} (Day ${now.getDay()}, ${currentHour}:${currentMinute.toString().padStart(2, '0')})`);
    console.log(`📅 Checks: isRightDay=${isRightDay}, isRightTime=${isRightTime}, daysSinceLastRun=${daysSinceLastRun}`);
    console.log(`📅 Last run: ${lastRun || 'Never'}`);
    
    if (isRightDay && isRightTime && daysSinceLastRun >= 6) {
      console.log('📧 Running weekly digest...');
      
      // Import and run the weekly digest
      const { weeklyDigestService } = await import('../../../lib/weeklyDigest');
      const result = await weeklyDigestService.generateAndSend(null, null);
      
      await updateLastRun('weekly_digest_last_run');
      
      return { ran: true, result };
    }
    
    return { ran: false, reason: 'not_time_yet' };
  } catch (error) {
    console.error('Error in weekly digest check:', error);
    return { ran: false, error: error.message };
  }
}

// Auto Archive Logic
async function checkAutoArchive() {
  try {
    const workflowEnabled = await getSetting('enable_workflow_automation', 'false') === 'true';
    if (!workflowEnabled) {
      return { ran: false, reason: 'workflow_automation_disabled' };
    }

    const days = await getSetting('auto_archive_rejected_days');
    if (!days || isNaN(parseInt(days))) {
      return { ran: false, reason: 'not_configured' };
    }

    const lastRun = await getSetting('auto_archive_last_run');
    
    // Run once per day (1440 minutes)
    if (!shouldRunJob(lastRun, 1440)) {
      return { ran: false, reason: 'too_soon' };
    }

    console.log('📦 Running auto archive...');
    
    const daysThreshold = parseInt(days);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);

    const applicationsToArchive = await appPrisma.applications.findMany({
      where: {
        status: "Rejected",
        is_archived: false,
        updatedAt: { lt: cutoffDate },
      },
      select: { id: true, name: true, email: true }
    });

    if (applicationsToArchive.length === 0) {
      await updateLastRun('auto_archive_last_run');
      return { ran: true, archived: 0 };
    }

    const applicationIds = applicationsToArchive.map(app => app.id);
    
    const updateResult = await appPrisma.applications.updateMany({
      where: { id: { in: applicationIds } },
      data: {
        is_archived: true,
        archived_at: new Date(),
        archived_by: null,
        archive_reason: "auto_rejected_expired",
      },
    });

    await updateLastRun('auto_archive_last_run');
    
    return { ran: true, archived: updateResult.count };
  } catch (error) {
    console.error('Error in auto archive check:', error);
    return { ran: false, error: error.message };
  }
}

// Auto Progress Logic
async function checkAutoProgress() {
  try {
    const workflowEnabled = await getSetting('enable_workflow_automation', 'false') === 'true';
    if (!workflowEnabled) {
      return { ran: false, reason: 'workflow_automation_disabled' };
    }

    const days = await getSetting('auto_progress_days');
    if (!days || isNaN(parseInt(days))) {
      return { ran: false, reason: 'not_configured' };
    }

    const lastRun = await getSetting('auto_progress_last_run');
    
    // Run once per day
    if (!shouldRunJob(lastRun, 1440)) {
      return { ran: false, reason: 'too_soon' };
    }

    console.log('⏩ Running auto progress...');
    
    // Add your auto progress logic here
    // This would be similar to your existing autoProgressScheduler logic
    
    await updateLastRun('auto_progress_last_run');
    
    return { ran: true, message: 'Auto progress completed' };
  } catch (error) {
    console.error('Error in auto progress check:', error);
    return { ran: false, error: error.message };
  }
}

// Auto Reject Logic
async function checkAutoReject() {
  try {
    const workflowEnabled = await getSetting('enable_workflow_automation', 'false') === 'true';
    if (!workflowEnabled) {
      return { ran: false, reason: 'workflow_automation_disabled' };
    }

    const days = await getSetting('auto_reject_days');
    if (!days || isNaN(parseInt(days))) {
      return { ran: false, reason: 'not_configured' };
    }

    const lastRun = await getSetting('auto_reject_last_run');
    
    // Run once per day
    if (!shouldRunJob(lastRun, 1440)) {
      return { ran: false, reason: 'too_soon' };
    }

    console.log('❌ Running auto reject...');
    
    // Add your auto reject logic here
    
    await updateLastRun('auto_reject_last_run');
    
    return { ran: true, message: 'Auto reject completed' };
  } catch (error) {
    console.error('Error in auto reject check:', error);
    return { ran: false, error: error.message };
  }
}

// Data Retention Logic
async function checkDataRetention() {
  try {
    const days = await getSetting('data_retention_days');
    if (!days || isNaN(parseInt(days))) {
      return { ran: false, reason: 'not_configured' };
    }

    const lastRun = await getSetting('data_retention_last_run');
    
    // Run once per week (10080 minutes)
    if (!shouldRunJob(lastRun, 10080)) {
      return { ran: false, reason: 'too_soon' };
    }

    console.log('🗑️ Running data retention...');
    
    // Add your data retention logic here
    
    await updateLastRun('data_retention_last_run');
    
    return { ran: true, message: 'Data retention completed' };
  } catch (error) {
    console.error('Error in data retention check:', error);
    return { ran: false, error: error.message };
  }
}

export async function POST(request) {
  // Verify authentication
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('🔄 Running scheduled job checks...');

  const results = {
    timestamp: new Date().toISOString(),
    jobs: {}
  };

  // Check all scheduled jobs
  results.jobs.weeklyDigest = await checkWeeklyDigest();
  results.jobs.autoArchive = await checkAutoArchive();
  results.jobs.autoProgress = await checkAutoProgress();
  results.jobs.autoReject = await checkAutoReject();
  results.jobs.dataRetention = await checkDataRetention();

  // Count how many jobs actually ran
  const jobsRan = Object.values(results.jobs).filter(job => job.ran).length;
  
  console.log(`✅ Cron check completed. ${jobsRan} jobs ran.`);

  return NextResponse.json(results);
}

// Allow GET for testing
export async function GET() {
  return NextResponse.json({ 
    message: 'Cron scheduler endpoint is working',
    timestamp: new Date().toISOString()
  });
}