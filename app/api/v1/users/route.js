import { NextResponse } from 'next/server';
import { protectAPIRoute, createSuccessResponse, validateAPIRequest } from '../../../lib/middleware/apiAuthentication.js';
import prisma from '../../../lib/prisma.js';

/**
 * Users API Endpoints
 * GET /api/v1/users - List users with filtering
 * POST /api/v1/users - Create new user
 */

/**
 * GET /api/v1/users - List users
 * Query parameters:
 * - limit: number of users to return (default: 20, max: 100)
 * - offset: number of users to skip (default: 0)
 * - active: true/false to filter by active status
 * - privilege_level: filter by privilege level (0-3)
 * - search: search in name, email
 * - role: filter by role name
 * - created_from: filter users created from date (ISO string)
 * - created_to: filter users created to date (ISO string)
 */
export async function GET(request) {
  return protectAPIRoute(request, 'users', 'read', async (apiKeyData) => {
    try {
      const { searchParams } = new URL(request.url);
      
      // Parse query parameters
      const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
      const offset = parseInt(searchParams.get('offset') || '0');
      const active = searchParams.get('active');
      const privilegeLevel = searchParams.get('privilege_level');
      const search = searchParams.get('search');
      const role = searchParams.get('role');
      const createdFrom = searchParams.get('created_from');
      const createdTo = searchParams.get('created_to');
      
      // Build where clause
      const where = {};
      
      if (active !== null && active !== undefined) {
        where.isActive = active === 'true';
      }
      
      if (privilegeLevel !== null && privilegeLevel !== undefined) {
        where.privilegeLevel = parseInt(privilegeLevel);
      }
      
      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ];
      }
      
      // Role filtering
      if (role) {
        where.user_roles = {
          some: {
            roles: {
              name: { contains: role, mode: 'insensitive' }
            }
          }
        };
      }
      
      // Date filtering
      if (createdFrom || createdTo) {
        where.createdAt = {};
        if (createdFrom) where.createdAt.gte = new Date(createdFrom);
        if (createdTo) where.createdAt.lte = new Date(createdTo);
      }
      
      // Fetch users with pagination
      const [users, totalCount] = await Promise.all([
        prisma.users.findMany({
          where,
          include: {
            user_roles: {
              include: {
                roles: {
                  select: { id: true, name: true, description: true, color: true }
                }
              }
            },
            _count: {
              select: { 
                applications: true,
                jobs: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset
        }),
        prisma.users.count({ where })
      ]);
      
      // Format response
      const formattedUsers = users.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || null,
        phone: user.phone,
        isActive: user.isActive,
        privilegeLevel: user.privilegeLevel,
        emailVerified: user.emailVerified,
        avatar: user.avatar,
        bio: user.bio,
        location: user.location,
        website: user.website,
        linkedin: user.linkedin,
        github: user.github,
        roles: user.user_roles?.map(ur => ({
          id: ur.roles.id,
          name: ur.roles.name,
          description: ur.roles.description,
          color: ur.roles.color,
          assignedAt: ur.created_at
        })) || [],
        stats: {
          applicationCount: user._count.applications,
          createdJobsCount: user._count.jobs
        },
        dates: {
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          lastLoginAt: user.lastLoginAt,
          emailVerifiedAt: user.emailVerifiedAt
        }
      }));
      
      return createSuccessResponse({
        users: formattedUsers,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount
        }
      });
      
    } catch (error) {
      console.error('Error fetching users via API:', error);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
  });
}

/**
 * POST /api/v1/users - Create a new user
 * Required permissions: users:create
 */
export async function POST(request) {
  return protectAPIRoute(request, 'users', 'create', async (apiKeyData) => {
    try {
      // Validate request format
      const validation = validateAPIRequest(request, {
        requiredHeaders: ['content-type']
      });
      
      if (!validation.valid) {
        return NextResponse.json({ 
          error: 'Invalid request format', 
          details: validation.errors 
        }, { status: 400 });
      }
      
      const body = await request.json();
      
      // Validate required fields
      const requiredFields = ['email', 'firstName'];
      const missingFields = requiredFields.filter(field => !body[field]);
      
      if (missingFields.length > 0) {
        return NextResponse.json({
          error: 'Missing required fields',
          missingFields
        }, { status: 400 });
      }
      
      // Validate email format
      if (!/\S+@\S+\.\S+/.test(body.email)) {
        return NextResponse.json({
          error: 'Invalid email format'
        }, { status: 400 });
      }
      
      // Check if user already exists
      const existingUser = await prisma.users.findUnique({
        where: { email: body.email }
      });
      
      if (existingUser) {
        return NextResponse.json({
          error: 'User with this email already exists'
        }, { status: 409 });
      }
      
      // Validate privilege level
      const privilegeLevel = body.privilegeLevel || 0;
      if (privilegeLevel < 0 || privilegeLevel > 3) {
        return NextResponse.json({
          error: 'Invalid privilege level. Must be between 0 and 3'
        }, { status: 400 });
      }
      
      // Create the user
      const newUser = await prisma.users.create({
        data: {
          email: body.email,
          firstName: body.firstName,
          lastName: body.lastName || null,
          phone: body.phone || null,
          isActive: body.isActive ?? true,
          privilegeLevel: privilegeLevel,
          bio: body.bio || null,
          location: body.location || null,
          website: body.website || null,
          linkedin: body.linkedin || null,
          github: body.github || null,
          emailVerified: body.emailVerified ?? false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      // Assign roles if provided
      if (body.roles && Array.isArray(body.roles)) {
        const roleAssignments = [];
        
        for (const roleId of body.roles) {
          // Verify role exists
          const roleExists = await prisma.roles.findUnique({
            where: { id: roleId }
          });
          
          if (roleExists) {
            roleAssignments.push({
              user_id: newUser.id,
              role_id: roleId,
              created_at: new Date()
            });
          }
        }
        
        if (roleAssignments.length > 0) {
          await prisma.user_roles.createMany({
            data: roleAssignments
          });
        }
      }
      
      // Fetch the created user with roles
      const userWithRoles = await prisma.users.findUnique({
        where: { id: newUser.id },
        include: {
          user_roles: {
            include: {
              roles: {
                select: { id: true, name: true, description: true, color: true }
              }
            }
          },
          _count: {
            select: { 
              applications: true,
              jobs: true
            }
          }
        }
      });
      
      // Format response
      const formattedUser = {
        id: userWithRoles.id,
        email: userWithRoles.email,
        firstName: userWithRoles.firstName,
        lastName: userWithRoles.lastName,
        fullName: `${userWithRoles.firstName || ''} ${userWithRoles.lastName || ''}`.trim() || null,
        phone: userWithRoles.phone,
        isActive: userWithRoles.isActive,
        privilegeLevel: userWithRoles.privilegeLevel,
        emailVerified: userWithRoles.emailVerified,
        bio: userWithRoles.bio,
        location: userWithRoles.location,
        website: userWithRoles.website,
        linkedin: userWithRoles.linkedin,
        github: userWithRoles.github,
        roles: userWithRoles.user_roles?.map(ur => ({
          id: ur.roles.id,
          name: ur.roles.name,
          description: ur.roles.description,
          color: ur.roles.color,
          assignedAt: ur.created_at
        })) || [],
        stats: {
          applicationCount: userWithRoles._count.applications,
          createdJobsCount: userWithRoles._count.jobs
        },
        dates: {
          createdAt: userWithRoles.createdAt,
          updatedAt: userWithRoles.updatedAt,
          lastLoginAt: userWithRoles.lastLoginAt,
          emailVerifiedAt: userWithRoles.emailVerifiedAt
        }
      };
      
      return createSuccessResponse(formattedUser, 201);
      
    } catch (error) {
      console.error('Error creating user via API:', error);
      
      if (error.code === 'P2002') { // Prisma unique constraint error
        return NextResponse.json({ 
          error: 'User with this email already exists' 
        }, { status: 409 });
      }
      
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
  });
}