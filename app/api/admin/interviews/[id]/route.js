// app/api/admin/interviews/[id]/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { appPrisma } from "../../../../lib/prisma";
import { google } from 'googleapis';

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // First, get the interview to check if it exists and get the calendar event ID
    const interview = await appPrisma.interview_tokens.findUnique({
      where: { id },
      include: {
        applications: {
          include: {
            jobs: {
              select: {
                createdBy: true
              }
            }
          }
        }
      }
    });

    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    // Admin users can delete any interview - no additional permission check needed

    // Delete from Google Calendar if calendar event ID exists
    if (interview.calendar_event_id) {
      try {
        // The current user (who is deleting) should have the calendar access
        // since they are likely the one who created the interview
        const currentUser = await appPrisma.users.findUnique({
          where: { id: session.user.id },
          select: {
            google_access_token: true,
            google_refresh_token: true,
            google_token_expires_at: true,
          }
        });

        if (currentUser?.google_access_token) {
          // Setup Google Calendar client with current user's OAuth tokens
          const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
          );

          oauth2Client.setCredentials({
            access_token: currentUser.google_access_token,
            refresh_token: currentUser.google_refresh_token,
          });

          const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

          // Delete the calendar event
          await calendar.events.delete({
            calendarId: 'primary',
            eventId: interview.calendar_event_id,
          });

          console.log(`Deleted calendar event ${interview.calendar_event_id} for interview ${id}`);
        } else {
          console.warn(`Current user doesn't have Google Calendar connected, skipping calendar deletion`);
        }
      } catch (calendarError) {
        console.error('Error deleting calendar event:', calendarError);
        // Don't fail the entire operation if calendar deletion fails
        // The interview will still be deleted from the database
      }
    }

    // Delete any associated reschedule requests first (due to foreign key constraints)
    await appPrisma.interview_reschedule_requests.deleteMany({
      where: { interview_token_id: id }
    });

    // Delete the interview from the database
    await appPrisma.interview_tokens.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: "Interview deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting interview:", error);
    return NextResponse.json(
      { error: "Failed to delete interview", details: error.message },
      { status: 500 }
    );
  }
}