import { NextResponse } from 'next/server';
import { protectAPIRoute, createSuccessResponse, validateAPIRequest } from '../../../../lib/middleware/apiAuthentication.js';
import prisma from '../../../../lib/prisma.js';

/**
 * Individual Job API Endpoints
 * GET /api/v1/jobs/[id] - Get specific job
 * PUT /api/v1/jobs/[id] - Update specific job
 * DELETE /api/v1/jobs/[id] - Delete specific job
 */

/**
 * GET /api/v1/jobs/[id] - Get specific job by ID
 */
export async function GET(request, { params }) {
  return protectAPIRoute(request, 'jobs', 'read', async (apiKeyData) => {
    try {
      const jobId = params.id;
      
      if (!jobId) {
        return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
      }
      
      const job = await prisma.jobs.findUnique({
        where: { id: jobId },
        include: {
          categories: {
            select: { name: true, description: true }
          },
          users: {
            select: { firstName: true, lastName: true, email: true }
          },
          _count: {
            select: { 
              applications: true,
              applications: {
                where: {
                  is_archived: false // Only count active applications
                }
              }
            }
          }
        }
      });
      
      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
      
      // Increment view count (for analytics)
      await prisma.jobs.update({
        where: { id: jobId },
        data: { viewCount: { increment: 1 } }
      });
      
      // Format response
      const formattedJob = {
        id: job.id,
        title: job.title,
        slug: job.slug,
        description: job.description,
        summary: job.summary,
        department: job.department,
        employmentType: job.employmentType,
        experienceLevel: job.experienceLevel,
        location: job.location,
        remotePolicy: job.remotePolicy,
        salary: {
          min: job.salaryMin,
          max: job.salaryMax,
          currency: job.salaryCurrency,
          type: job.salaryType,
          showSalary: job.showSalary
        },
        benefits: job.benefits,
        requirements: job.requirements,
        preferredQualifications: job.preferredQualifications,
        educationRequired: job.educationRequired,
        yearsExperienceRequired: job.yearsExperienceRequired,
        applicationInstructions: job.applicationInstructions,
        status: job.status,
        featured: job.featured,
        priority: job.priority,
        viewCount: job.viewCount,
        applicationCount: job._count.applications,
        dates: {
          createdAt: job.createdAt,
          updatedAt: job.updatedAt,
          postedAt: job.postedAt,
          applicationDeadline: job.applicationDeadline,
          startDate: job.startDate,
          autoExpiresAt: job.autoExpiresAt
        },
        category: job.categories ? {
          name: job.categories.name,
          description: job.categories.description
        } : null,
        createdBy: job.users ? {
          name: `${job.users.firstName} ${job.users.lastName}`,
          email: job.users.email
        } : null
      };
      
      return createSuccessResponse(formattedJob);
      
    } catch (error) {
      console.error('Error fetching job via API:', error);
      return NextResponse.json({ error: 'Failed to fetch job' }, { status: 500 });
    }
  });
}

/**
 * PUT /api/v1/jobs/[id] - Update specific job
 */
export async function PUT(request, { params }) {
  return protectAPIRoute(request, 'jobs', 'update', async (apiKeyData) => {
    try {
      const jobId = params.id;
      
      if (!jobId) {
        return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
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
      
      // Check if job exists
      const existingJob = await prisma.jobs.findUnique({
        where: { id: jobId },
        include: {
          categories: true,
          users: { select: { firstName: true, lastName: true, email: true } }
        }
      });
      
      if (!existingJob) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
      
      // Validate category if provided
      if (body.categoryId && body.categoryId !== existingJob.categoryId) {
        const category = await prisma.categories.findUnique({ 
          where: { id: body.categoryId } 
        });
        
        if (!category) {
          return NextResponse.json({
            error: 'Invalid category ID'
          }, { status: 400 });
        }
      }
      
      // Build update data
      const updateData = {
        updatedAt: new Date()
      };
      
      // Only update fields that are provided
      if (body.title !== undefined) {
        updateData.title = body.title;
        
        // Regenerate slug if title changed
        if (body.title !== existingJob.title) {
          const slug = body.title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
          
          // Check if new slug already exists
          const slugExists = await prisma.jobs.findFirst({
            where: { 
              slug: slug,
              id: { not: jobId }
            }
          });
          
          updateData.slug = slugExists ? `${slug}-${Date.now()}` : slug;
        }
      }
      
      if (body.description !== undefined) updateData.description = body.description;
      if (body.summary !== undefined) updateData.summary = body.summary;
      if (body.department !== undefined) updateData.department = body.department;
      if (body.employmentType !== undefined) updateData.employmentType = body.employmentType;
      if (body.experienceLevel !== undefined) updateData.experienceLevel = body.experienceLevel;
      if (body.location !== undefined) updateData.location = body.location;
      if (body.remotePolicy !== undefined) updateData.remotePolicy = body.remotePolicy;
      if (body.benefits !== undefined) updateData.benefits = body.benefits;
      if (body.requirements !== undefined) updateData.requirements = body.requirements;
      if (body.preferredQualifications !== undefined) updateData.preferredQualifications = body.preferredQualifications;
      if (body.educationRequired !== undefined) updateData.educationRequired = body.educationRequired;
      if (body.yearsExperienceRequired !== undefined) updateData.yearsExperienceRequired = body.yearsExperienceRequired;
      if (body.applicationInstructions !== undefined) updateData.applicationInstructions = body.applicationInstructions;
      if (body.featured !== undefined) updateData.featured = body.featured;
      if (body.priority !== undefined) updateData.priority = body.priority;
      if (body.categoryId !== undefined) updateData.categoryId = body.categoryId;
      
      // Handle salary updates
      if (body.salary) {
        if (body.salary.min !== undefined) updateData.salaryMin = body.salary.min;
        if (body.salary.max !== undefined) updateData.salaryMax = body.salary.max;
        if (body.salary.currency !== undefined) updateData.salaryCurrency = body.salary.currency;
        if (body.salary.type !== undefined) updateData.salaryType = body.salary.type;
        if (body.salary.showSalary !== undefined) updateData.showSalary = body.salary.showSalary;
      }
      
      // Handle date updates
      if (body.applicationDeadline !== undefined) {
        updateData.applicationDeadline = body.applicationDeadline ? new Date(body.applicationDeadline) : null;
      }
      if (body.startDate !== undefined) {
        updateData.startDate = body.startDate ? new Date(body.startDate) : null;
      }
      
      // Handle status changes
      if (body.status !== undefined) {
        updateData.status = body.status;
        
        // Set postedAt when publishing
        if (body.status === 'Published' && existingJob.status !== 'Published') {
          updateData.postedAt = new Date();
        }
        
        // Clear postedAt when unpublishing
        if (body.status !== 'Published' && existingJob.status === 'Published') {
          updateData.postedAt = null;
        }
      }
      
      // Update the job
      const updatedJob = await prisma.jobs.update({
        where: { id: jobId },
        data: updateData,
        include: {
          categories: {
            select: { name: true, description: true }
          },
          users: {
            select: { firstName: true, lastName: true, email: true }
          },
          _count: {
            select: { applications: true }
          }
        }
      });
      
      // Format response
      const formattedJob = {
        id: updatedJob.id,
        title: updatedJob.title,
        slug: updatedJob.slug,
        description: updatedJob.description,
        summary: updatedJob.summary,
        department: updatedJob.department,
        employmentType: updatedJob.employmentType,
        experienceLevel: updatedJob.experienceLevel,
        location: updatedJob.location,
        remotePolicy: updatedJob.remotePolicy,
        salary: {
          min: updatedJob.salaryMin,
          max: updatedJob.salaryMax,
          currency: updatedJob.salaryCurrency,
          type: updatedJob.salaryType,
          showSalary: updatedJob.showSalary
        },
        benefits: updatedJob.benefits,
        requirements: updatedJob.requirements,
        preferredQualifications: updatedJob.preferredQualifications,
        educationRequired: updatedJob.educationRequired,
        yearsExperienceRequired: updatedJob.yearsExperienceRequired,
        applicationInstructions: updatedJob.applicationInstructions,
        status: updatedJob.status,
        featured: updatedJob.featured,
        priority: updatedJob.priority,
        viewCount: updatedJob.viewCount,
        applicationCount: updatedJob._count.applications,
        dates: {
          createdAt: updatedJob.createdAt,
          updatedAt: updatedJob.updatedAt,
          postedAt: updatedJob.postedAt,
          applicationDeadline: updatedJob.applicationDeadline,
          startDate: updatedJob.startDate
        },
        category: updatedJob.categories ? {
          name: updatedJob.categories.name,
          description: updatedJob.categories.description
        } : null,
        createdBy: updatedJob.users ? {
          name: `${updatedJob.users.firstName} ${updatedJob.users.lastName}`,
          email: updatedJob.users.email
        } : null
      };
      
      return createSuccessResponse(formattedJob);
      
    } catch (error) {
      console.error('Error updating job via API:', error);
      
      if (error.code === 'P2002') { // Prisma unique constraint error
        return NextResponse.json({ 
          error: 'Job with this title already exists' 
        }, { status: 409 });
      }
      
      return NextResponse.json({ error: 'Failed to update job' }, { status: 500 });
    }
  });
}

/**
 * DELETE /api/v1/jobs/[id] - Delete specific job
 */
export async function DELETE(request, { params }) {
  return protectAPIRoute(request, 'jobs', 'delete', async (apiKeyData) => {
    try {
      const jobId = params.id;
      
      if (!jobId) {
        return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
      }
      
      // Check if job exists
      const existingJob = await prisma.jobs.findUnique({
        where: { id: jobId },
        include: {
          _count: {
            select: { applications: true }
          }
        }
      });
      
      if (!existingJob) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
      
      // Check if job has applications
      if (existingJob._count.applications > 0) {
        return NextResponse.json({
          error: 'Cannot delete job with existing applications',
          details: `This job has ${existingJob._count.applications} application(s). Archive the job instead of deleting it.`
        }, { status: 409 });
      }
      
      // Delete the job
      await prisma.jobs.delete({
        where: { id: jobId }
      });
      
      return createSuccessResponse({
        message: 'Job deleted successfully',
        deletedJob: {
          id: existingJob.id,
          title: existingJob.title,
          deletedAt: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('Error deleting job via API:', error);
      return NextResponse.json({ error: 'Failed to delete job' }, { status: 500 });
    }
  });
}