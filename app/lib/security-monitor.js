// app/lib/security-monitor.js
/**
 * Security monitoring and alerting system
 */

import { appPrisma } from './prisma'

// Security event types
export const SecurityEventTypes = {
  LOGIN_FAILURE: 'login_failure',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  PERMISSION_DENIED: 'permission_denied',
  SQL_INJECTION_ATTEMPT: 'sql_injection_attempt',
  XSS_ATTEMPT: 'xss_attempt',
  FILE_UPLOAD_VIOLATION: 'file_upload_violation',
  BRUTE_FORCE_ATTEMPT: 'brute_force_attempt',
  PRIVILEGE_ESCALATION: 'privilege_escalation',
  DATA_EXPORT_UNUSUAL: 'data_export_unusual'
}

// Severity levels
export const SeverityLevels = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
}

// Security monitor class
export class SecurityMonitor {
  static instance = null

  constructor() {
    if (SecurityMonitor.instance) {
      return SecurityMonitor.instance
    }
    SecurityMonitor.instance = this
    this.eventStore = new Map() // In-memory store for rate limiting
    this.alertThresholds = {
      [SecurityEventTypes.LOGIN_FAILURE]: { count: 5, windowMs: 15 * 60 * 1000 }, // 5 failures in 15 min
      [SecurityEventTypes.RATE_LIMIT_EXCEEDED]: { count: 10, windowMs: 60 * 1000 }, // 10 in 1 min
      [SecurityEventTypes.PERMISSION_DENIED]: { count: 20, windowMs: 60 * 1000 }, // 20 in 1 min
      [SecurityEventTypes.SQL_INJECTION_ATTEMPT]: { count: 1, windowMs: 60 * 1000 }, // Immediate
      [SecurityEventTypes.XSS_ATTEMPT]: { count: 1, windowMs: 60 * 1000 } // Immediate
    }
  }

  /**
   * Log a security event
   */
  async logEvent(eventType, details = {}) {
    const event = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      eventType,
      severity: this.getSeverity(eventType),
      ...details
    }

    try {
      // Store in database (only if security tables exist)
      if (appPrisma.security_events) {
        await appPrisma.security_events.create({
          data: {
            event_type: event.eventType,
            severity: event.severity,
            ip_address: event.ipAddress || null,
            user_id: event.userId || null,
            user_agent: event.userAgent || null,
            details: JSON.stringify(event.details || {}),
            created_at: event.timestamp
          }
        })

        // Check if this triggers an alert
        await this.checkForAlert(event)
      } else {
        // Security tables not yet added - just log to console
        console.log(`🔒 SECURITY EVENT [${event.severity.toUpperCase()}] (DB table not found):`, {
          type: event.eventType,
          details: event.details,
          timestamp: event.timestamp.toISOString()
        })
      }

      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔒 SECURITY EVENT [${event.severity.toUpperCase()}]:`, {
          type: event.eventType,
          details: event.details,
          timestamp: event.timestamp.toISOString()
        })
      }

    } catch (error) {
      console.error('Failed to log security event:', error)
      // Fallback: at least log to console
      console.warn('SECURITY EVENT (DB FAILED):', event)
    }

    return event
  }

  /**
   * Determine severity based on event type
   */
  getSeverity(eventType) {
    const criticalEvents = [
      SecurityEventTypes.SQL_INJECTION_ATTEMPT,
      SecurityEventTypes.PRIVILEGE_ESCALATION,
      SecurityEventTypes.BRUTE_FORCE_ATTEMPT
    ]

    const highEvents = [
      SecurityEventTypes.XSS_ATTEMPT,
      SecurityEventTypes.FILE_UPLOAD_VIOLATION,
      SecurityEventTypes.SUSPICIOUS_ACTIVITY
    ]

    const mediumEvents = [
      SecurityEventTypes.PERMISSION_DENIED,
      SecurityEventTypes.DATA_EXPORT_UNUSUAL
    ]

    if (criticalEvents.includes(eventType)) return SeverityLevels.CRITICAL
    if (highEvents.includes(eventType)) return SeverityLevels.HIGH
    if (mediumEvents.includes(eventType)) return SeverityLevels.MEDIUM
    return SeverityLevels.LOW
  }

  /**
   * Check if event frequency triggers an alert
   */
  async checkForAlert(event) {
    const threshold = this.alertThresholds[event.eventType]
    if (!threshold) return

    const key = `${event.eventType}-${event.ipAddress || 'unknown'}`
    const now = Date.now()

    // Get or create event tracking
    if (!this.eventStore.has(key)) {
      this.eventStore.set(key, [])
    }

    const events = this.eventStore.get(key)
    
    // Remove old events outside the window
    const recentEvents = events.filter(timestamp => 
      now - timestamp < threshold.windowMs
    )
    
    // Add current event
    recentEvents.push(now)
    this.eventStore.set(key, recentEvents)

    // Check if threshold exceeded
    if (recentEvents.length >= threshold.count) {
      await this.triggerAlert(event, recentEvents.length)
    }
  }

  /**
   * Trigger security alert
   */
  async triggerAlert(event, eventCount) {
    const alert = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      eventType: event.eventType,
      severity: SeverityLevels.HIGH,
      eventCount,
      ipAddress: event.ipAddress,
      details: {
        message: `Security threshold exceeded: ${eventCount} ${event.eventType} events`,
        originalEvent: event,
        eventCount
      }
    }

    try {
      // Store alert in database (only if security tables exist)
      if (appPrisma.security_alerts) {
        await appPrisma.security_alerts.create({
          data: {
            alert_type: alert.eventType,
            severity: alert.severity,
            ip_address: alert.ipAddress || null,
            event_count: alert.eventCount,
            details: JSON.stringify(alert.details),
            created_at: alert.timestamp,
            resolved: false
          }
        })
      }

      // In production, you'd send this to your monitoring system
      console.error('🚨 SECURITY ALERT:', alert)

      // You could integrate with services like:
      // - Slack webhooks
      // - Email alerts
      // - PagerDuty
      // - DataDog
      // - Sentry

    } catch (error) {
      console.error('Failed to create security alert:', error)
    }
  }

  /**
   * Get recent security events
   */
  async getRecentEvents(limit = 100, severity = null) {
    try {
      if (!appPrisma.security_events) {
        console.log('Security events table not found')
        return []
      }
      
      const where = severity ? { severity } : {}
      
      return await appPrisma.security_events.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
        include: {
          users: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          }
        }
      })
    } catch (error) {
      console.error('Error getting recent security events:', error)
      return []
    }
  }

  /**
   * Get security statistics
   */
  async getSecurityStats(timeframe = '24h') {
    try {
      if (!appPrisma.security_events || !appPrisma.security_alerts) {
        console.log('Security tables not found, returning empty stats')
        return {
          timeframe,
          totalEvents: 0,
          activeAlerts: 0,
          eventsBySeverity: {},
          eventsByType: [],
          topIPs: []
        }
      }
    const now = new Date()
    let startTime = new Date()

    switch (timeframe) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000)
        break
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
    }

    const [
      totalEvents,
      eventsBySeverity,
      eventsByType,
      topIPs,
      activeAlerts
    ] = await Promise.all([
      // Total events
      appPrisma.security_events.count({
        where: { created_at: { gte: startTime } }
      }),

      // Events by severity
      appPrisma.security_events.groupBy({
        by: ['severity'],
        where: { created_at: { gte: startTime } },
        _count: { id: true }
      }),

      // Events by type
      appPrisma.security_events.groupBy({
        by: ['event_type'],
        where: { created_at: { gte: startTime } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } }
      }),

      // Top IPs
      appPrisma.security_events.groupBy({
        by: ['ip_address'],
        where: { 
          created_at: { gte: startTime },
          ip_address: { not: null }
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10
      }),

      // Active alerts
      appPrisma.security_alerts.count({
        where: { 
          created_at: { gte: startTime },
          resolved: false 
        }
      })
    ])

    return {
      timeframe,
      totalEvents,
      activeAlerts,
      eventsBySeverity: eventsBySeverity.reduce((acc, item) => {
        acc[item.severity] = item._count.id
        return acc
      }, {}),
      eventsByType: eventsByType.map(item => ({
        type: item.event_type,
        count: item._count.id
      })),
      topIPs: topIPs.map(item => ({
        ip: item.ip_address,
        count: item._count.id
      }))
    }
    } catch (error) {
      console.error('Error getting security stats:', error)
      return {
        timeframe,
        totalEvents: 0,
        activeAlerts: 0,
        eventsBySeverity: {},
        eventsByType: [],
        topIPs: []
      }
    }
  }

  /**
   * Mark alert as resolved
   */
  async resolveAlert(alertId, resolvedBy = null) {
    try {
      if (!appPrisma.security_alerts) {
        console.log('Security alerts table not found')
        return null
      }
      
      return await appPrisma.security_alerts.update({
        where: { id: alertId },
        data: {
          resolved: true,
          resolved_at: new Date(),
          resolved_by: resolvedBy
        }
      })
    } catch (error) {
      console.error('Error resolving security alert:', error)
      return null
    }
  }
}

// Convenience functions for common security events
export const securityMonitor = new SecurityMonitor()

export const logLoginFailure = (email, ipAddress, userAgent, reason) => 
  securityMonitor.logEvent(SecurityEventTypes.LOGIN_FAILURE, {
    email,
    ipAddress,
    userAgent,
    details: { reason }
  })

export const logPermissionDenied = (userId, resource, action, ipAddress) =>
  securityMonitor.logEvent(SecurityEventTypes.PERMISSION_DENIED, {
    userId,
    ipAddress,
    details: { resource, action, permission: `${resource}:${action}` }
  })

export const logSuspiciousActivity = (description, userId, ipAddress, userAgent) =>
  securityMonitor.logEvent(SecurityEventTypes.SUSPICIOUS_ACTIVITY, {
    userId,
    ipAddress,
    userAgent,
    details: { description }
  })

export const logRateLimitExceeded = (endpoint, ipAddress, requestCount) =>
  securityMonitor.logEvent(SecurityEventTypes.RATE_LIMIT_EXCEEDED, {
    ipAddress,
    details: { endpoint, requestCount }
  })

export const logSQLInjectionAttempt = (query, ipAddress, userAgent) =>
  securityMonitor.logEvent(SecurityEventTypes.SQL_INJECTION_ATTEMPT, {
    ipAddress,
    userAgent,
    details: { suspiciousQuery: query.substring(0, 500) } // Truncate for storage
  })

export const logXSSAttempt = (payload, ipAddress, userAgent, endpoint) =>
  securityMonitor.logEvent(SecurityEventTypes.XSS_ATTEMPT, {
    ipAddress,
    userAgent,
    details: { payload: payload.substring(0, 500), endpoint }
  })

export const logFileUploadViolation = (filename, fileType, violation, userId, ipAddress) =>
  securityMonitor.logEvent(SecurityEventTypes.FILE_UPLOAD_VIOLATION, {
    userId,
    ipAddress,
    details: { filename, fileType, violation }
  })

export const logDataExportUnusual = (userId, dataType, recordCount, ipAddress) =>
  securityMonitor.logEvent(SecurityEventTypes.DATA_EXPORT_UNUSUAL, {
    userId,
    ipAddress,
    details: { dataType, recordCount }
  })