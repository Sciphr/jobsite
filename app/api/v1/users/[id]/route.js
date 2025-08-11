import { NextResponse } from 'next/server';
import { protectAPIRoute, createSuccessResponse, validateAPIRequest } from '../../../../lib/middleware/apiAuthentication.js';
import prisma from '../../../../lib/prisma.js';

/**
 * Individual User API Endpoints
 * GET /api/v1/users/[id] - Get specific user
 * PUT /api/v1/users/[id] - Update specific user
 * DELETE /api/v1/users/[id] - Delete specific user
 */

/**
 * GET /api/v1/users/[id] - Get specific user by ID
 */
export async function GET(request, { params }) {
  return protectAPIRoute(request, 'users', 'read', async (apiKeyData) => {
    try {
      const { id: userId } = await params;
      
      if (!userId) {
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
      }
      
      const user = await prisma.users.findUnique({
        where: { id: userId },
        include: {
          user_roles: {
            include: {
              roles: {
                select: { id: true, name: true, description: true, color: true }
              }
            }
          },
          applications: {
            select: {
              id: true,
              status: true,
              stage: true,
              appliedAt: true,
              jobs: {
                select: { id: true, title: true, department: true }
              }
            },
            orderBy: { appliedAt: 'desc' },
            take: 10 // Latest 10 applications
          },
          jobs: {
            select: {
              id: true,
              title: true,
              status: true,
              createdAt: true,
              _count: { select: { applications: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 10 // Latest 10 created jobs
          },
          _count: {
            select: { 
              applications: true,
              jobs: true
            }
          }
        }
      });
      
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      
      // Format response
      const formattedUser = {
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
        recentApplications: user.applications?.map(app => ({
          id: app.id,
          status: app.status,
          stage: app.stage,
          appliedAt: app.appliedAt,
          job: {
            id: app.jobs.id,
            title: app.jobs.title,
            department: app.jobs.department
          }
        })) || [],
        recentCreatedJobs: user.jobs?.map(job => ({
          id: job.id,
          title: job.title,
          status: job.status,
          createdAt: job.createdAt,
          applicationCount: job._count.applications
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
      };
      
      return createSuccessResponse(formattedUser);
      
    } catch (error) {
      console.error('Error fetching user via API:', error);
      return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
    }
  });
}

/**
 * PUT /api/v1/users/[id] - Update specific user
 */
export async function PUT(request, { params }) {
  return protectAPIRoute(request, 'users', 'update', async (apiKeyData) => {
    try {
      const { id: userId } = await params;
      
      if (!userId) {
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
      }
      
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
      
      // Check if user exists
      const existingUser = await prisma.users.findUnique({
        where: { id: userId },
        include: {
          user_roles: { include: { roles: true } }
        }
      });
      
      if (!existingUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      
      // Validate email if provided
      if (body.email && body.email !== existingUser.email) {
        if (!/\S+@\S+\.\S+/.test(body.email)) {
          return NextResponse.json({
            error: 'Invalid email format'
          }, { status: 400 });
        }
        
        // Check if email is already taken
        const emailExists = await prisma.users.findFirst({
          where: { 
            email: body.email,
            id: { not: userId }
          }
        });
        
        if (emailExists) {
          return NextResponse.json({
            error: 'Email is already taken'
          }, { status: 409 });
        }
      }
      
      // Validate privilege level if provided
      if (body.privilegeLevel !== undefined) {
        if (body.privilegeLevel < 0 || body.privilegeLevel > 3) {
          return NextResponse.json({
            error: 'Invalid privilege level. Must be between 0 and 3'
          }, { status: 400 });
        }
      }
      
      // Build update data
      const updateData = {
        updatedAt: new Date()
      };
      
      // Only update fields that are provided
      if (body.email !== undefined) updateData.email = body.email;
      if (body.firstName !== undefined) updateData.firstName = body.firstName;
      if (body.lastName !== undefined) updateData.lastName = body.lastName;
      if (body.phone !== undefined) updateData.phone = body.phone;
      if (body.isActive !== undefined) updateData.isActive = body.isActive;
      if (body.privilegeLevel !== undefined) updateData.privilegeLevel = body.privilegeLevel;
      if (body.bio !== undefined) updateData.bio = body.bio;
      if (body.location !== undefined) updateData.location = body.location;
      if (body.website !== undefined) updateData.website = body.website;
      if (body.linkedin !== undefined) updateData.linkedin = body.linkedin;
      if (body.github !== undefined) updateData.github = body.github;
      if (body.emailVerified !== undefined) updateData.emailVerified = body.emailVerified;
      
      // Update the user
      const updatedUser = await prisma.users.update({
        where: { id: userId },
        data: updateData
      });
      
      // Handle role updates if provided
      if (body.roles && Array.isArray(body.roles)) {
        // Remove all existing roles
        await prisma.user_roles.deleteMany({
          where: { user_id: userId }
        });
        
        // Add new roles
        const roleAssignments = [];
        
        for (const roleId of body.roles) {
          // Verify role exists
          const roleExists = await prisma.roles.findUnique({
            where: { id: roleId }
          });
          
          if (roleExists) {
            roleAssignments.push({
              user_id: userId,
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
      
      // Fetch the updated user with roles
      const userWithRoles = await prisma.users.findUnique({
        where: { id: userId },
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
      
      return createSuccessResponse(formattedUser);
      
    } catch (error) {
      console.error('Error updating user via API:', error);
      
      if (error.code === 'P2002') { // Prisma unique constraint error
        return NextResponse.json({ 
          error: 'Email is already taken' 
        }, { status: 409 });
      }
      
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
  });
}

/**
 * DELETE /api/v1/users/[id] - Delete specific user
 */
export async function DELETE(request, { params }) {
  return protectAPIRoute(request, 'users', 'delete', async (apiKeyData) => {
    try {
      const { id: userId } = await params;
      
      if (!userId) {
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
      }
      
      // Check if user exists
      const existingUser = await prisma.users.findUnique({
        where: { id: userId },
        include: {
          _count: {
            select: { 
              applications: true,
              jobs: true
            }
          }
        }
      });
      
      if (!existingUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      
      // Check if user has critical data that prevents deletion
      if (existingUser._count.jobs > 0) {
        return NextResponse.json({
          error: 'Cannot delete user with created jobs',
          details: `This user has created ${existingUser._count.jobs} job(s). Transfer job ownership before deleting the user.`
        }, { status: 409 });
      }
      
      // For users with applications, you might want to archive them instead
      if (existingUser._count.applications > 0) {
        return NextResponse.json({
          error: 'Cannot delete user with job applications',
          details: `This user has ${existingUser._count.applications} application(s). Consider deactivating the user instead of deleting.`,
          suggestion: 'Use PUT /api/v1/users/{id} with {"isActive": false} to deactivate instead.'
        }, { status: 409 });
      }
      
      // Delete user roles first
      await prisma.user_roles.deleteMany({
        where: { user_id: userId }
      });
      
      // Delete the user
      await prisma.users.delete({
        where: { id: userId }
      });
      
      return createSuccessResponse({
        message: 'User deleted successfully',
        deletedUser: {
          id: existingUser.id,
          email: existingUser.email,
          fullName: `${existingUser.firstName || ''} ${existingUser.lastName || ''}`.trim() || null,
          deletedAt: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('Error deleting user via API:', error);
      return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
  });
}