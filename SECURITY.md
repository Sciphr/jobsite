# 🔒 JobSite Security Implementation Guide

## Overview
This document outlines the comprehensive security measures implemented in the JobSite application to protect against common web application vulnerabilities and ensure data safety.

## 🛡️ Security Features Implemented

### 1. **Authentication & Authorization**
- **NextAuth.js** with secure session management
- **Permission-based access control** (58 granular permissions)
- **Role-based access control (RBAC)**
- **Super admin bypass** (privilege level 3+)
- **Multi-factor authentication support**
- **SAML SSO integration**
- **LDAP authentication**

### 2. **Security Headers**
All responses include comprehensive security headers:

```javascript
// Implemented in next.config.js
X-XSS-Protection: 1; mode=block
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: [Restrictive policy]
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### 3. **Content Security Policy (CSP)**
Restrictive CSP that allows:
- Self-hosted scripts and styles
- Google services for OAuth
- Fonts from Google Fonts
- Images from your MinIO server
- No inline scripts/styles (except where necessary with nonces)

### 4. **Rate Limiting**
- **API routes**: 100 requests/minute
- **Auth routes**: 5 attempts/15 minutes
- **General routes**: 300 requests/minute
- **IP-based tracking** with sliding window

### 5. **Input Validation & Sanitization**
- **XSS prevention** through HTML encoding
- **SQL injection protection** with parameterized queries
- **File upload validation** (type, size, name restrictions)
- **Request body validation** with custom schemas

### 6. **Session Security**
- **Secure cookies** in production
- **HttpOnly flags** on session cookies
- **SameSite=Lax** protection
- **24-hour session expiration**
- **Token rotation** (1 hour in production)

### 7. **Middleware Protection**
- **Suspicious user agent blocking**
- **Path traversal protection**
- **SQL injection pattern detection**
- **Admin route protection**
- **API key authentication**

### 8. **Security Monitoring**
- **Real-time event logging**
- **Automated alerting** for threshold breaches
- **Security dashboard** with metrics
- **Audit trails** for all actions

## 🔧 Configuration

### Environment Variables Security
Required secure environment variables:
```bash
NEXTAUTH_SECRET=<32+ character random string>
NEXTAUTH_URL=https://yourdomain.com
DATABASE_URL=postgresql://...
CRON_SECRET=<16+ character random string>
ENCRYPTION_KEY=<32+ character key>
```

### Security Headers Configuration
Located in `next.config.js`:
```javascript
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        // Security headers array
      ]
    }
  ]
}
```

### Middleware Configuration  
Located in `middleware.js`:
```javascript
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
```

## 🚨 Security Monitoring

### Event Types Monitored
- Login failures
- Permission denials
- Rate limit violations
- SQL injection attempts
- XSS attempts
- File upload violations
- Suspicious activity
- Brute force attempts

### Alert Thresholds
- **Login failures**: 5 attempts in 15 minutes
- **Permission denials**: 20 attempts in 1 minute
- **SQL injection**: Immediate alert
- **XSS attempts**: Immediate alert

### Security Dashboard
Access security metrics at `/admin/security` (admin only):
- Event counts by severity
- Top suspicious IPs
- Recent security events
- Active alerts
- Response times

## 🔐 Permission System

### 58 Granular Permissions
Organized by resource:
- **Applications**: view, create, edit, delete, approve_hire, assign, bulk_actions, export, notes, status_change
- **Jobs**: view, create, edit, delete, approve, clone, export, feature, publish
- **Users**: view, create, edit, delete, export, impersonate, roles
- **Analytics**: view, advanced, export
- **Settings**: view, edit_system, edit_branding, edit_notifications, integrations
- **Emails**: view, create, send, templates, automation
- **Interviews**: view, create, edit, delete, notes, reschedule, calendar
- **Roles**: view, create, edit, delete, assign
- **Audit Logs**: view, export
- **Weekly Digest**: view, edit, send
- **Google Analytics**: view

### Permission Enforcement
Every API route uses either:
```javascript
// Session-based protection
const authResult = await protectRoute("resource", "action");
if (authResult.error) return authResult.error;

// API key-based protection
return protectAPIRoute(request, 'resource', 'action', async (apiKeyData) => {
  // Route logic
});
```

## 🛠️ Security Tools & Libraries

### Core Security Dependencies
```json
{
  "next-auth": "^4.x",
  "bcryptjs": "^2.x",
  "validator": "^13.x",
  "@prisma/client": "^5.x"
}
```

### Security Utilities
- `app/lib/security.js` - Input validation & sanitization
- `app/lib/security-monitor.js` - Event logging & alerting
- `app/lib/middleware/apiProtection.js` - Route protection
- `middleware.js` - Request-level security

## 📋 Security Checklist

### ✅ Implemented
- [x] Permission-based authorization
- [x] Secure session management
- [x] Input validation & sanitization
- [x] Rate limiting
- [x] Security headers
- [x] Content Security Policy
- [x] SQL injection protection
- [x] XSS prevention
- [x] CSRF protection
- [x] File upload security
- [x] Security monitoring
- [x] Audit logging
- [x] Environment validation

### 🔄 Ongoing Maintenance
- [ ] Regular security audits
- [ ] Dependency updates
- [ ] Penetration testing
- [ ] Security training
- [ ] Incident response procedures

## 🚀 Production Deployment Security

### HTTPS Enforcement
- Use HTTPS in production
- HSTS headers configured
- Secure cookie flags enabled

### Database Security
- Connection pooling
- Parameterized queries only
- Row-level security (if applicable)
- Regular backups with encryption

### Infrastructure Security
- Firewall configuration
- VPN access for admin functions
- Regular security patches
- Monitoring & alerting

### API Security
- API key authentication
- Rate limiting per key
- Request/response logging
- Webhook signature validation

## 🔍 Testing Security

### Automated Testing
```bash
# Run security tests
npm run test:security

# Check for vulnerabilities
npm audit

# Dependency security scan
npm run security:scan
```

### Manual Testing
1. **Authentication bypass attempts**
2. **Permission escalation tests**
3. **SQL injection testing**
4. **XSS payload testing**
5. **CSRF attack simulation**
6. **File upload security testing**

## 📞 Security Incident Response

### Immediate Actions
1. **Identify** the threat type
2. **Contain** the incident
3. **Document** all actions
4. **Notify** stakeholders
5. **Recover** services safely

### Contact Information
- **Security Team**: security@company.com
- **DevOps Team**: devops@company.com
- **Management**: management@company.com

## 📚 Security Resources

### Documentation
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NextAuth.js Security](https://next-auth.js.org/configuration/options#security)
- [Next.js Security](https://nextjs.org/docs/going-to-production#security-headers)

### Tools
- [SecurityHeaders.com](https://securityheaders.com/) - Test your headers
- [Observatory by Mozilla](https://observatory.mozilla.org/) - Security analysis
- [Snyk](https://snyk.io/) - Dependency vulnerability scanning

---

## 🚨 Emergency Contacts

If you discover a security vulnerability:
1. **DO NOT** open a public issue
2. **Email** security@company.com immediately
3. **Include** detailed reproduction steps
4. **Wait** for acknowledgment before disclosure

---

*Last updated: [Current Date]*
*Security review: [Next Review Date]*