-- Add these tables to your Prisma schema file
-- Copy the Prisma model definitions below to your schema.prisma file

-- Security Events Table
CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'low',
    ip_address INET,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_agent TEXT,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Security Alerts Table  
CREATE TABLE IF NOT EXISTS security_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'medium',
    ip_address INET,
    event_count INTEGER DEFAULT 1,
    details JSONB DEFAULT '{}',
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_ip_address ON security_events(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);

CREATE INDEX IF NOT EXISTS idx_security_alerts_created_at ON security_alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_security_alerts_resolved ON security_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);

-- PRISMA SCHEMA MODELS TO ADD TO schema.prisma:

/*
model SecurityEvent {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  eventType  String   @map("event_type") @db.VarChar(50)
  severity   String   @default("low") @db.VarChar(20)
  ipAddress  String?  @map("ip_address") @db.Inet
  userId     String?  @map("user_id") @db.Uuid
  userAgent  String?  @map("user_agent")
  details    Json     @default("{}")
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz

  // Relations
  users      Users?   @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@map("security_events")
  @@index([createdAt])
  @@index([eventType])
  @@index([severity])
  @@index([ipAddress])
  @@index([userId])
}

model SecurityAlert {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  alertType   String    @map("alert_type") @db.VarChar(50)
  severity    String    @default("medium") @db.VarChar(20)
  ipAddress   String?   @map("ip_address") @db.Inet
  eventCount  Int       @default(1) @map("event_count")
  details     Json      @default("{}")
  resolved    Boolean   @default(false)
  resolvedAt  DateTime? @map("resolved_at") @db.Timestamptz
  resolvedBy  String?   @map("resolved_by") @db.Uuid
  createdAt   DateTime  @default(now()) @map("created_at") @db.Timestamptz

  // Relations
  resolvedByUser Users? @relation("SecurityAlertResolvedBy", fields: [resolvedBy], references: [id], onDelete: SetNull)

  @@map("security_alerts")
  @@index([createdAt])
  @@index([resolved])
  @@index([severity])
}
*/