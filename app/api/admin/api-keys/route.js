import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route.js';
import { protectRoute } from '../../../lib/middleware/apiProtection.js';
import { createAPIKey, getUserAPIKeys, revokeAPIKey, deleteAPIKey } from '../../../lib/apiKeyManager.js';

/**
 * API Key Management Routes for Admin Interface
 * GET /api/admin/api-keys - List user's API keys
 * POST /api/admin/api-keys - Create new API key
 * DELETE /api/admin/api-keys - Revoke API key
 */

/**
 * GET - List user's API keys
 */
export async function GET() {
  // Protect route - only users with API management permissions
  const authResult = await protectRoute("api", "manage");
  if (authResult.error) return authResult.error;
  
  const { session } = authResult;
  
  try {
    const apiKeys = await getUserAPIKeys(session.user.id);
    
    return NextResponse.json({
      success: true,
      apiKeys: apiKeys
    });
    
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API keys' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create new API key
 */
export async function POST(request) {
  // Protect route - only users with API management permissions
  const authResult = await protectRoute("api", "manage");
  if (authResult.error) return authResult.error;
  
  const { session } = authResult;
  
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'API key name is required' },
        { status: 400 }
      );
    }
    
    if (!body.permissions || !Array.isArray(body.permissions)) {
      return NextResponse.json(
        { error: 'Permissions array is required' },
        { status: 400 }
      );
    }
    
    // Validate permissions format
    const validPermissionPattern = /^[a-zA-Z_]+:(read|write|create|update|delete|manage|\*)$/;
    const invalidPermissions = body.permissions.filter(perm => 
      typeof perm !== 'string' || !validPermissionPattern.test(perm)
    );
    
    if (invalidPermissions.length > 0) {
      return NextResponse.json({
        error: 'Invalid permission format',
        invalidPermissions: invalidPermissions
      }, { status: 400 });
    }
    
    // Check if user already has an API key (limit to 1 per user for now)
    const existingKeys = await getUserAPIKeys(session.user.id);
    const activeKeys = existingKeys.filter(key => key.is_active);
    
    if (activeKeys.length >= 5) { // Limit to 5 active keys per user
      return NextResponse.json(
        { error: 'Maximum number of API keys reached (5)' },
        { status: 400 }
      );
    }
    
    // Create API key
    const newAPIKey = await createAPIKey({
      userId: session.user.id,
      name: body.name,
      permissions: body.permissions,
      rateLimit: body.rateLimit || 1000,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null
    });
    
    return NextResponse.json({
      success: true,
      message: 'API key created successfully',
      apiKey: newAPIKey
    });
    
  } catch (error) {
    console.error('Error creating API key:', error);
    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete or Revoke API key
 */
export async function DELETE(request) {
  // Protect route - only users with API management permissions
  const authResult = await protectRoute("api", "manage");
  if (authResult.error) return authResult.error;
  
  const { session } = authResult;
  
  try {
    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('keyId');
    const action = searchParams.get('action') || 'revoke'; // 'revoke' or 'delete'
    
    if (!keyId) {
      return NextResponse.json(
        { error: 'API key ID is required' },
        { status: 400 }
      );
    }
    
    if (action === 'delete') {
      // Permanently delete the API key
      await deleteAPIKey(keyId, session.user.id);
      
      return NextResponse.json({
        success: true,
        message: 'API key deleted successfully'
      });
    } else {
      // Revoke the API key (set inactive)
      await revokeAPIKey(keyId, session.user.id);
      
      return NextResponse.json({
        success: true,
        message: 'API key revoked successfully'
      });
    }
    
  } catch (error) {
    console.error('Error with API key:', error);
    
    if (error.message === 'API key not found') {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: `Failed to ${action} API key` },
      { status: 500 }
    );
  }
}