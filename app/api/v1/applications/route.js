import { NextResponse } from 'next/server';
import { protectAPIRoute, createSuccessResponse, validateAPIRequest } from '../../../lib/middleware/apiAuthentication.js';
import prisma from '../../../lib/prisma.js';

/**
 * Applications API Endpoints
 * GET /api/v1/applications - List applications with filtering
 * POST /api/v1/applications - Create new application (submit application)
 */

/**
 * GET /api/v1/applications - List applications
 * Query parameters:
 * - limit: number of applications to return (default: 20, max: 100)
 * - offset: number of applications to skip (default: 0)
 * - status: filter by status (Applied, Screening, Interview, Hired, Rejected)
 * - job_id: filter by specific job ID
 * - search: search in candidate name, email
 * - include_archived: true/false to include archived applications
 * - date_from: filter applications from date (ISO string)
 * - date_to: filter applications to date (ISO string)
 */
export async function GET(request) {
  return protectAPIRoute(request, 'applications', 'read', async (apiKeyData) => {
    try {
      const { searchParams } = new URL(request.url);
      
      // Parse query parameters
      const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
      const offset = parseInt(searchParams.get('offset') || '0');
      const status = searchParams.get('status');
      const jobId = searchParams.get('job_id');
      const search = searchParams.get('search');
      const includeArchived = searchParams.get('include_archived') === 'true';
      const dateFrom = searchParams.get('date_from');
      const dateTo = searchParams.get('date_to');
      
      // Build where clause
      const where = {};
      
      if (!includeArchived) {
        where.is_archived = false;
      }
      
      if (status) {
        where.status = status;
      }
      
      if (jobId) {
        where.jobId = jobId;
      }
      
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ];
      }
      
      // Date filtering
      if (dateFrom || dateTo) {
        where.appliedAt = {};
        if (dateFrom) where.appliedAt.gte = new Date(dateFrom);
        if (dateTo) where.appliedAt.lte = new Date(dateTo);
      }
      
      // Fetch applications with pagination
      const [applications, totalCount] = await Promise.all([
        prisma.applications.findMany({
          where,
          include: {
            jobs: {
              select: {
                id: true,
                title: true,
                slug: true,
                department: true,
                location: true,
                status: true
              }
            },
            users: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { appliedAt: 'desc' },
          take: limit,
          skip: offset
        }),
        prisma.applications.count({ where })
      ]);
      
      // Format response
      const formattedApplications = applications.map(app => ({
        id: app.id,
        status: app.status,
        candidate: {
          id: app.userId,
          name: app.name || (app.users ? `${app.users.firstName} ${app.users.lastName}` : 'Unknown'),
          email: app.email || app.users?.email,
          phone: app.phone
        },
        job: {
          id: app.jobs.id,
          title: app.jobs.title,
          slug: app.jobs.slug,
          department: app.jobs.department,
          location: app.jobs.location,
          status: app.jobs.status
        },
        application: {
          coverLetter: app.coverLetter,
          resumeUrl: app.resumeUrl,
          notes: app.notes,
          appliedAt: app.appliedAt,
          updatedAt: app.updatedAt
        },
        tracking: {
          currentStageEnteredAt: app.current_stage_entered_at,
          timeInCurrentStageSeconds: app.time_in_current_stage_seconds,
          totalApplicationTimeSeconds: app.total_application_time_seconds
        },
        archived: {
          isArchived: app.is_archived,
          archivedAt: app.archived_at,
          archiveReason: app.archive_reason
        }
      }));
      
      return createSuccessResponse({
        applications: formattedApplications,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount
        }
      });
      
    } catch (error) {
      console.error('Error fetching applications via API:', error);
      return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
    }
  });
}

/**
 * POST /api/v1/applications - Submit a new job application
 * Required permissions: applications:create
 */
export async function POST(request) {
  return protectAPIRoute(request, 'applications', 'create', async (apiKeyData) => {
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
      const requiredFields = ['jobId', 'candidate'];
      const missingFields = requiredFields.filter(field => !body[field]);
      
      if (missingFields.length > 0) {
        return NextResponse.json({
          error: 'Missing required fields',
          missingFields
        }, { status: 400 });
      }
      
      // Validate candidate data
      if (!body.candidate.name && !body.candidate.email) {
        return NextResponse.json({
          error: 'Candidate name or email is required'
        }, { status: 400 });
      }
      
      if (body.candidate.email && !/\S+@\S+\.\S+/.test(body.candidate.email)) {
        return NextResponse.json({
          error: 'Invalid email format'
        }, { status: 400 });
      }
      
      // Check if job exists and is published
      const job = await prisma.jobs.findUnique({
        where: { id: body.jobId },
        select: {
          id: true,
          title: true,
          status: true,
          applicationDeadline: true
        }
      });
      
      if (!job) {
        return NextResponse.json({
          error: 'Job not found'
        }, { status: 404 });
      }
      
      if (job.status !== 'Published') {
        return NextResponse.json({
          error: 'Job is not accepting applications'
        }, { status: 400 });
      }
      
      // Check application deadline
      if (job.applicationDeadline && new Date() > new Date(job.applicationDeadline)) {
        return NextResponse.json({
          error: 'Application deadline has passed'
        }, { status: 400 });
      }
      
      // Check for duplicate applications (by email + job)
      if (body.candidate.email) {
        const existingApplication = await prisma.applications.findFirst({
          where: {
            jobId: body.jobId,
            email: body.candidate.email,
            is_archived: false
          }
        });
        
        if (existingApplication) {
          return NextResponse.json({
            error: 'Application already exists for this email and job'
          }, { status: 409 });
        }
      }
      
      // Try to find existing user by email
      let userId = null;
      if (body.candidate.email) {
        const existingUser = await prisma.users.findUnique({
          where: { email: body.candidate.email },
          select: { id: true }
        });
        userId = existingUser?.id || null;
      }
      
      // Create the application
      const newApplication = await prisma.applications.create({
        data: {
          jobId: body.jobId,
          userId: userId,
          name: body.candidate.name || null,
          email: body.candidate.email || null,
          phone: body.candidate.phone || null,
          coverLetter: body.coverLetter || null,
          resumeUrl: body.resumeUrl || null,
          notes: body.notes || null,
          status: 'Applied',
          appliedAt: new Date(),
          updatedAt: new Date(),
          current_stage_entered_at: new Date(),
          time_in_current_stage_seconds: 0,
          total_application_time_seconds: 0
        },
        include: {
          jobs: {
            select: {
              id: true,
              title: true,
              slug: true,
              department: true,
              location: true,
              status: true
            }
          },
          users: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });
      
      // Update job application count
      await prisma.jobs.update({
        where: { id: body.jobId },
        data: {
          applicationCount: { increment: 1 }
        }
      });
      
      // Format response
      const formattedApplication = {
        id: newApplication.id,
        status: newApplication.status,
        candidate: {
          id: newApplication.userId,
          name: newApplication.name || (newApplication.users ? `${newApplication.users.firstName} ${newApplication.users.lastName}` : null),
          email: newApplication.email || newApplication.users?.email,
          phone: newApplication.phone
        },
        job: {
          id: newApplication.jobs.id,
          title: newApplication.jobs.title,
          slug: newApplication.jobs.slug,
          department: newApplication.jobs.department,
          location: newApplication.jobs.location
        },
        application: {
          coverLetter: newApplication.coverLetter,
          resumeUrl: newApplication.resumeUrl,
          notes: newApplication.notes,
          appliedAt: newApplication.appliedAt,
          updatedAt: newApplication.updatedAt
        },
        tracking: {
          currentStageEnteredAt: newApplication.current_stage_entered_at,
          timeInCurrentStageSeconds: newApplication.time_in_current_stage_seconds,
          totalApplicationTimeSeconds: newApplication.total_application_time_seconds
        }
      };
      
      return createSuccessResponse(formattedApplication, 201);
      
    } catch (error) {
      console.error('Error creating application via API:', error);
      
      if (error.code === 'P2002') { // Prisma unique constraint error
        return NextResponse.json({ 
          error: 'Duplicate application detected' 
        }, { status: 409 });
      }
      
      return NextResponse.json({ error: 'Failed to create application' }, { status: 500 });
    }
  });
}