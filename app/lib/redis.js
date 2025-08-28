// app/lib/redis.js
import { Redis } from '@upstash/redis'

// Initialize Redis client
export const redis = process.env.UPSTASH_REDIS_REST_URL ? new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
}) : null

// Cache utilities
export const cache = {
  // Get data from cache
  async get(key) {
    if (!redis) return null
    try {
      const data = await redis.get(key)
      return data
    } catch (error) {
      console.warn('Redis get error:', error)
      return null
    }
  },

  // Set data in cache with optional expiration (seconds)
  async set(key, value, expireInSeconds = 300) {
    if (!redis) return false
    try {
      if (expireInSeconds) {
        await redis.setex(key, expireInSeconds, JSON.stringify(value))
      } else {
        await redis.set(key, JSON.stringify(value))
      }
      return true
    } catch (error) {
      console.warn('Redis set error:', error)
      return false
    }
  },

  // Delete from cache
  async del(key) {
    if (!redis) return false
    try {
      await redis.del(key)
      return true
    } catch (error) {
      console.warn('Redis del error:', error)
      return false
    }
  },

  // Delete multiple keys by pattern
  async delPattern(pattern) {
    if (!redis) return false
    try {
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(...keys)
      }
      return true
    } catch (error) {
      console.warn('Redis delPattern error:', error)
      return false
    }
  },

  // Increment counter (for rate limiting)
  async incr(key, expireInSeconds = 3600) {
    if (!redis) return 1
    try {
      const count = await redis.incr(key)
      if (count === 1) {
        await redis.expire(key, expireInSeconds)
      }
      return count
    } catch (error) {
      console.warn('Redis incr error:', error)
      return 1
    }
  }
}

// Rate limiting utilities
export const rateLimit = {
  async checkLimit(identifier, limit = 100, windowSeconds = 60) {
    const key = `rate_limit:${identifier}:${Math.floor(Date.now() / (windowSeconds * 1000))}`
    const count = await cache.incr(key, windowSeconds)
    
    return {
      allowed: count <= limit,
      count,
      limit,
      resetTime: Math.ceil(Date.now() / (windowSeconds * 1000)) * windowSeconds * 1000
    }
  }
}

// Session utilities
export const sessionCache = {
  async getUser(userId) {
    return await cache.get(`user:${userId}`)
  },

  async setUser(userId, userData, expireMinutes = 30) {
    return await cache.set(`user:${userId}`, userData, expireMinutes * 60)
  },

  async invalidateUser(userId) {
    await cache.del(`user:${userId}`)
    await cache.delPattern(`permissions:${userId}:*`)
  },

  async getUserPermissions(userId) {
    return await cache.get(`permissions:${userId}`)
  },

  async setUserPermissions(userId, permissions, expireMinutes = 60) {
    return await cache.set(`permissions:${userId}`, permissions, expireMinutes * 60)
  }
}