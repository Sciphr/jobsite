// app/api/admin/interviews/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PrismaClient } from "@/app/generated/prisma";

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const myOnly = searchParams.get('myOnly') === 'true';
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    // Build where clause
    let whereClause = {};
    
    // If myOnly is true, filter by jobs created by the current user
    if (myOnly) {
      whereClause.application = {
        job: {
          createdBy: session.user.id
        }
      };
    }

    // Add status filter if provided
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    // Add type filter if provided
    if (type && type !== 'all') {
      whereClause.type = type;
    }

    const interviews = await prisma.interviewToken.findMany({
      where: whereClause,
      include: {
        application: {
          include: {
            job: {
              select: {
                id: true,
                title: true,
                department: true,
                createdBy: true,
                creator: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true
                  }
                }
              }
            }
          }
        },
        rescheduleRequests: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1 // Get the latest reschedule request
        }
      },
      orderBy: {
        scheduledAt: 'asc'
      }
    });

    // Transform the data for the frontend
    const transformedInterviews = interviews.map(interview => ({
      id: interview.id,
      applicationId: interview.applicationId,
      candidateName: interview.application.name,
      candidateEmail: interview.application.email,
      jobTitle: interview.application.job.title,
      jobDepartment: interview.application.job.department,
      jobId: interview.application.job.id,
      hiringManager: {
        name: interview.application.job.creator?.firstName && interview.application.job.creator?.lastName 
          ? `${interview.application.job.creator.firstName} ${interview.application.job.creator.lastName}`
          : interview.application.job.creator?.email || 'Unknown',
        email: interview.application.job.creator?.email,
        isMe: interview.application.job.createdBy === session.user.id
      },
      scheduledAt: interview.scheduledAt,
      duration: interview.duration,
      type: interview.type,
      status: interview.status,
      location: interview.location,
      agenda: interview.agenda,
      notes: interview.notes,
      calendarEventId: interview.calendarEventId,
      meetingLink: interview.meetingLink,
      meetingProvider: interview.meetingProvider,
      respondedAt: interview.respondedAt,
      expiresAt: interview.expiresAt,
      createdAt: interview.createdAt,
      interviewers: interview.interviewers,
      hasRescheduleRequest: interview.rescheduleRequests.length > 0,
      latestRescheduleRequest: interview.rescheduleRequests[0] || null,
      // Helper flags
      isExpired: new Date() > new Date(interview.expiresAt),
      isUpcoming: new Date(interview.scheduledAt) > new Date(),
      isPast: new Date(interview.scheduledAt) < new Date(),
      daysUntilInterview: Math.ceil((new Date(interview.scheduledAt) - new Date()) / (1000 * 60 * 60 * 24))
    }));

    // Calculate summary stats
    const summary = {
      total: transformedInterviews.length,
      myInterviews: transformedInterviews.filter(i => i.hiringManager.isMe).length,
      pending: transformedInterviews.filter(i => i.status === 'pending').length,
      accepted: transformedInterviews.filter(i => i.status === 'accepted').length,
      rescheduleRequested: transformedInterviews.filter(i => i.status === 'reschedule_requested').length,
      upcoming: transformedInterviews.filter(i => i.isUpcoming).length,
      today: transformedInterviews.filter(i => {
        const today = new Date();
        const interviewDate = new Date(i.scheduledAt);
        return interviewDate.toDateString() === today.toDateString();
      }).length,
      thisWeek: transformedInterviews.filter(i => {
        const today = new Date();
        const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        const interviewDate = new Date(i.scheduledAt);
        return interviewDate >= today && interviewDate <= weekFromNow;
      }).length
    };

    return NextResponse.json({
      success: true,
      interviews: transformedInterviews,
      summary
    });

  } catch (error) {
    console.error("Error fetching interviews:", error);
    return NextResponse.json(
      { error: "Failed to fetch interviews", details: error.message },
      { status: 500 }
    );
  }
}