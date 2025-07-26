# Microsoft Integration Setup Guide

## Overview
This guide will help you set up Microsoft integration for calendar sync and Teams meeting creation in your job site application.

## Required Environment Variables

Add the following environment variables to your `.env` file:

```env
# Microsoft Azure App Registration
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
MICROSOFT_REDIRECT_URI=https://yourdomain.com/api/microsoft/integration/callback
```

## Azure App Registration Setup

### 1. Create an Azure App Registration

1. Go to the [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Fill in the details:
   - **Name**: Your app name (e.g., "JobSite Microsoft Integration")
   - **Supported account types**: Choose "Accounts in any organizational directory and personal Microsoft accounts"
   - **Redirect URI**: Select "Web" and enter `https://yourdomain.com/api/microsoft/integration/callback`

### 2. Configure API Permissions

After creating the app registration:

1. Go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Choose **Delegated permissions**
5. Add the following permissions:
   - `Calendars.ReadWrite` - Read and write user calendars
   - `OnlineMeetings.ReadWrite` - Create and manage Teams meetings
   - `User.Read` - Read user profile
   - `offline_access` - Maintain access to data you have given it access to

6. Click **Grant admin consent** (if you're an admin) or ask your admin to grant consent

### 3. Create Client Secret

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Add a description and select expiration
4. Copy the **Value** - this is your `MICROSOFT_CLIENT_SECRET`
5. The **Application (client) ID** from the Overview page is your `MICROSOFT_CLIENT_ID`

## Database Migration

Run the following SQL commands to add Microsoft integration fields to your database:

```sql
ALTER TABLE users ADD COLUMN microsoft_access_token VARCHAR(500);
ALTER TABLE users ADD COLUMN microsoft_refresh_token VARCHAR(500);
ALTER TABLE users ADD COLUMN microsoft_token_expires_at TIMESTAMP(6);
ALTER TABLE users ADD COLUMN microsoft_user_id VARCHAR(255);
ALTER TABLE users ADD COLUMN microsoft_email VARCHAR(255);
ALTER TABLE users ADD COLUMN microsoft_tenant_id VARCHAR(255);
ALTER TABLE users ADD COLUMN microsoft_integration_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN microsoft_integration_connected_at TIMESTAMP(6);
```

Then run:
```bash
npx prisma db pull
npx prisma generate
```

## Features Enabled

Once configured, users will be able to:

1. **Calendar Integration**:
   - Sync with Outlook Calendar
   - Check availability before scheduling interviews
   - Automatically create calendar events for interviews

2. **Teams Integration**:
   - Generate Microsoft Teams meeting links
   - Automatically add Teams links to interview invitations

3. **Automatic Token Refresh**:
   - Tokens are automatically refreshed when they expire
   - Users don't need to reconnect frequently

## Security Considerations

- Client secrets should be kept secure and rotated regularly
- The redirect URI must match exactly what's configured in Azure
- Tokens are encrypted and stored securely in the database
- Only necessary permissions are requested from users

## Testing the Integration

1. Navigate to Admin Settings > Personal tab
2. You should see three integration cards side by side:
   - Google Calendar Integration
   - Zoom Integration  
   - Microsoft Integration
3. Click "Connect Microsoft" to test the OAuth flow
4. Use "Test Connection" to verify calendar and Teams access

## Troubleshooting

### Common Issues:

1. **"Microsoft integration not configured"**
   - Check that `MICROSOFT_CLIENT_ID` is set in your environment variables

2. **"Invalid redirect URI"**
   - Ensure the redirect URI in Azure matches your `MICROSOFT_REDIRECT_URI` environment variable

3. **"Insufficient privileges"**
   - Verify that all required API permissions are granted and admin consent is provided

4. **Token refresh failures**
   - Check that `offline_access` permission is granted
   - Verify client secret hasn't expired

### Debug Mode:
Check the browser console and server logs for detailed error messages during the OAuth flow.