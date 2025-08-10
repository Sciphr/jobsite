import { NextResponse } from 'next/server';
import { protectRoute } from '../../../../../lib/middleware/apiProtection.js';
import { getAPIUsageStats } from '../../../../../lib/apiKeyManager.js';
import prisma from '../../../../../lib/prisma.js';

/**
 * API Key Usage Statistics
 * GET /api/admin/api-keys/[keyId]/usage - Get usage statistics for specific API key
 */

export async function GET(request, { params }) {
  // Protect route - only users with API management permissions
  const authResult = await protectRoute("api", "manage");
  if (authResult.error) return authResult.error;
  
  const { session } = authResult;
  
  try {
    const keyId = params.keyId;
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    
    if (!keyId) {
      return NextResponse.json(
        { error: 'API key ID is required' },
        { status: 400 }
      );
    }
    
    // Verify user owns this API key
    const apiKey = await prisma.api_keys.findFirst({
      where: {
        id: keyId,
        user_id: session.user.id
      },
      select: {
        id: true,
        name: true,
        key_prefix: true,
        rate_limit: true,
        requests_this_month: true,
        total_requests: true,
        last_used_at: true,
        created_at: true
      }
    });
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }
    
    // Get usage statistics
    const usageStats = await getAPIUsageStats(keyId, days);
    
    // Get recent activity (last 50 requests)
    const recentActivity = await prisma.api_usage_logs.findMany({
      where: { api_key_id: keyId },
      orderBy: { created_at: 'desc' },
      take: 50,
      select: {
        endpoint: true,
        method: true,
        status_code: true,
        response_time_ms: true,
        created_at: true,
        error_message: true
      }
    });
    
    // Calculate this hour's usage for rate limiting info
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    
    const currentHourUsage = await prisma.api_usage_logs.count({
      where: {
        api_key_id: keyId,
        created_at: { gte: oneHourAgo }
      }
    });
    
    return NextResponse.json({
      success: true,
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        keyPrefix: apiKey.key_prefix,
        createdAt: apiKey.created_at,
        lastUsedAt: apiKey.last_used_at
      },
      usage: {
        totalRequests: apiKey.total_requests,
        requestsThisMonth: apiKey.requests_this_month,
        currentHourUsage: currentHourUsage,
        rateLimit: apiKey.rate_limit,
        rateLimitRemaining: Math.max(0, apiKey.rate_limit - currentHourUsage),
        statistics: usageStats,
        recentActivity: recentActivity.map(activity => ({
          endpoint: activity.endpoint,
          method: activity.method,
          statusCode: activity.status_code,
          responseTime: activity.response_time_ms,
          timestamp: activity.created_at,
          error: activity.error_message
        }))
      }
    });
    
  } catch (error) {
    console.error('Error fetching API key usage:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API key usage' },
      { status: 500 }
    );
  }
}