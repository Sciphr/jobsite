// app/api/admin/interviews/[id]/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PrismaClient } from "@/app/generated/prisma";
import { google } from 'googleapis';

const prisma = new PrismaClient();

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // First, get the interview to check if it exists and get the calendar event ID
    const interview = await prisma.interviewToken.findUnique({
      where: { id },
      include: {
        application: {
          include: {
            job: {
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
    if (interview.calendarEventId) {
      try {
        // The current user (who is deleting) should have the calendar access
        // since they are likely the one who created the interview
        const currentUser = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: {
            googleAccessToken: true,
            googleRefreshToken: true,
            googleTokenExpiresAt: true,
          }
        });

        if (currentUser?.googleAccessToken) {
          // Setup Google Calendar client with current user's OAuth tokens
          const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
          );

          oauth2Client.setCredentials({
            access_token: currentUser.googleAccessToken,
            refresh_token: currentUser.googleRefreshToken,
          });

          const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

          // Delete the calendar event
          await calendar.events.delete({
            calendarId: 'primary',
            eventId: interview.calendarEventId,
          });

          console.log(`Deleted calendar event ${interview.calendarEventId} for interview ${id}`);
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
    await prisma.interviewRescheduleRequest.deleteMany({
      where: { interviewTokenId: id }
    });

    // Delete the interview from the database
    await prisma.interviewToken.delete({
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