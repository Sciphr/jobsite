import { NextResponse } from 'next/server';
import { protectAPIRoute, createSuccessResponse, validateAPIRequest } from '../../../lib/middleware/apiAuthentication.js';
import prisma from '../../../lib/prisma.js';

/**
 * Jobs API Endpoints
 * Provides CRUD operations for job listings via API
 */

/**
 * GET /api/v1/jobs - List all jobs
 * Query parameters:
 * - limit: number of jobs to return (default: 20, max: 100)
 * - offset: number of jobs to skip (default: 0)
 * - status: filter by status (Published, Draft, Expired)
 * - department: filter by department
 * - search: search in title and description
 * - featured: true/false to filter featured jobs
 */
export async function GET(request) {
  return protectAPIRoute(request, 'jobs', 'read', async (apiKeyData) => {
    try {
      const { searchParams } = new URL(request.url);
      
      // Parse query parameters
      const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
      const offset = parseInt(searchParams.get('offset') || '0');
      const status = searchParams.get('status');
      const department = searchParams.get('department');
      const search = searchParams.get('search');
      const featured = searchParams.get('featured');
      
      // Build where clause
      const where = {};
      
      if (status) {
        where.status = status;
      }
      
      if (department) {
        where.department = department;
      }
      
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }
      
      if (featured !== null && featured !== undefined) {
        where.featured = featured === 'true';
      }
      
      // Fetch jobs with pagination
      const [jobs, totalCount] = await Promise.all([
        prisma.jobs.findMany({
          where,
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
          },
          orderBy: [
            { featured: 'desc' },
            { createdAt: 'desc' }
          ],
          take: limit,
          skip: offset
        }),
        prisma.jobs.count({ where })
      ]);
      
      // Format response
      const formattedJobs = jobs.map(job => ({
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
          startDate: job.startDate
        },
        category: job.categories ? {
          name: job.categories.name,
          description: job.categories.description
        } : null,
        createdBy: job.users ? {
          name: `${job.users.firstName} ${job.users.lastName}`,
          email: job.users.email
        } : null
      }));
      
      return createSuccessResponse({
        jobs: formattedJobs,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount
        }
      });
      
    } catch (error) {
      console.error('Error fetching jobs via API:', error);
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
    }
  });
}

/**
 * POST /api/v1/jobs - Create a new job
 * Required permissions: jobs:create
 */
export async function POST(request) {
  return protectAPIRoute(request, 'jobs', 'create', async (apiKeyData) => {
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
      const requiredFields = ['title', 'description', 'department', 'employmentType', 'location', 'requirements', 'categoryId'];
      const missingFields = requiredFields.filter(field => !body[field]);
      
      if (missingFields.length > 0) {
        return NextResponse.json({
          error: 'Missing required fields',
          missingFields
        }, { status: 400 });
      }
      
      // Generate slug from title
      const slug = body.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      
      // Check if slug already exists
      const existingJob = await prisma.jobs.findUnique({ where: { slug } });
      const finalSlug = existingJob ? `${slug}-${Date.now()}` : slug;
      
      // Validate category exists
      const category = await prisma.categories.findUnique({ 
        where: { id: body.categoryId } 
      });
      
      if (!category) {
        return NextResponse.json({
          error: 'Invalid category ID'
        }, { status: 400 });
      }
      
      // Create the job
      const newJob = await prisma.jobs.create({
        data: {
          title: body.title,
          slug: finalSlug,
          description: body.description,
          summary: body.summary || null,
          department: body.department,
          employmentType: body.employmentType,
          experienceLevel: body.experienceLevel || 'Mid Level',
          location: body.location,
          remotePolicy: body.remotePolicy || 'Office',
          salaryMin: body.salary?.min || null,
          salaryMax: body.salary?.max || null,
          salaryCurrency: body.salary?.currency || 'USD',
          salaryType: body.salary?.type || 'Annual',
          showSalary: body.salary?.showSalary ?? true,
          benefits: body.benefits || null,
          requirements: body.requirements,
          preferredQualifications: body.preferredQualifications || null,
          educationRequired: body.educationRequired || null,
          yearsExperienceRequired: body.yearsExperienceRequired || null,
          applicationDeadline: body.applicationDeadline ? new Date(body.applicationDeadline) : null,
          startDate: body.startDate ? new Date(body.startDate) : null,
          applicationInstructions: body.applicationInstructions || null,
          status: body.status || 'Draft',
          featured: body.featured || false,
          priority: body.priority || 0,
          categoryId: body.categoryId,
          createdBy: apiKeyData.userId,
          updatedAt: new Date(),
          postedAt: body.status === 'Published' ? new Date() : null
        },
        include: {
          categories: {
            select: { name: true, description: true }
          },
          users: {
            select: { firstName: true, lastName: true, email: true }
          }
        }
      });
      
      // Format response
      const formattedJob = {
        id: newJob.id,
        title: newJob.title,
        slug: newJob.slug,
        description: newJob.description,
        summary: newJob.summary,
        department: newJob.department,
        employmentType: newJob.employmentType,
        experienceLevel: newJob.experienceLevel,
        location: newJob.location,
        remotePolicy: newJob.remotePolicy,
        salary: {
          min: newJob.salaryMin,
          max: newJob.salaryMax,
          currency: newJob.salaryCurrency,
          type: newJob.salaryType,
          showSalary: newJob.showSalary
        },
        benefits: newJob.benefits,
        requirements: newJob.requirements,
        preferredQualifications: newJob.preferredQualifications,
        educationRequired: newJob.educationRequired,
        yearsExperienceRequired: newJob.yearsExperienceRequired,
        status: newJob.status,
        featured: newJob.featured,
        priority: newJob.priority,
        dates: {
          createdAt: newJob.createdAt,
          updatedAt: newJob.updatedAt,
          postedAt: newJob.postedAt,
          applicationDeadline: newJob.applicationDeadline,
          startDate: newJob.startDate
        },
        category: {
          name: newJob.categories.name,
          description: newJob.categories.description
        },
        createdBy: {
          name: `${newJob.users.firstName} ${newJob.users.lastName}`,
          email: newJob.users.email
        }
      };
      
      return createSuccessResponse(formattedJob, 201);
      
    } catch (error) {
      console.error('Error creating job via API:', error);
      
      if (error.code === 'P2002') { // Prisma unique constraint error
        return NextResponse.json({ 
          error: 'Job with this title already exists' 
        }, { status: 409 });
      }
      
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
    }
  });
}