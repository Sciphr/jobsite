import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { db } from '../../../lib/db';
import { rateApplicationWithAI, batchRateApplications } from '../../../lib/aiRatingService';

// Rate a single application
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { applicationId } = body;

    if (!applicationId) {
      return NextResponse.json({ error: 'Application ID is required' }, { status: 400 });
    }

    // Get application with job details
    const application = await db.applications.findUnique({
      where: { id: applicationId },
      include: {
        jobs: {
          include: {
            employment_types: true,
            experience_levels: true,
            remote_policies: true
          }
        }
      }
    });

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // TODO: Extract resume text if resumeUrl exists
    let resumeText = '';
    // This would require a PDF parser or MinIO integration to extract text
    // For now, we'll work with cover letter only

    // Rate the application using AI
    const aiRating = await rateApplicationWithAI(application, application.jobs, resumeText);

    if (aiRating === null) {
      return NextResponse.json({ 
        error: 'AI rating service not available. Please check OpenAI API configuration.' 
      }, { status: 503 });
    }

    // Update the application in database
    const updatedApplication = await db.applications.update({
      where: { id: applicationId },
      data: {
        rating: aiRating,
        ai_rating: aiRating,
        rating_type: 'ai',
        rating_updated_at: new Date(),
        rated_by: session.user.id
      }
    });

    return NextResponse.json({
      success: true,
      applicationId,
      rating: aiRating,
      ratingType: 'ai',
      updatedAt: updatedApplication.rating_updated_at
    });

  } catch (error) {
    console.error('Error rating application:', error);
    return NextResponse.json(
      { error: 'Failed to rate application' },
      { status: 500 }
    );
  }
}

// Batch rate multiple applications
export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { applicationIds, rateAll } = body;

    let applications;

    if (rateAll) {
      // Rate all unrated applications that have resumes
      applications = await db.applications.findMany({
        where: {
          AND: [
            {
              OR: [
                { rating: null },
                { rating: 0 },
                { rating_type: null }
              ]
            },
            {
              resumeUrl: {
                not: null
              }
            },
            {
              resumeUrl: {
                not: ''
              }
            }
          ]
        },
        include: {
          jobs: {
            include: {
              employment_types: true,
              experience_levels: true,
              remote_policies: true
            }
          }
        },
        take: 50 // Limit to prevent timeout
      });
    } else if (applicationIds && Array.isArray(applicationIds)) {
      // Rate specific applications
      applications = await db.applications.findMany({
        where: {
          id: { in: applicationIds }
        },
        include: {
          jobs: {
            include: {
              employment_types: true,
              experience_levels: true,
              remote_policies: true
            }
          }
        }
      });
    } else {
      return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 });
    }

    if (applications.length === 0) {
      return NextResponse.json({ 
        success: true,
        message: 'No applications found to rate',
        results: []
      });
    }

    // Create a jobs lookup for the batch rating function
    const jobs = applications.map(app => app.jobs);
    const uniqueJobs = jobs.filter((job, index, self) => 
      self.findIndex(j => j.id === job.id) === index
    );

    // Batch rate applications
    const ratingResults = await batchRateApplications(applications, uniqueJobs);

    // Update successful ratings in database
    const updatePromises = ratingResults
      .filter(result => result.success && result.rating)
      .map(result => 
        db.applications.update({
          where: { id: result.applicationId },
          data: {
            rating: result.rating,
            ai_rating: result.rating,
            rating_type: 'ai',
            rating_updated_at: new Date(),
            rated_by: session.user.id
          }
        })
      );

    await Promise.all(updatePromises);

    const successful = ratingResults.filter(r => r.success).length;
    const failed = ratingResults.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Batch rating completed. ${successful} successful, ${failed} failed.`,
      results: ratingResults,
      summary: {
        total: ratingResults.length,
        successful,
        failed
      }
    });

  } catch (error) {
    console.error('Error in batch rating:', error);
    return NextResponse.json(
      { error: 'Failed to batch rate applications' },
      { status: 500 }
    );
  }
}