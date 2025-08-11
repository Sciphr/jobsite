import { NextResponse } from 'next/server';
import { protectAPIRoute, createSuccessResponse, validateAPIRequest } from '../../../../lib/middleware/apiAuthentication.js';
import prisma from '../../../../lib/prisma.js';

/**
 * Individual Application API Endpoints
 * GET /api/v1/applications/[id] - Get specific application
 * PUT /api/v1/applications/[id] - Update specific application
 * DELETE /api/v1/applications/[id] - Delete specific application
 */

/**
 * GET /api/v1/applications/[id] - Get specific application by ID
 */
export async function GET(request, { params }) {
  return protectAPIRoute(request, 'applications', 'read', async (apiKeyData) => {
    try {
      const { id: applicationId } = await params;
      
      if (!applicationId) {
        return NextResponse.json({ error: 'Application ID is required' }, { status: 400 });
      }
      
      const application = await prisma.applications.findUnique({
        where: { id: applicationId },
        include: {
          jobs: {
            select: {
              id: true,
              title: true,
              slug: true,
              department: true,
              location: true,
              status: true,
              employmentType: true,
              remotePolicy: true
            }
          },
          users: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true
            }
          }
        }
      });
      
      if (!application) {
        return NextResponse.json({ error: 'Application not found' }, { status: 404 });
      }
      
      // Format response
      const formattedApplication = {
        id: application.id,
        status: application.status,
        stage: application.stage,
        candidate: {
          id: application.userId,
          name: application.name || (application.users ? `${application.users.firstName} ${application.users.lastName}`.trim() : null),
          email: application.email || application.users?.email,
          phone: application.phone || application.users?.phone
        },
        job: application.jobs ? {
          id: application.jobs.id,
          title: application.jobs.title,
          slug: application.jobs.slug,
          department: application.jobs.department,
          location: application.jobs.location,
          status: application.jobs.status,
          employmentType: application.jobs.employmentType,
          remotePolicy: application.jobs.remotePolicy
        } : null,
        application: {
          coverLetter: application.coverLetter,
          resumeUrl: application.resumeUrl,
          notes: application.notes,
          appliedAt: application.appliedAt,
          updatedAt: application.updatedAt
        },
        tracking: {
          currentStageEnteredAt: application.current_stage_entered_at,
          timeInCurrentStageSeconds: application.time_in_current_stage_seconds,
          totalApplicationTimeSeconds: application.total_application_time_seconds
        },
        archived: {
          isArchived: application.is_archived,
          archivedAt: application.archived_at,
          archiveReason: application.archive_reason
        }
      };
      
      return createSuccessResponse(formattedApplication);
      
    } catch (error) {
      console.error('Error fetching application via API:', error);
      return NextResponse.json({ error: 'Failed to fetch application' }, { status: 500 });
    }
  });
}

/**
 * PUT /api/v1/applications/[id] - Update specific application
 */
export async function PUT(request, { params }) {
  return protectAPIRoute(request, 'applications', 'update', async (apiKeyData) => {
    try {
      const { id: applicationId } = await params;
      
      if (!applicationId) {
        return NextResponse.json({ error: 'Application ID is required' }, { status: 400 });
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
      
      // Check if application exists
      const existingApplication = await prisma.applications.findUnique({
        where: { id: applicationId },
        include: {
          jobs: { select: { id: true, title: true } },
          users: { select: { firstName: true, lastName: true, email: true } }
        }
      });
      
      if (!existingApplication) {
        return NextResponse.json({ error: 'Application not found' }, { status: 404 });
      }
      
      // Build update data
      const updateData = {
        updatedAt: new Date()
      };
      
      // Only update fields that are provided
      if (body.status !== undefined) {
        const validStatuses = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected', 'Withdrawn'];
        if (!validStatuses.includes(body.status)) {
          return NextResponse.json({
            error: 'Invalid status',
            validStatuses
          }, { status: 400 });
        }
        updateData.status = body.status;
      }
      
      if (body.stage !== undefined) {
        const validStages = ['Applied', 'Reviewing', 'Phone Screen', 'Technical Interview', 'Final Interview', 'Offer Extended', 'Hired', 'Rejected'];
        if (!validStages.includes(body.stage)) {
          return NextResponse.json({
            error: 'Invalid stage',
            validStages
          }, { status: 400 });
        }
        updateData.stage = body.stage;
        
        // Update stage tracking if stage changed
        if (body.stage !== existingApplication.stage) {
          updateData.current_stage_entered_at = new Date();
          updateData.time_in_current_stage_seconds = 0;
        }
      }
      
      if (body.notes !== undefined) updateData.notes = body.notes;
      if (body.coverLetter !== undefined) updateData.coverLetter = body.coverLetter;
      if (body.resumeUrl !== undefined) updateData.resumeUrl = body.resumeUrl;
      
      // Handle candidate information updates
      if (body.candidate) {
        if (body.candidate.name !== undefined) updateData.name = body.candidate.name;
        if (body.candidate.email !== undefined) updateData.email = body.candidate.email;
        if (body.candidate.phone !== undefined) updateData.phone = body.candidate.phone;
      }
      
      // Handle archiving
      if (body.archived !== undefined) {
        if (body.archived.isArchived !== undefined) {
          updateData.is_archived = body.archived.isArchived;
          
          if (body.archived.isArchived) {
            updateData.archived_at = new Date();
            updateData.archive_reason = body.archived.reason || 'Archived via API';
          } else {
            updateData.archived_at = null;
            updateData.archive_reason = null;
          }
        }
      }
      
      // Update the application
      const updatedApplication = await prisma.applications.update({
        where: { id: applicationId },
        data: updateData,
        include: {
          jobs: {
            select: {
              id: true,
              title: true,
              slug: true,
              department: true,
              location: true,
              status: true,
              employmentType: true,
              remotePolicy: true
            }
          },
          users: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true
            }
          }
        }
      });
      
      // Format response
      const formattedApplication = {
        id: updatedApplication.id,
        status: updatedApplication.status,
        stage: updatedApplication.stage,
        candidate: {
          id: updatedApplication.userId,
          name: updatedApplication.name || (updatedApplication.users ? `${updatedApplication.users.firstName} ${updatedApplication.users.lastName}`.trim() : null),
          email: updatedApplication.email || updatedApplication.users?.email,
          phone: updatedApplication.phone || updatedApplication.users?.phone
        },
        job: updatedApplication.jobs ? {
          id: updatedApplication.jobs.id,
          title: updatedApplication.jobs.title,
          slug: updatedApplication.jobs.slug,
          department: updatedApplication.jobs.department,
          location: updatedApplication.jobs.location,
          status: updatedApplication.jobs.status,
          employmentType: updatedApplication.jobs.employmentType,
          remotePolicy: updatedApplication.jobs.remotePolicy
        } : null,
        application: {
          coverLetter: updatedApplication.coverLetter,
          resumeUrl: updatedApplication.resumeUrl,
          notes: updatedApplication.notes,
          appliedAt: updatedApplication.appliedAt,
          updatedAt: updatedApplication.updatedAt
        },
        tracking: {
          currentStageEnteredAt: updatedApplication.current_stage_entered_at,
          timeInCurrentStageSeconds: updatedApplication.time_in_current_stage_seconds,
          totalApplicationTimeSeconds: updatedApplication.total_application_time_seconds
        },
        archived: {
          isArchived: updatedApplication.is_archived,
          archivedAt: updatedApplication.archived_at,
          archiveReason: updatedApplication.archive_reason
        }
      };
      
      return createSuccessResponse(formattedApplication);
      
    } catch (error) {
      console.error('Error updating application via API:', error);
      return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
    }
  });
}

/**
 * DELETE /api/v1/applications/[id] - Delete specific application
 */
export async function DELETE(request, { params }) {
  return protectAPIRoute(request, 'applications', 'delete', async (apiKeyData) => {
    try {
      const { id: applicationId } = await params;
      
      if (!applicationId) {
        return NextResponse.json({ error: 'Application ID is required' }, { status: 400 });
      }
      
      // Check if application exists
      const existingApplication = await prisma.applications.findUnique({
        where: { id: applicationId },
        include: {
          jobs: { select: { id: true, title: true } }
        }
      });
      
      if (!existingApplication) {
        return NextResponse.json({ error: 'Application not found' }, { status: 404 });
      }
      
      // Delete the application
      await prisma.applications.delete({
        where: { id: applicationId }
      });
      
      // Decrement job application count
      if (existingApplication.jobId) {
        await prisma.jobs.update({
          where: { id: existingApplication.jobId },
          data: { applicationCount: { decrement: 1 } }
        });
      }
      
      return createSuccessResponse({
        message: 'Application deleted successfully',
        deletedApplication: {
          id: existingApplication.id,
          candidateName: existingApplication.name,
          jobTitle: existingApplication.jobs?.title,
          deletedAt: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('Error deleting application via API:', error);
      return NextResponse.json({ error: 'Failed to delete application' }, { status: 500 });
    }
  });
}