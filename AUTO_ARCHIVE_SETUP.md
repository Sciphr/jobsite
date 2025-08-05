# Auto-Archive Cron Job Setup

## Overview
The auto-archive functionality has been implemented using the same pattern as your existing weekly digest scheduler. It uses the `node-cron` package to automatically archive rejected applications after a configurable number of days.

## Files Created/Modified

### 1. **New Auto-Archive Scheduler** 
- `app/lib/autoArchiveScheduler.js` - Main scheduler class (similar to weeklyDigestScheduler.js)

### 2. **Modified Startup Process**
- `app/lib/startup.js` - Added auto-archive scheduler initialization

### 3. **System Monitoring**
- `app/api/admin/system-status/route.js` - Added scheduler status monitoring

### 4. **Database Settings Setup**
- `setup-auto-archive-settings.sql` - SQL script to add required settings

## Setup Instructions

### Step 1: Verify Your Settings (Optional)
You can run the SQL script to verify your existing setting:

```bash
psql -d your_database_name -f setup-auto-archive-settings.sql
```

This just verifies your existing `auto_archive_rejected_days` (currently set to 90 days).
No new settings needed - the scheduler runs at midnight daily.

### Step 2: Restart Your Application
The scheduler will start automatically when your Next.js app starts up (just like the weekly digest).

### Step 3: Verify Setup
1. Check system status at `/admin/system-status` (or via API)
2. Look for "Scheduled Tasks" section
3. Should show auto-archive status as "Active" since you have the 90-day setting

## How It Works

### Automatic Scheduling
- **When**: Runs daily at midnight (00:00)
- **What**: Archives rejected applications older than 90 days (your current setting)
- **Cron Expression**: `"0 0 * * *"` (midnight daily)

### Manual Triggering
- Available via the "Run Auto-Archive" button in the Applications Manager UI
- Also available programmatically: `autoArchiveScheduler.triggerNow()`

### Settings Management
The scheduler checks for setting updates every hour, just like the weekly digest:
- `auto_archive_rejected_days`: number - Days after rejection to archive (you have this set to 90)
- No time configuration needed - always runs at midnight

### Monitoring & Logging
- All operations are logged to the audit system
- System status API shows scheduler health
- Console logs track execution

## Configuration Options

### Current Configuration
- **Enabled**: Yes (you have `auto_archive_rejected_days` set to 90)
- **Schedule**: Daily at midnight
- **Threshold**: 90 days after rejection

### Change Days Threshold
```sql
UPDATE settings SET value = '45' WHERE key = 'auto_archive_rejected_days';
```

### Disable Auto-Archive (if needed)
```sql
-- Set to 0 to disable
UPDATE settings SET value = '0' WHERE key = 'auto_archive_rejected_days';
```

## Advantages of This Implementation

1. **Follows Existing Pattern**: Uses the same architecture as your weekly digest
2. **Raspberry Pi Ready**: Uses `node-cron` which works perfectly on Raspberry Pi
3. **No External Dependencies**: Doesn't require system cron or external schedulers
4. **Self-Healing**: Automatically updates schedule when settings change
5. **Monitoring**: Built-in health checks and status reporting
6. **Audit Trail**: Full logging of all operations

## Monitoring the Scheduler

### Check Status
```javascript
// Via API
fetch('/api/admin/system-status')
  .then(r => r.json())
  .then(data => console.log(data.scheduledTasks));

// Programmatically
const info = await autoArchiveScheduler.getScheduleInfo();
console.log(info);
```

### Manual Trigger (for testing)
```javascript
await autoArchiveScheduler.triggerNow();
```

## Troubleshooting

### Scheduler Not Running
1. Verify `auto_archive_rejected_days` setting exists and is > 0 (yours is set to 90)
2. Check system status API for errors
3. Look at server console for scheduler logs
4. Ensure the setting hasn't been set to 0

### No Applications Being Archived
1. Verify there are rejected applications older than the threshold
2. Check the auto-archive preview in the UI
3. Review audit logs for execution history

### Change Not Taking Effect
Settings are checked every hour. To force immediate update:
1. Restart the application, or
2. Manually trigger: `await autoArchiveScheduler.updateSchedule()`

## Example Logs

When working correctly, you'll see logs like:
```
📦 Auto-Archive Scheduler initialized
📦 Starting Auto-Archive Scheduler...
📦 Setting up auto-archive schedule: Daily at midnight for rejected applications older than 90 days (cron: 0 0 * * *)
✅ Auto-Archive Scheduler started successfully
```

During execution:
```
📦 Executing scheduled auto-archive...
✅ Auto-archived 5 applications
```

This implementation provides a robust, monitored, and configurable auto-archive system that matches your existing infrastructure patterns.