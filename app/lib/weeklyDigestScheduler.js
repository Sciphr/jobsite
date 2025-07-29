// app/lib/weeklyDigestScheduler.js
import cron from 'node-cron';
import { appPrisma } from './prisma';
import { weeklyDigestService } from './weeklyDigest';

class WeeklyDigestScheduler {
  constructor() {
    this.currentTask = null;
    this.isRunning = false;
    console.log('📅 Weekly Digest Scheduler initialized');
  }

  async start() {
    if (this.isRunning) {
      console.log('📅 Scheduler already running');
      return;
    }

    this.isRunning = true;
    console.log('📅 Starting Weekly Digest Scheduler...');
    
    // Initial schedule setup
    await this.updateSchedule();
    
    // Check for schedule updates every hour
    cron.schedule('0 * * * *', async () => {
      console.log('🔄 Checking for schedule updates...');
      await this.updateSchedule();
    });

    console.log('✅ Weekly Digest Scheduler started successfully');
  }

  async updateSchedule() {
    try {
      // Get current schedule settings from database
      const settings = await appPrisma.setting.findMany({
        where: {
          key: {
            in: ['weekly_digest_enabled', 'weekly_digest_day', 'weekly_digest_time']
          },
          userId: null
        }
      });

      // Parse settings
      let enabled = true;
      let dayOfWeek = 1; // Monday default
      let time = '09:00'; // 9 AM default

      settings.forEach(setting => {
        switch (setting.key) {
          case 'weekly_digest_enabled':
            enabled = setting.value === 'true';
            break;
          case 'weekly_digest_day':
            const dayMap = {
              sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
              thursday: 4, friday: 5, saturday: 6
            };
            dayOfWeek = dayMap[setting.value.toLowerCase()] ?? 1;
            break;
          case 'weekly_digest_time':
            time = setting.value || '09:00';
            break;
        }
      });

      if (!enabled) {
        console.log('📅 Weekly digest is disabled, stopping current schedule');
        this.stopCurrentTask();
        return;
      }

      // Parse time (format: "HH:MM")
      const [hours, minutes] = time.split(':').map(n => parseInt(n));
      
      // Create cron expression: "minute hour * * dayOfWeek"
      const cronExpression = `${minutes} ${hours} * * ${dayOfWeek}`;
      
      console.log(`📅 Setting up weekly digest schedule: ${this.getDayName(dayOfWeek)} at ${time} (cron: ${cronExpression})`);

      // Stop current task if exists
      this.stopCurrentTask();

      // Create new scheduled task
      this.currentTask = cron.schedule(cronExpression, async () => {
        console.log('📧 Executing scheduled weekly digest...');
        await this.executeWeeklyDigest();
      }, {
        scheduled: true,
        timezone: 'America/New_York' // Adjust timezone as needed
      });

      console.log('✅ Weekly digest schedule updated successfully');

    } catch (error) {
      console.error('❌ Error updating weekly digest schedule:', error);
    }
  }

  stopCurrentTask() {
    if (this.currentTask) {
      this.currentTask.stop();
      this.currentTask.destroy();
      this.currentTask = null;
      console.log('🛑 Stopped current weekly digest schedule');
    }
  }

  async executeWeeklyDigest() {
    try {
      console.log('🚀 Starting weekly digest generation and sending...');
      
      const result = await weeklyDigestService.generateAndSend();
      
      if (result.success) {
        console.log(`✅ Weekly digest sent successfully to ${result.sent} recipients`);
        if (result.failed > 0) {
          console.warn(`⚠️ Failed to send to ${result.failed} recipients`);
        }
      } else {
        console.error('❌ Weekly digest failed:', result.message);
      }

      // Log the execution to audit log
      await this.logExecution(result);

    } catch (error) {
      console.error('❌ Error executing weekly digest:', error);
      
      // Log the error
      await this.logExecution({
        success: false,
        message: error.message,
        sent: 0,
        failed: 0
      });
    }
  }

  async logExecution(result) {
    try {
      await appPrisma.auditLog.create({
        data: {
          action: 'weekly_digest_scheduled_send',
          userId: null, // System action
          details: JSON.stringify({
            success: result.success,
            message: result.message,
            sent: result.sent,
            failed: result.failed,
            timestamp: new Date().toISOString()
          }),
          ipAddress: 'system',
          userAgent: 'WeeklyDigestScheduler',
          createdAt: new Date()
        }
      });
    } catch (logError) {
      console.error('❌ Error logging weekly digest execution:', logError);
    }
  }

  getDayName(dayOfWeek) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek] || 'Monday';
  }

  stop() {
    this.stopCurrentTask();
    this.isRunning = false;
    console.log('🛑 Weekly Digest Scheduler stopped');
  }

  // Method to manually trigger digest (for testing)
  async triggerNow() {
    console.log('🔧 Manually triggering weekly digest...');
    await this.executeWeeklyDigest();
  }

  // Get current schedule info
  async getScheduleInfo() {
    try {
      const settings = await appPrisma.setting.findMany({
        where: {
          key: {
            in: ['weekly_digest_enabled', 'weekly_digest_day', 'weekly_digest_time']
          },
          userId: null
        }
      });

      let enabled = true;
      let dayOfWeek = 1;
      let time = '09:00';

      settings.forEach(setting => {
        switch (setting.key) {
          case 'weekly_digest_enabled':
            enabled = setting.value === 'true';
            break;
          case 'weekly_digest_day':
            const dayMap = {
              sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
              thursday: 4, friday: 5, saturday: 6
            };
            dayOfWeek = dayMap[setting.value.toLowerCase()] ?? 1;
            break;
          case 'weekly_digest_time':
            time = setting.value || '09:00';
            break;
        }
      });

      return {
        enabled,
        dayOfWeek,
        dayName: this.getDayName(dayOfWeek),
        time,
        isRunning: this.isRunning,
        hasActiveTask: this.currentTask !== null
      };
    } catch (error) {
      console.error('❌ Error getting schedule info:', error);
      return null;
    }
  }
}

// Create singleton instance
const weeklyDigestScheduler = new WeeklyDigestScheduler();

export { weeklyDigestScheduler };