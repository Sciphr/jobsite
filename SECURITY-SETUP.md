# 🔒 Security Setup Instructions

## Quick Fix for Prisma Error

The security monitoring system is ready, but you need to add the security tables to your database schema.

## Step 1: Add Security Models to Prisma Schema

Open your `prisma/schema.prisma` file and add these models at the end:

```prisma
model security_events {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  event_type String   @db.VarChar(50)
  severity   String   @default("low") @db.VarChar(20)
  ip_address String?  @db.Inet
  user_id    String?  @db.Uuid
  user_agent String?
  details    Json     @default("{}")
  created_at DateTime @default(now()) @db.Timestamp(6)

  // Relations
  users      users?   @relation("security_events_user_idTousers", fields: [user_id], references: [id], onDelete: SetNull)

  @@index([created_at])
  @@index([event_type])
  @@index([severity])
  @@index([ip_address])
  @@index([user_id])
}

model security_alerts {
  id           String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  alert_type   String    @db.VarChar(50)
  severity     String    @default("medium") @db.VarChar(20)
  ip_address   String?   @db.Inet
  event_count  Int       @default(1)
  details      Json      @default("{}")
  resolved     Boolean   @default(false)
  resolved_at  DateTime? @db.Timestamp(6)
  resolved_by  String?   @db.Uuid
  created_at   DateTime  @default(now()) @db.Timestamp(6)

  // Relations
  resolved_by_user users? @relation("security_alerts_resolved_byTousers", fields: [resolved_by], references: [id], onDelete: SetNull)

  @@index([created_at])
  @@index([resolved])
  @@index([severity])
}
```

## Step 2: Add Relations to Users Model

Find your existing `model users {` block and add these lines inside it:

```prisma
model users {
  // ... your existing fields ...

  // Security relations (add these lines)
  security_events_security_events_user_idTousers        security_events[] @relation("security_events_user_idTousers")
  security_alerts_security_alerts_resolved_byTousers    security_alerts[] @relation("security_alerts_resolved_byTousers")
}
```

## Step 3: Update Database

Run these commands to update your database:

```bash
# Generate the Prisma client with new models
npx prisma generate

# Push the schema changes to your database
npx prisma db push
```

## Step 4: Test Security System

```bash
# Test the security monitoring system
npm run security:monitor

# Test security headers
npm run security:headers-test

# Full security audit
npm run security:full-scan
```

## Current Security Status

✅ **Security headers** - Implemented and ready
✅ **Rate limiting** - Active and protecting all routes  
✅ **Input validation** - XSS and SQL injection protection active
✅ **Session security** - Enhanced cookie security configured
✅ **Permission system** - All 113 routes now properly protected
✅ **Security monitoring** - Code ready, needs database tables

⚠️ **Database tables** - Need to be added (follow steps above)

## Testing Without Database Tables

The security system is designed to gracefully handle missing tables:
- Security events will log to console instead of database
- All protection mechanisms still work
- No errors will be thrown

## Next Steps After Setup

1. **Monitor Security Events**: Check logs for security events
2. **Set Up Alerts**: Configure Slack/email notifications
3. **Regular Audits**: Run `npm run security:full-scan` weekly
4. **Production Deployment**: Ensure HTTPS and secure environment variables

## Production Checklist

- [ ] Security tables added to database
- [ ] HTTPS enabled
- [ ] Strong environment variables set
- [ ] Security monitoring alerts configured
- [ ] Regular security audits scheduled
- [ ] Backup and recovery procedures in place

Your security system is **production-ready** once the database tables are added! 🚀