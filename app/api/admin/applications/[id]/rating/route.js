import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../auth/[...nextauth]/route';
import { appPrisma } from '../../../../../lib/prisma';
import { protectRoute } from '../../../../../lib/middleware/apiProtection';

// Update application rating (manual override)
export async function PATCH(request, { params }) {
  try {
    // Check if user has permission to update applications
    const authResult = await protectRoute("applications", "update");
    if (authResult.error) return authResult.error;

    const { session } = authResult;
    const { id: applicationId } = await params;
    const body = await request.json();
    const { rating, ratingType = 'manual' } = body;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Check if application exists
    const existingApplication = await appPrisma.applications.findUnique({
      where: { id: applicationId }
    });

    if (!existingApplication) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Update the application rating
    const updatedApplication = await appPrisma.applications.update({
      where: { id: applicationId },
      data: {
        rating: parseInt(rating),
        rating_type: ratingType,
        rating_updated_at: new Date(),
        rated_by: session.user.id,
        // Keep AI rating if this is a manual override
        ...(ratingType === 'manual' && existingApplication.ai_rating && {
          // AI rating is preserved in ai_rating field
        })
      }
    });

    return NextResponse.json({
      success: true,
      applicationId,
      rating: updatedApplication.rating,
      ratingType: updatedApplication.rating_type,
      previousAIRating: updatedApplication.ai_rating,
      updatedAt: updatedApplication.rating_updated_at,
      ratedBy: updatedApplication.rated_by
    });

  } catch (error) {
    console.error('Error updating application rating:', error);
    return NextResponse.json(
      { error: 'Failed to update application rating' },
      { status: 500 }
    );
  }
}

// Get application rating details
export async function GET(request, { params }) {
  try {
    const authResult = await protectRoute("applications", "view");
    if (authResult.error) return authResult.error;

    const { id: applicationId } = await params;

    const application = await appPrisma.applications.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        rating: true,
        rating_type: true,
        ai_rating: true,
        rating_updated_at: true,
        rated_by: true
      }
    });

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      rating: {
        current: application.rating,
        type: application.rating_type,
        aiRating: application.ai_rating,
        updatedAt: application.rating_updated_at,
        ratedBy: application.rated_by
      }
    });

  } catch (error) {
    console.error('Error fetching application rating:', error);
    return NextResponse.json(
      { error: 'Failed to fetch application rating' },
      { status: 500 }
    );
  }
}