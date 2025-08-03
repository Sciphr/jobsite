// app/api/admin/interviews/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { appPrisma } from "../../../lib/prisma";

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
      whereClause.applications = {
        jobs: {
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

    const interviews = await appPrisma.interview_tokens.findMany({
      where: whereClause,
      include: {
        applications: {
          include: {
            jobs: {
              select: {
                id: true,
                title: true,
                department: true,
                createdBy: true,
                users: {
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
        interview_reschedule_requests: {
          orderBy: {
            created_at: 'desc'
          },
          take: 1 // Get the latest reschedule request
        }
      },
      orderBy: {
        scheduled_at: 'asc'
      }
    });

    // Transform the data for the frontend
    const transformedInterviews = interviews.map(interview => ({
      id: interview.id,
      applicationId: interview.application_id,
      candidateName: interview.applications.name,
      candidateEmail: interview.applications.email,
      jobTitle: interview.applications.jobs.title,
      jobDepartment: interview.applications.jobs.department,
      jobId: interview.applications.jobs.id,
      hiringManager: (() => {
        // First try to find the creator in the interviewers array
        const interviewers = interview.interviewers || [];
        const creator = interviewers.find(interviewer => interviewer.isCreator === true);
        
        if (creator) {
          return {
            name: creator.name || 'Unknown User',
            email: creator.email || null,
            isMe: creator.userId === session.user.id || creator.email === session.user.email
          };
        }
        
        // Fallback to job creator if no interview creator is found
        const job = interview.applications.jobs;
        const user = job.users;
        
        return {
          name: user?.firstName && user?.lastName 
            ? `${user.firstName} ${user.lastName}`
            : user?.email || (job.createdBy ? 'Unknown User' : 'System Created'),
          email: user?.email || null,
          isMe: job.createdBy === session.user.id
        };
      })(),
      scheduledAt: interview.scheduled_at,
      duration: interview.duration,
      type: interview.type,
      status: interview.status,
      location: interview.location,
      agenda: interview.agenda,
      notes: interview.notes,
      interviewNotes: interview.interview_notes,
      interviewRating: interview.interview_rating,
      calendarEventId: interview.calendar_event_id,
      meetingLink: interview.meeting_link,
      meetingProvider: interview.meeting_provider,
      respondedAt: interview.responded_at,
      expiresAt: interview.expires_at,
      createdAt: interview.created_at,
      interviewers: interview.interviewers,
      hasRescheduleRequest: interview.interview_reschedule_requests.length > 0,
      latestRescheduleRequest: interview.interview_reschedule_requests[0] || null,
      // Helper flags
      isExpired: new Date() > new Date(interview.expires_at),
      isUpcoming: new Date(interview.scheduled_at) > new Date(),
      isPast: new Date(interview.scheduled_at) < new Date(),
      daysUntilInterview: Math.ceil((new Date(interview.scheduled_at) - new Date()) / (1000 * 60 * 60 * 24))
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