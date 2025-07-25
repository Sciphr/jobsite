// app/api/interview/accept/[token]/route.js
import { NextResponse } from "next/server";
import { PrismaClient } from "@/app/generated/prisma";
import { emailService } from "@/app/lib/email";

const prisma = new PrismaClient();

// GET - Fetch interview details by acceptance token
export async function GET(request, { params }) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Find interview by acceptance token
    const interview = await prisma.interviewToken.findUnique({
      where: { 
        acceptanceToken: token,
        expiresAt: {
          gt: new Date() // Token must not be expired
        }
      },
      include: {
        application: {
          include: {
            job: {
              select: {
                title: true
              }
            }
          }
        }
      }
    });

    if (!interview) {
      return NextResponse.json(
        { error: "Interview not found or token has expired" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      interview: {
        id: interview.id,
        jobTitle: interview.application.job?.title,
        candidateName: interview.application.name,
        candidateEmail: interview.application.email,
        scheduledDateTime: interview.scheduledAt,
        duration: interview.duration,
        type: interview.type,
        interviewers: interview.interviewers,
        location: interview.location,
        agenda: interview.agenda,
        notes: interview.notes,
        status: interview.status
      }
    });

  } catch (error) {
    console.error("Error fetching interview data:", error);
    return NextResponse.json(
      { error: "Failed to fetch interview data" },
      { status: 500 }
    );
  }
}

// POST - Accept interview
export async function POST(request, { params }) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Find interview by acceptance token
    const interviewToken = await prisma.interviewToken.findUnique({
      where: { 
        acceptanceToken: token,
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        application: {
          include: {
            job: {
              select: {
                title: true,
                createdBy: true // Get the hiring manager's ID
              }
            }
          }
        }
      }
    });

    if (!interviewToken) {
      return NextResponse.json(
        { error: "Interview not found or token has expired" },
        { status: 404 }
      );
    }

    // Check if already responded
    if (interviewToken.status !== "pending") {
      return NextResponse.json(
        { error: "Interview has already been responded to" },
        { status: 400 }
      );
    }

    // Update interview token status
    await prisma.interviewToken.update({
      where: { id: interviewToken.id },
      data: { 
        status: "accepted",
        respondedAt: new Date()
      }
    });

    // Add note to application timeline
    await prisma.applicationNote.create({
      data: {
        applicationId: interviewToken.applicationId,
        content: `Candidate accepted interview scheduled for ${new Date(interviewToken.scheduledAt).toLocaleString()}`,
        type: "interview_accepted",
        authorName: interviewToken.application.name,
        metadata: {
          interviewTokenId: interviewToken.id,
          acceptedAt: new Date(),
          scheduledDateTime: interviewToken.scheduledAt,
          interviewType: interviewToken.type,
          duration: interviewToken.duration
        },
        isSystemGenerated: false,
      },
    });

    // Send notification to hiring manager
    try {
      const hiringManagerUser = await prisma.user.findUnique({
        where: { id: interviewToken.application.job.createdBy },
        select: { email: true, firstName: true, lastName: true }
      });

      if (hiringManagerUser?.email) {
        await emailService.sendEmail({
          to: hiringManagerUser.email,
          subject: `Interview Accepted: ${interviewToken.application.name} - ${interviewToken.application.job.title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Interview Accepted!</h2>
              <p>Great news! The candidate has accepted the interview.</p>
              
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Interview Details:</h3>
                <p><strong>Candidate:</strong> ${interviewToken.application.name}</p>
                <p><strong>Position:</strong> ${interviewToken.application.job.title}</p>
                <p><strong>Scheduled Time:</strong> ${new Date(interviewToken.scheduledAt).toLocaleString()}</p>
                <p><strong>Duration:</strong> ${interviewToken.duration} minutes</p>
                <p><strong>Type:</strong> ${interviewToken.type}</p>
                ${interviewToken.location ? `<p><strong>Location:</strong> ${interviewToken.location}</p>` : ''}
              </div>

              <p>The candidate confirmed their attendance at the scheduled time. Make sure to prepare for the interview!</p>
              
              <p>
                <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin/applications/${interviewToken.applicationId}" 
                   style="background: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                  View Application
                </a>
              </p>
            </div>
          `,
          text: `
Interview Accepted!

The candidate has accepted the interview.

Interview Details:
- Candidate: ${interviewToken.application.name}
- Position: ${interviewToken.application.job.title}
- Scheduled Time: ${new Date(interviewToken.scheduledAt).toLocaleString()}
- Duration: ${interviewToken.duration} minutes
- Type: ${interviewToken.type}
${interviewToken.location ? `- Location: ${interviewToken.location}` : ''}

The candidate confirmed their attendance at the scheduled time. Make sure to prepare for the interview!

View Application: ${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin/applications/${interviewToken.applicationId}
          `
        });
      }
    } catch (emailError) {
      console.error("Failed to send notification email:", emailError);
      // Don't fail the request if email fails
    }
    
    return NextResponse.json({
      success: true,
      message: "Interview accepted successfully",
      interview: {
        scheduledDateTime: interviewToken.scheduledAt,
        type: interviewToken.type,
        duration: interviewToken.duration
      }
    });

  } catch (error) {
    console.error("Error accepting interview:", error);
    return NextResponse.json(
      { error: "Failed to accept interview" },
      { status: 500 }
    );
  }
}