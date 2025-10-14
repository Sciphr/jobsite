# JobSite Deployment Scripts

These scripts help manage multiple client installations on a Linux VPS.

## Installation

1. **Copy scripts to system bin directory:**
   ```bash
   sudo cp scripts/*.sh /usr/local/bin/
   sudo chmod +x /usr/local/bin/*.sh
   ```

2. **Or run from project directory:**
   ```bash
   chmod +x scripts/*.sh
   ./scripts/update-client.sh /var/www/client1
   ```

## Scripts Overview

### 1. update-client.sh
Update a single client installation.

**Usage:**
```bash
sudo update-client.sh <client_directory> [branch]
```

**Examples:**
```bash
# Update client1 from main branch
sudo update-client.sh /var/www/client1

# Update client1 from specific branch
sudo update-client.sh /var/www/client1 feature-branch
```

**What it does:**
- Backs up config files (subscription.json, .env.local)
- Pulls latest code from git
- Restores config files
- Installs dependencies if package.json changed
- Runs database migrations if schema changed
- Builds the application
- Restarts PM2 process with zero downtime
- Runs health check
- Cleans up old backups

---

### 2. update-all-clients.sh
Update all client installations in bulk.

**Usage:**
```bash
sudo update-all-clients.sh [branch]
```

**Examples:**
```bash
# Update all clients from main branch
sudo update-all-clients.sh

# Update all clients from specific branch
sudo update-all-clients.sh production
```

**What it does:**
- Finds all client directories in /var/www
- Updates each client sequentially
- Logs all output to /var/log/jobsite-updates-TIMESTAMP.log
- Continues even if one client fails
- Shows success/failure summary

---

### 3. rollback-client.sh
Rollback a client to the previous version.

**Usage:**
```bash
sudo rollback-client.sh <client_directory>
```

**Example:**
```bash
sudo rollback-client.sh /var/www/client1
```

**What it does:**
- Shows current and previous commits
- Asks for confirmation
- Reverts code to previous commit
- Reinstalls dependencies
- Rebuilds application
- Regenerates Prisma client
- Restarts PM2 process
- Runs health check

---

### 4. update-clients-interactive.sh
Interactive menu for updating clients.

**Usage:**
```bash
sudo update-clients-interactive.sh
```

**What it does:**
- Shows list of available clients
- Lets you select specific clients or "all"
- Asks for branch name
- Confirms before proceeding
- Runs updates for selected clients

---

## Setup Requirements

### Prerequisites

1. **Git installed on each client directory:**
   ```bash
   cd /var/www/client1
   git init
   git remote add origin https://github.com/yourorg/jobsite-app.git
   git fetch
   git checkout main
   ```

2. **PM2 installed globally:**
   ```bash
   npm install -g pm2
   ```

3. **PM2 processes configured:**
   ```bash
   cd /var/www/client1
   pm2 start npm --name "client1" -- start
   pm2 save
   ```

4. **Log directory permissions:**
   ```bash
   sudo mkdir -p /var/log
   sudo chmod 755 /var/log
   ```

---

## Configuration

### Client Directory Structure

Each client should have this structure:
```
/var/www/client1/
├── .git/
├── .env.local          (client-specific, preserved during updates)
├── config/
│   └── subscription.json  (client-specific, preserved during updates)
├── node_modules/
├── .next/
├── package.json
└── ... (rest of app files)
```

### Environment Variables

Each client's `.env.local` should include:
```env
PORT=3001  # Unique port for each client
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="..."
# ... other client-specific vars
```

---

## PM2 Management

### View all processes:
```bash
pm2 list
```

### View logs:
```bash
pm2 logs client1
pm2 logs --lines 100
```

### Restart specific client:
```bash
pm2 restart client1
```

### Monitor resources:
```bash
pm2 monit
```

### Save PM2 configuration:
```bash
pm2 save
```

### Setup PM2 auto-start on boot:
```bash
pm2 startup
# Run the command it outputs
pm2 save
```

---

## Automated Updates with Cron

### Schedule weekly updates:
```bash
sudo crontab -e
```

Add this line to update all clients every Sunday at 2 AM:
```cron
0 2 * * 0 /usr/local/bin/update-all-clients.sh main >> /var/log/jobsite-cron-updates.log 2>&1
```

---

## Troubleshooting

### Update fails with "permission denied"
```bash
# Check file ownership
ls -la /var/www/client1

# Fix ownership if needed
sudo chown -R www-data:www-data /var/www/client1
```

### PM2 process not found
```bash
# List all PM2 processes
pm2 list

# Start the process if missing
cd /var/www/client1
pm2 start npm --name "client1" -- start
pm2 save
```

### Health check fails
```bash
# Check if app is running
pm2 list

# Check logs for errors
pm2 logs client1

# Check if port is in use
netstat -tulpn | grep :3001

# Manually test health endpoint
curl http://localhost:3001/api/health
```

### Config files getting overwritten
The scripts automatically preserve config files, but if issues persist:
```bash
# Add to .gitignore
echo "config/subscription.json" >> .gitignore
echo ".env.local" >> .gitignore

# Commit the .gitignore change
git add .gitignore
git commit -m "Ignore client-specific config files"
```

### Build fails
```bash
# Check Node.js version
node --version

# Clear build cache
cd /var/www/client1
rm -rf .next
npm run build
```

---

## Best Practices

1. **Always test in staging first:**
   ```bash
   sudo update-client.sh /var/www/staging feature-branch
   ```

2. **Backup before major updates:**
   ```bash
   tar -czf /backups/client1-$(date +%s).tar.gz /var/www/client1
   ```

3. **Monitor logs after updates:**
   ```bash
   pm2 logs client1 --lines 50
   ```

4. **Keep rollback ready:**
   - Scripts keep last 5 config backups in /tmp
   - Can rollback within seconds if needed

5. **Use branches for client-specific versions:**
   ```bash
   # Main branch for standard clients
   update-client.sh /var/www/client1 main

   # Custom branch for clients with special features
   update-client.sh /var/www/client-special custom-features
   ```

---

## Health Check Endpoint

Ensure your app has a health check endpoint:

```javascript
// app/api/health/route.js
export async function GET() {
  return new Response(
    JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}
```

---

## Support

For issues or questions:
1. Check logs: `/var/log/jobsite-updates-*.log`
2. Check PM2 logs: `pm2 logs`
3. Review this README
4. Contact your development team
