# Google Analytics Dashboard Setup Guide

This guide will help you set up the Google Analytics dashboard in your Applications Manager.

## Prerequisites

1. A Google Analytics 4 (GA4) property for your website
2. Admin access to the Google Cloud Console
3. Admin access to your Google Analytics property

## Step 1: Run Permissions SQL

First, run the permissions SQL script to add the necessary permissions:

```bash
# Run this in your PostgreSQL database
psql -d your_database_name -f setup-google-analytics-permissions.sql
```

## Step 2: Enable Analytics Tracking

1. Go to Applications Manager → Settings
2. Find the "Analytics Tracking" setting under the "Integrations" category
3. Set it to `true` and save

## Step 3: Google Cloud Console Setup

### 3.1 Create a Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select or create a project
3. Enable the Google Analytics Reporting API:
   - Go to APIs & Services → Library
   - Search for "Google Analytics Reporting API"
   - Click on it and click "Enable"

4. Create a service account:
   - Go to APIs & Services → Credentials
   - Click "Create Credentials" → "Service Account"
   - Fill in the service account details
   - Click "Create and Continue"
   - Skip role assignment for now
   - Click "Done"

### 3.2 Generate Service Account Key

1. Click on your newly created service account
2. Go to the "Keys" tab
3. Click "Add Key" → "Create New Key"
4. Choose JSON format and click "Create"
5. Download and save the JSON file securely

## Step 4: Configure Environment Variables

Add these variables to your `.env` file:

```env
# Google Analytics Service Account (from the JSON file)
GOOGLE_ANALYTICS_SERVICE_ACCOUNT_EMAIL=your-service-account@project-id.iam.gserviceaccount.com
GOOGLE_ANALYTICS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"

# Your GA4 Property ID (numeric, not the Measurement ID)
GOOGLE_ANALYTICS_PROPERTY_ID=123456789
```

**Important Notes:**
- The `GOOGLE_ANALYTICS_PRIVATE_KEY` must include the full private key with `\n` for line breaks
- Use the **Property ID** (numeric), not the Measurement ID (G-XXXXXXXXXX)

## Step 5: Grant Google Analytics Access

### 5.1 Find Your Property ID

1. Go to [Google Analytics](https://analytics.google.com/)
2. Select your property
3. Go to Admin (gear icon in bottom left)
4. In the Property column, click "Property Settings"
5. Copy the Property ID (numeric value like 123456789)

### 5.2 Add Service Account to GA4

1. In Google Analytics Admin, stay in the Property column
2. Click "Property Access Management"
3. Click the "+" button → "Add users"
4. Enter your service account email (from step 3.2)
5. Select "Viewer" role
6. Uncheck "Notify new users by email"
7. Click "Add"

## Step 6: Restart and Test

1. Restart your application to load the new environment variables
2. Go to Applications Manager → Website Analytics
3. If everything is configured correctly, you should see your analytics data

## Troubleshooting

### "User does not have sufficient permissions"
- Make sure the service account email is added to your GA4 property (not just the account level)
- Wait 5-10 minutes for permissions to propagate
- Verify you're using the correct Property ID

### "Property ID not configured"
- Make sure `GOOGLE_ANALYTICS_PROPERTY_ID` is set in your environment variables
- Use the numeric Property ID, not the Measurement ID

### "Credentials not properly configured"
- Verify the service account email is correct
- Ensure the private key includes proper line breaks (`\n`)
- Make sure you restarted the application after changing environment variables

### Tab Not Showing
- Verify the `analytics_tracking` setting is set to `true` in your settings
- Check that the permissions SQL script was run successfully
- Ensure your user has the proper role permissions

## Security Notes

- Keep your service account JSON file secure and never commit it to version control
- The service account only has read access to your analytics data
- Consider using a dedicated project for this service account
- Regularly rotate service account keys as part of your security practices