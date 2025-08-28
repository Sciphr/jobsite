// app/lib/serverCache.js - Server-side caching for API routes
import { cache } from './redis'

// Cache keys generator
export const cacheKeys = {
  dashboardStats: () => 'dashboard:stats',
  userPermissions: (userId) => `permissions:${userId}`,
  userRole: (userId) => `role:${userId}`,
  systemSettings: () => 'settings:system',
  systemStatus: () => 'system:status',
  jobsSimple: () => 'jobs:simple',
  jobsList: (page, filters) => `jobs:list:${page}:${JSON.stringify(filters)}`,
  applicationsList: (page, filters) => `applications:list:${page}:${JSON.stringify(filters)}`,
  usersList: (page, filters) => `users:list:${page}:${JSON.stringify(filters)}`,
  jobDetails: (jobId) => `job:${jobId}`,
  applicationDetails: (appId) => `application:${appId}`,
  userDetails: (userId) => `user:${userId}`,
  analytics: (timeframe) => `analytics:${timeframe}`,
  staleApplications: () => 'applications:stale',
  autoArchivePreview: () => 'auto:archive:preview',
  autoProgressPreview: () => 'auto:progress:preview'
}

// Cache duration constants (in seconds)
export const CACHE_DURATION = {
  VERY_SHORT: 30,      // 30 seconds - real-time data
  SHORT: 300,          // 5 minutes - frequently changing
  MEDIUM: 900,         // 15 minutes - moderately changing  
  LONG: 3600,          // 1 hour - rarely changing
  VERY_LONG: 86400,    // 24 hours - static/settings data
}

// Cache wrapper for API route handlers
export function withCache(handler, cacheKey, duration = CACHE_DURATION.SHORT) {
  return async function cachedHandler(request, context) {
    try {
      // Generate cache key (can be function or string)
      const key = typeof cacheKey === 'function' ? cacheKey(request, context) : cacheKey
      
      // Try to get from cache first
      const cached = await cache.get(key)
      if (cached) {
        const data = JSON.parse(cached)
        return new Response(JSON.stringify({
          ...data,
          _cached: true,
          _cacheKey: key
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // Execute original handler
      const response = await handler(request, context)
      
      // Cache successful responses
      if (response.status === 200) {
        const responseData = await response.text()
        await cache.set(key, responseData, duration)
        
        // Return fresh response
        return new Response(responseData, {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      return response
    } catch (error) {
      console.error('Cache wrapper error:', error)
      // Fallback to original handler on cache errors
      return await handler(request, context)
    }
  }
}

// Cache invalidation utilities
export const invalidateCache = {
  // Invalidate dashboard stats when applications/jobs change
  async dashboard() {
    await cache.del(cacheKeys.dashboardStats())
    await cache.delPattern('applications:*')
    await cache.delPattern('jobs:*')
  },

  // Invalidate user-specific caches
  async user(userId) {
    await cache.del(cacheKeys.userPermissions(userId))
    await cache.del(cacheKeys.userRole(userId))
    await cache.del(cacheKeys.userDetails(userId))
    await cache.delPattern(`users:list:*`)
  },

  // Invalidate job-related caches
  async jobs() {
    await cache.delPattern('jobs:*')
    await cache.del(cacheKeys.dashboardStats())
  },

  // Invalidate application-related caches  
  async applications() {
    await cache.delPattern('applications:*')
    await cache.del(cacheKeys.dashboardStats())
    await cache.del(cacheKeys.staleApplications())
  },

  // Invalidate settings cache
  async settings() {
    await cache.del(cacheKeys.systemSettings())
    await cache.del(cacheKeys.systemStatus())
  },

  // Invalidate everything (use sparingly)
  async all() {
    await cache.delPattern('*')
  }
}

// Smart cache invalidation on data changes
export function createSmartCache(resource) {
  return {
    // Cache data with smart expiration
    async set(key, data, options = {}) {
      const {
        duration = CACHE_DURATION.SHORT,
        tags = [],
        invalidateOn = []
      } = options

      await cache.set(key, data, duration)
      
      // Store cache metadata for smart invalidation
      if (tags.length > 0) {
        for (const tag of tags) {
          await cache.set(`tag:${tag}:${key}`, '1', duration)
        }
      }
    },

    // Invalidate by tags
    async invalidateByTag(tag) {
      const tagKeys = await cache.get(`tag:${tag}:*`)
      if (tagKeys) {
        for (const key of tagKeys) {
          await cache.del(key.replace(`tag:${tag}:`, ''))
        }
      }
    }
  }
}