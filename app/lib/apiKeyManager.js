import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from './prisma.js';

/**
 * API Key Management System
 * Handles secure generation, storage, and validation of API keys
 */

// API key formats
const API_KEY_PREFIX = 'sk_live_';
const API_KEY_LENGTH = 64; // Total length including prefix

/**
 * Generate a secure API key
 * Format: sk_live_abcdef123456789...
 */
export function generateAPIKey() {
  const randomPart = crypto.randomBytes(32).toString('hex');
  return `${API_KEY_PREFIX}${randomPart}`;
}

/**
 * Create a new API key for a user
 */
export async function createAPIKey({
  userId,
  name,
  permissions = [],
  rateLimit = 1000,
  expiresAt = null
}) {
  try {
    // Generate the API key
    const apiKey = generateAPIKey();
    
    // Hash the key for storage (never store plain text)
    const keyHash = await bcrypt.hash(apiKey, 12);
    
    // Extract prefix for display
    const keyPrefix = apiKey.substring(0, 15) + '...';
    
    // Create the database record
    const apiKeyRecord = await prisma.api_keys.create({
      data: {
        user_id: userId,
        name,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        permissions: JSON.stringify(permissions),
        rate_limit: rateLimit,
        expires_at: expiresAt,
        is_active: true
      }
    });
    
    // Return the API key (only time it's available in plain text)
    return {
      id: apiKeyRecord.id,
      apiKey, // This is the actual key - show once to user
      keyPrefix,
      name,
      permissions,
      rateLimit,
      createdAt: apiKeyRecord.created_at
    };
    
  } catch (error) {
    console.error('Error creating API key:', error);
    throw new Error('Failed to create API key');
  }
}

/**
 * Validate an API key and return key details
 */
export async function validateAPIKey(apiKey) {
  try {
    if (!apiKey || !apiKey.startsWith(API_KEY_PREFIX)) {
      return { valid: false, error: 'Invalid API key format' };
    }
    
    // Get all active API keys (we need to check them all since we hash)
    const apiKeys = await prisma.api_keys.findMany({
      where: {
        is_active: true,
        OR: [
          { expires_at: null },
          { expires_at: { gt: new Date() } }
        ]
      },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            privilegeLevel: true,
            isActive: true
          }
        }
      }
    });
    
    // Check each key hash
    for (const keyRecord of apiKeys) {
      const isMatch = await bcrypt.compare(apiKey, keyRecord.key_hash);
      
      if (isMatch) {
        // Check if user is still active
        if (!keyRecord.users?.isActive) {
          return { valid: false, error: 'User account is inactive' };
        }
        
        // Update last used timestamp
        await prisma.api_keys.update({
          where: { id: keyRecord.id },
          data: { 
            last_used_at: new Date(),
            total_requests: { increment: 1 }
          }
        });
        
        return {
          valid: true,
          keyId: keyRecord.id,
          userId: keyRecord.user_id,
          user: keyRecord.users,
          permissions: JSON.parse(keyRecord.permissions || '[]'),
          rateLimit: keyRecord.rate_limit,
          name: keyRecord.name
        };
      }
    }
    
    return { valid: false, error: 'Invalid API key' };
    
  } catch (error) {
    console.error('Error validating API key:', error);
    return { valid: false, error: 'API key validation failed' };
  }
}

/**
 * Check if API key has specific permission
 */
export function hasAPIPermission(apiKeyData, resource, action) {
  if (!apiKeyData.valid) return false;
  
  const requiredPermission = `${resource}:${action}`;
  return apiKeyData.permissions.includes(requiredPermission) || 
         apiKeyData.permissions.includes(`${resource}:*`) ||
         apiKeyData.permissions.includes('*:*');
}

/**
 * Log API usage for monitoring and rate limiting
 */
export async function logAPIUsage({
  apiKeyId,
  endpoint,
  method,
  statusCode,
  responseTimeMs,
  userAgent,
  ipAddress,
  requestSize = 0,
  responseSize = 0,
  errorMessage = null
}) {
  try {
    await prisma.api_usage_logs.create({
      data: {
        api_key_id: apiKeyId,
        endpoint,
        method,
        status_code: statusCode,
        response_time_ms: responseTimeMs,
        user_agent: userAgent,
        ip_address: ipAddress,
        request_size: requestSize,
        response_size: responseSize,
        error_message: errorMessage
      }
    });
    
    // Update monthly request count
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);
    
    const monthlyCount = await prisma.api_usage_logs.count({
      where: {
        api_key_id: apiKeyId,
        created_at: { gte: currentMonth }
      }
    });
    
    await prisma.api_keys.update({
      where: { id: apiKeyId },
      data: { requests_this_month: monthlyCount }
    });
    
  } catch (error) {
    console.error('Error logging API usage:', error);
    // Don't throw here - logging failures shouldn't break API calls
  }
}

/**
 * Check rate limit for API key
 */
export async function checkRateLimit(apiKeyId, rateLimit) {
  try {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    
    const requestCount = await prisma.api_usage_logs.count({
      where: {
        api_key_id: apiKeyId,
        created_at: { gte: oneHourAgo }
      }
    });
    
    return {
      allowed: requestCount < rateLimit,
      currentUsage: requestCount,
      limit: rateLimit,
      resetTime: new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
    };
    
  } catch (error) {
    console.error('Error checking rate limit:', error);
    // On error, allow the request (fail open)
    return { allowed: true, currentUsage: 0, limit: rateLimit };
  }
}

/**
 * Get API keys for a user
 */
export async function getUserAPIKeys(userId) {
  try {
    const apiKeys = await prisma.api_keys.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        name: true,
        key_prefix: true,
        permissions: true,
        rate_limit: true,
        requests_this_month: true,
        total_requests: true,
        last_used_at: true,
        is_active: true,
        expires_at: true,
        created_at: true
      }
    });
    
    return apiKeys.map(key => ({
      ...key,
      permissions: JSON.parse(key.permissions || '[]')
    }));
    
  } catch (error) {
    console.error('Error fetching user API keys:', error);
    throw new Error('Failed to fetch API keys');
  }
}

/**
 * Revoke (deactivate) an API key
 */
export async function revokeAPIKey(keyId, userId) {
  try {
    const apiKey = await prisma.api_keys.findFirst({
      where: { 
        id: keyId,
        user_id: userId // Ensure user owns the key
      }
    });
    
    if (!apiKey) {
      throw new Error('API key not found');
    }
    
    await prisma.api_keys.update({
      where: { id: keyId },
      data: { 
        is_active: false,
        updated_at: new Date()
      }
    });
    
    return { success: true };
    
  } catch (error) {
    console.error('Error revoking API key:', error);
    throw new Error('Failed to revoke API key');
  }
}

/**
 * Get API usage statistics
 */
export async function getAPIUsageStats(apiKeyId, days = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const usage = await prisma.api_usage_logs.findMany({
      where: {
        api_key_id: apiKeyId,
        created_at: { gte: startDate }
      },
      orderBy: { created_at: 'asc' }
    });
    
    // Group by day
    const dailyUsage = usage.reduce((acc, log) => {
      const day = log.created_at.toISOString().split('T')[0];
      if (!acc[day]) {
        acc[day] = { requests: 0, errors: 0 };
      }
      acc[day].requests++;
      if (log.status_code >= 400) {
        acc[day].errors++;
      }
      return acc;
    }, {});
    
    return {
      totalRequests: usage.length,
      dailyUsage,
      topEndpoints: getTopEndpoints(usage),
      errorRate: usage.filter(u => u.status_code >= 400).length / usage.length
    };
    
  } catch (error) {
    console.error('Error getting API usage stats:', error);
    return { totalRequests: 0, dailyUsage: {}, topEndpoints: [], errorRate: 0 };
  }
}

function getTopEndpoints(usage) {
  const endpoints = {};
  usage.forEach(log => {
    if (!endpoints[log.endpoint]) {
      endpoints[log.endpoint] = 0;
    }
    endpoints[log.endpoint]++;
  });
  
  return Object.entries(endpoints)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([endpoint, count]) => ({ endpoint, count }));
}