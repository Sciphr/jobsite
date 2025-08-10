import { NextResponse } from 'next/server';
import { validateAPIKey, hasAPIPermission, logAPIUsage, checkRateLimit } from '../apiKeyManager.js';

/**
 * API Authentication Middleware
 * Handles API key validation, permission checking, and rate limiting
 */

/**
 * Protect API routes with API key authentication
 * Usage:
 * export async function GET(request) {
 *   return protectAPIRoute(request, 'jobs', 'read', async (apiKeyData) => {
 *     // Your protected API logic here
 *     return NextResponse.json({ data: 'success' });
 *   });
 * }
 */
export async function protectAPIRoute(request, resource, action, handler) {
  const startTime = Date.now();
  let apiKeyData = null;
  
  try {
    // Extract API key from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createErrorResponse(401, 'API key required. Include "Authorization: Bearer sk_live_..." header');
    }
    
    const apiKey = authHeader.replace('Bearer ', '').trim();
    
    // Validate API key
    apiKeyData = await validateAPIKey(apiKey);
    if (!apiKeyData.valid) {
      await logFailedRequest(request, null, 401, apiKeyData.error, Date.now() - startTime);
      return createErrorResponse(401, apiKeyData.error || 'Invalid API key');
    }
    
    // Check rate limit
    const rateLimit = await checkRateLimit(apiKeyData.keyId, apiKeyData.rateLimit);
    if (!rateLimit.allowed) {
      await logFailedRequest(request, apiKeyData.keyId, 429, 'Rate limit exceeded', Date.now() - startTime);
      return createErrorResponse(429, 'Rate limit exceeded', {
        'X-RateLimit-Limit': rateLimit.limit.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': rateLimit.resetTime.toISOString()
      });
    }
    
    // Check permissions
    if (!hasAPIPermission(apiKeyData, resource, action)) {
      await logFailedRequest(request, apiKeyData.keyId, 403, 'Insufficient permissions', Date.now() - startTime);
      return createErrorResponse(403, `Insufficient permissions. Required: ${resource}:${action}`);
    }
    
    // Add rate limit headers to response
    const responseHeaders = {
      'X-RateLimit-Limit': rateLimit.limit.toString(),
      'X-RateLimit-Remaining': (rateLimit.limit - rateLimit.currentUsage - 1).toString(),
      'X-RateLimit-Reset': rateLimit.resetTime.toISOString()
    };
    
    // Call the protected handler
    const response = await handler(apiKeyData);
    
    // Add rate limit headers to successful response
    Object.entries(responseHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    // Log successful API usage
    await logAPIUsage({
      apiKeyId: apiKeyData.keyId,
      endpoint: getEndpointPath(request),
      method: request.method,
      statusCode: response.status,
      responseTimeMs: Date.now() - startTime,
      userAgent: request.headers.get('User-Agent'),
      ipAddress: getClientIP(request),
      requestSize: await getRequestSize(request),
      responseSize: getResponseSize(response)
    });
    
    return response;
    
  } catch (error) {
    console.error('API protection error:', error);
    
    // Log the error
    if (apiKeyData?.keyId) {
      await logFailedRequest(request, apiKeyData.keyId, 500, error.message, Date.now() - startTime);
    }
    
    return createErrorResponse(500, 'Internal server error');
  }
}

/**
 * Simplified API protection for quick use
 * Usage:
 * export async function GET(request) {
 *   const { error, apiKeyData } = await authenticateAPIRequest(request, 'jobs', 'read');
 *   if (error) return error;
 *   
 *   // Your API logic here
 *   return NextResponse.json({ data: 'success' });
 * }
 */
export async function authenticateAPIRequest(request, resource, action) {
  const result = await protectAPIRoute(request, resource, action, (apiKeyData) => {
    return { success: true, apiKeyData };
  });
  
  if (result.success) {
    return { apiKeyData: result.apiKeyData, error: null };
  } else {
    return { apiKeyData: null, error: result };
  }
}

/**
 * Create standardized error responses
 */
function createErrorResponse(status, message, headers = {}) {
  const response = NextResponse.json({
    error: {
      code: status,
      message: message,
      timestamp: new Date().toISOString()
    }
  }, { status });
  
  // Add standard API headers
  response.headers.set('Content-Type', 'application/json');
  response.headers.set('X-API-Version', '1.0');
  
  // Add custom headers
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

/**
 * Create standardized success responses
 */
export function createSuccessResponse(data, status = 200, headers = {}) {
  const response = NextResponse.json({
    data: data,
    timestamp: new Date().toISOString(),
    version: '1.0'
  }, { status });
  
  // Add standard API headers
  response.headers.set('Content-Type', 'application/json');
  response.headers.set('X-API-Version', '1.0');
  
  // Add custom headers
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

/**
 * Log failed API requests
 */
async function logFailedRequest(request, apiKeyId, statusCode, errorMessage, responseTimeMs) {
  try {
    if (apiKeyId) {
      await logAPIUsage({
        apiKeyId,
        endpoint: getEndpointPath(request),
        method: request.method,
        statusCode,
        responseTimeMs,
        userAgent: request.headers.get('User-Agent'),
        ipAddress: getClientIP(request),
        requestSize: await getRequestSize(request),
        responseSize: 0,
        errorMessage
      });
    }
  } catch (error) {
    console.error('Error logging failed request:', error);
  }
}

/**
 * Extract endpoint path from request
 */
function getEndpointPath(request) {
  try {
    const url = new URL(request.url);
    return url.pathname;
  } catch {
    return 'unknown';
  }
}

/**
 * Get client IP address
 */
function getClientIP(request) {
  // Try various headers for IP address
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  return request.headers.get('x-real-ip') || 
         request.headers.get('cf-connecting-ip') || 
         'unknown';
}

/**
 * Estimate request size
 */
async function getRequestSize(request) {
  try {
    const contentLength = request.headers.get('content-length');
    if (contentLength) {
      return parseInt(contentLength, 10);
    }
    
    // For requests without content-length, estimate based on headers and URL
    const url = request.url || '';
    const headers = JSON.stringify(Object.fromEntries(request.headers.entries()));
    return url.length + headers.length;
  } catch {
    return 0;
  }
}

/**
 * Estimate response size
 */
function getResponseSize(response) {
  try {
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      return parseInt(contentLength, 10);
    }
    
    // Estimate based on status and headers
    const headers = JSON.stringify(Object.fromEntries(response.headers.entries()));
    return headers.length + 100; // Base response size estimate
  } catch {
    return 0;
  }
}

/**
 * Validate API request format and content
 */
export function validateAPIRequest(request, schema = {}) {
  const errors = [];
  
  // Check content type for POST/PUT requests
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      errors.push('Content-Type must be application/json');
    }
  }
  
  // Check required headers
  if (schema.requiredHeaders) {
    schema.requiredHeaders.forEach(header => {
      if (!request.headers.get(header)) {
        errors.push(`Missing required header: ${header}`);
      }
    });
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * API versioning middleware
 */
export function handleAPIVersion(request, supportedVersions = ['1.0']) {
  const requestedVersion = request.headers.get('X-API-Version') || '1.0';
  
  if (!supportedVersions.includes(requestedVersion)) {
    return createErrorResponse(400, `Unsupported API version: ${requestedVersion}. Supported versions: ${supportedVersions.join(', ')}`);
  }
  
  return null; // Version is valid
}