-- API Keys Management Tables
-- Run this SQL script in your PostgreSQL database, then run:
-- npx prisma db pull
-- npx prisma generate

-- API Keys table - stores API key information
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,  -- You might not have companies table yet, so making this optional for now
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,  -- API key owner
  name VARCHAR(255) NOT NULL,  -- Human readable name like "CRM Integration"
  key_hash VARCHAR(255) NOT NULL UNIQUE,  -- Hashed API key for security
  key_prefix VARCHAR(20) NOT NULL,  -- First few chars for display (e.g., "sk_live_abc...")
  permissions JSONB NOT NULL DEFAULT '[]',  -- Array of permission strings ["jobs:read", "applications:write"]
  rate_limit INTEGER NOT NULL DEFAULT 1000,  -- Requests per hour
  requests_this_month INTEGER NOT NULL DEFAULT 0,
  total_requests INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMP(6),
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP(6),  -- Optional expiration
  created_at TIMESTAMP(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(6) NOT NULL DEFAULT NOW(),
  
  -- Add indexes for performance
  CONSTRAINT idx_api_keys_user_id UNIQUE (user_id),
  CONSTRAINT idx_api_keys_key_hash UNIQUE (key_hash)
);

-- API Usage Logs table - track all API requests
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,  -- GET, POST, PUT, DELETE
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER,
  user_agent TEXT,
  ip_address VARCHAR(45),
  request_size INTEGER,  -- Request payload size in bytes
  response_size INTEGER, -- Response payload size in bytes
  error_message TEXT,
  created_at TIMESTAMP(6) NOT NULL DEFAULT NOW()
);

-- API Webhook Endpoints table - for future webhook system
CREATE TABLE IF NOT EXISTS api_webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
  url VARCHAR(500) NOT NULL,
  events JSONB NOT NULL DEFAULT '[]',  -- ["application.created", "job.published"]
  is_active BOOLEAN NOT NULL DEFAULT true,
  secret VARCHAR(255),  -- For webhook signature verification
  last_delivery_at TIMESTAMP(6),
  last_delivery_status VARCHAR(20),  -- success, failed, pending
  failure_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(6) NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_expires_at ON api_keys(expires_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_api_key_id ON api_usage_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at ON api_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_endpoint ON api_usage_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_webhook_endpoints_api_key_id ON api_webhook_endpoints(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_webhook_endpoints_active ON api_webhook_endpoints(is_active);

-- Add comments for documentation
COMMENT ON TABLE api_keys IS 'Stores API keys for external integrations';
COMMENT ON COLUMN api_keys.key_hash IS 'SHA-256 hash of the actual API key for security';
COMMENT ON COLUMN api_keys.key_prefix IS 'First few characters for UI display (e.g., sk_live_abc...)';
COMMENT ON COLUMN api_keys.permissions IS 'JSON array of permissions like ["jobs:read", "applications:write"]';
COMMENT ON COLUMN api_keys.rate_limit IS 'Maximum requests per hour';

COMMENT ON TABLE api_usage_logs IS 'Logs all API requests for monitoring and billing';
COMMENT ON TABLE api_webhook_endpoints IS 'Webhook URLs for real-time event notifications';