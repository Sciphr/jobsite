# Cron Job Setup for Production (Free Alternatives)

Since Vercel cron jobs require a paid plan, here are free alternatives to run your scheduled tasks:

## Option 1: GitHub Actions (Recommended - Free)

Create `.github/workflows/cron-jobs.yml`:

```yaml
name: Scheduled Tasks

on:
  schedule:
    # Job expiration - daily at 2 AM UTC
    - cron: '0 2 * * *'  
    # General scheduler - every 5 minutes
    - cron: '*/5 * * * *'
  workflow_dispatch: # Allow manual triggers

jobs:
  job-expiration:
    runs-on: ubuntu-latest
    if: github.event.schedule == '0 2 * * *'
    steps:
      - name: Expire Jobs
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://your-app.vercel.app/api/jobs/expire

  scheduler:
    runs-on: ubuntu-latest 
    if: github.event.schedule == '*/5 * * * *'
    steps:
      - name: Run Scheduler
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://your-app.vercel.app/api/cron/scheduler
```

### GitHub Actions Setup:
1. Create `.github/workflows/` folder in your repo
2. Add the `cron-jobs.yml` file above
3. Add `CRON_SECRET` to your GitHub repository secrets
4. Replace `your-app.vercel.app` with your actual domain

## Option 2: EasyCron (Free tier - 20 jobs)

1. Sign up at https://www.easycron.com
2. Create two cron jobs:
   - **Job Expiration:** `0 2 * * *` → `POST https://your-app.vercel.app/api/jobs/expire`
   - **Scheduler:** `*/5 * * * *` → `POST https://your-app.vercel.app/api/cron/scheduler`
3. Add Authorization header: `Bearer your-cron-secret`

## Option 3: cron-job.org (Free)

1. Sign up at https://cron-job.org
2. Create jobs with same schedule and URLs as above
3. Set HTTP method to POST
4. Add Authorization header

## Option 4: UptimeRobot (Free monitoring + cron)

1. Sign up at https://uptimerobot.com  
2. Create HTTP monitors that call your endpoints
3. Set check intervals (5 minutes minimum on free plan)

## Environment Variables Needed

Make sure these are set in your Vercel deployment:
```
CRON_SECRET=your-secure-random-token
CRON_API_KEY=your-api-key-for-manual-testing
```

## Your Cron Endpoints

- **Job Expiration:** `POST /api/jobs/expire` - Runs daily at 2 AM
- **Main Scheduler:** `POST /api/cron/scheduler` - Runs every 5 minutes, handles:
  - Weekly digest emails  
  - Auto-archive rejected applications
  - Auto-progress applications
  - Auto-reject stale applications
  - Data retention cleanup

## Testing

Test your endpoints manually:
```bash
# Test job expiration
curl -X POST -H "Authorization: Bearer your-cron-secret" https://your-app.vercel.app/api/jobs/expire

# Test scheduler  
curl -X POST -H "Authorization: Bearer your-cron-secret" https://your-app.vercel.app/api/cron/scheduler
```

## Recommended: GitHub Actions

GitHub Actions is the most reliable free option since it's integrated with your code repository and has excellent uptime.