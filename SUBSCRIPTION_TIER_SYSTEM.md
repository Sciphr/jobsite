# Subscription Tier System Architecture

## Overview
A real-time subscription tier management system for Asari job board installations. Each customer gets their own VPS installation, and tier changes are managed centrally from a SaaS management dashboard.

## System Components

### 1. SaaS Management Dashboard (Raspberry Pi - Local)
- **Database**: `saas_management` with `saas_installations` table
- **Location**: Local Raspberry Pi
- **Purpose**: Central control panel for managing all customer installations
- **Additional Column Needed**:
  ```sql
  ALTER TABLE saas_installations
  ADD COLUMN subscription_tier VARCHAR(20) DEFAULT 'basic'
  CHECK (subscription_tier IN ('basic', 'enterprise'));
  ```

### 2. Customer Installations (VPS - Cloud)
- **Database**: Individual PostgreSQL database per customer
- **Location**: Various VPS providers
- **Tiers**:
  - **Basic**: Admin panel + public job board only
  - **Enterprise**: Everything + full `/applications-manager` suite

## Architecture Design

### Tier Storage Method: Config File + Hot Reload
**Why this approach:**
- ✅ Feels "native" (not database-driven)
- ✅ Customers cannot edit (file-based, not in their database)
- ✅ Instant updates via hot reload
- ✅ Zero downtime tier changes

### File Structure:
```javascript
// /config/subscription.json (in each installation)
{
  "tier": "enterprise",
  "last_updated": "2025-01-17T10:30:00Z",
  "updated_by": "saas_management_dashboard"
}
```

## Real-Time Update Flow

### 1. Tier Change Process
1. **Admin action**: Change tier in SaaS management dashboard (Raspberry Pi)
2. **Webhook call**: Dashboard sends HTTP POST to customer VPS
3. **Config update**: VPS updates `/config/subscription.json`
4. **Hot reload**: App re-reads config into memory
5. **WebSocket broadcast**: Notify all connected users
6. **Instant UI update**: Features appear/disappear without refresh

### 2. Network Communication
- **Raspberry Pi → VPS**: Webhooks (HTTP POST calls)
- **VPS → Users**: WebSockets for real-time updates
- **Requirements**: Raspberry Pi needs outbound internet access

## Implementation Components

### 1. SaaS Management Dashboard APIs
```javascript
// Endpoint to update customer tier
POST /api/customers/{installation_id}/tier
{
  "new_tier": "enterprise"
}

// Triggers webhook to customer installation
POST https://{customer-domain}/api/webhook/tier-update
Authorization: Bearer {installation_webhook_secret}
{
  "tier": "enterprise",
  "updated_by": "saas_management"
}
```

### 2. Customer Installation APIs
```javascript
// Webhook endpoint (receives tier updates)
POST /api/webhook/tier-update
- Updates /config/subscription.json
- Hot reloads config into memory
- Broadcasts to all connected users

// WebSocket endpoint (real-time user updates)
WS /api/ws/features
- Sends feature updates to connected browsers
```

### 3. Feature Gating Logic
```javascript
// Check tier for route access
function hasEnterpriseTier() {
  return subscriptionConfig.tier === 'enterprise';
}

// Route protection middleware
if (!hasEnterpriseTier() && req.path.startsWith('/applications-manager')) {
  return redirect('/admin');
}
```

### 4. Real-Time User Experience
```javascript
// Client-side WebSocket listener
ws.onmessage = (event) => {
  const { type, data } = JSON.parse(event.data);
  if (type === 'tier_updated') {
    // Show notification: "🎉 Upgraded to Enterprise!"
    // Update navigation menu
    // Show/hide features instantly
    updateUIFeatures(data.new_tier);
  }
};
```

## Security Considerations

### 1. Config File Security
- **Location**: Outside web root (`/config/` not `/public/`)
- **Permissions**: Only server process can read/write
- **Validation**: Webhook endpoints validate API keys

### 2. Webhook Security
- **Authentication**: Each installation has unique API key
- **Source validation**: Verify calls come from management dashboard
- **HTTPS**: All webhook calls over encrypted connection

### 3. WebSocket Security
- **Session-based**: Only authenticated users receive updates
- **Rate limiting**: Prevent WebSocket abuse

## Tier Differences

### Basic Tier
- `/admin` routes (job posting, basic settings)
- Public job board (`/` routes)
- Basic application viewing
- User management

### Enterprise Tier
- **Everything in Basic** +
- **Applications Manager** (`/applications-manager` routes):
  - Advanced pipeline management
  - Analytics dashboard
  - Google Analytics integration
  - Communication suite (email templates, automation)
  - Interview management system
  - Bulk operations
  - Advanced reporting

## Fallback Strategy

### If Management Dashboard is Down:
- Installations use cached tier from config file
- No degradation of service
- Tier changes delayed until dashboard is back online

### If Customer Installation is Down:
- Webhook calls will fail gracefully
- Dashboard can retry failed webhooks
- When installation comes back online, it uses last cached config

## Implementation Steps

1. **Add subscription_tier column** to saas_installations table
2. **Create config file system** in customer installations
3. **Build webhook endpoints** in customer installations
4. **Implement hot reload mechanism**
5. **Add WebSocket broadcasting** for real-time updates
6. **Create management dashboard UI** for tier changes
7. **Add route protection middleware**
8. **Test tier switching** end-to-end

## Benefits of This Approach

- ✅ **Native feel**: Features exist or don't, no constant database checks
- ✅ **Real-time updates**: Instant tier changes visible to users
- ✅ **Secure**: Customers cannot modify their own tier
- ✅ **Centralized control**: Manage all customers from one dashboard
- ✅ **Scalable**: Works with unlimited customer installations
- ✅ **Resilient**: Graceful fallbacks if systems are down
- ✅ **Professional**: Smooth upgrade/downgrade experience

## Technical Notes

### Network Requirements:
- Raspberry Pi needs outbound internet (for webhooks)
- Each VPS needs inbound HTTPS (for webhook receivers)
- WebSocket connections from browsers to VPS

### Performance:
- Config file reads are cached in memory
- WebSocket broadcasts are lightweight
- No database queries for every feature check

### Maintenance:
- Easy to add new tiers (just update config schema)
- Simple to add new features to existing tiers
- Clear separation between management and customer systems