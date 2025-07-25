// app/api/interview/reschedule/[token]/route.js
import { NextResponse } from "next/server";
import { PrismaClient } from "@/app/generated/prisma";
import { emailService } from "@/app/lib/email";
import crypto from "crypto";

const prisma = new PrismaClient();

// GET - Fetch interview details by token
export async function GET(request, { params }) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Find interview by reschedule token
    const interview = await prisma.interviewToken.findUnique({
      where: { 
        rescheduleToken: token,
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
        originalDateTime: interview.scheduledAt,
        duration: interview.duration,
        type: interview.type,
        interviewers: interview.interviewers,
        location: interview.location,
        agenda: interview.agenda,
        notes: interview.notes
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

// POST - Submit reschedule response
export async function POST(request, { params }) {
  try {
    const { token } = await params;
    const { responseType, alternativeTimes, writtenResponse } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    if (!responseType || (responseType === "alternative_times" && !alternativeTimes) || 
        (responseType === "written_response" && !writtenResponse)) {
      return NextResponse.json({ error: "Invalid response data" }, { status: 400 });
    }

    // Find interview by reschedule token
    const interviewToken = await prisma.interviewToken.findUnique({
      where: { 
        rescheduleToken: token,
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

    // Create reschedule request record
    const rescheduleRequest = await prisma.interviewRescheduleRequest.create({
      data: {
        interviewTokenId: interviewToken.id,
        applicationId: interviewToken.applicationId,
        responseType,
        alternativeTimes: responseType === "alternative_times" ? alternativeTimes : null,
        writtenResponse: responseType === "written_response" ? writtenResponse : null,
        submittedAt: new Date(),
        status: "pending"
      }
    });

    // Add note to application timeline
    await prisma.applicationNote.create({
      data: {
        applicationId: interviewToken.applicationId,
        content: `Candidate declined original interview time and ${
          responseType === "alternative_times" 
            ? `suggested ${alternativeTimes.length} alternative time(s)` 
            : "provided written availability response"
        }`,
        type: "interview_reschedule_request",
        authorName: interviewToken.application.name,
        metadata: {
          rescheduleRequestId: rescheduleRequest.id,
          responseType,
          originalDateTime: interviewToken.scheduledAt,
          ...(responseType === "alternative_times" && { alternativeTimes }),
          ...(responseType === "written_response" && { writtenResponse })
        },
        isSystemGenerated: false,
      },
    });

    // Mark the token as used
    await prisma.interviewToken.update({
      where: { id: interviewToken.id },
      data: { 
        status: "reschedule_requested",
        respondedAt: new Date()
      }
    });

    // Send notification to hiring manager
    try {
      const hiringManagerUser = await prisma.user.findUnique({
        where: { id: interviewToken.application.job.createdBy },
        select: { email: true, firstName: true, lastName: true }
      });

      if (hiringManagerUser?.email) {
        const alternativeTimesText = responseType === "alternative_times" 
          ? alternativeTimes.map((time, index) => 
              `${index + 1}. ${new Date(time.date + 'T' + time.time).toLocaleString()}`
            ).join('\n')
          : '';

        await emailService.sendEmail({
          to: hiringManagerUser.email,
          subject: `Interview Reschedule Request: ${interviewToken.application.name} - ${interviewToken.application.job.title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Interview Reschedule Request</h2>
              <p>The candidate has requested to reschedule their interview.</p>
              
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Original Interview Details:</h3>
                <p><strong>Candidate:</strong> ${interviewToken.application.name}</p>
                <p><strong>Position:</strong> ${interviewToken.application.job.title}</p>
                <p><strong>Original Time:</strong> ${new Date(interviewToken.scheduledAt).toLocaleString()}</p>
                <p><strong>Duration:</strong> ${interviewToken.duration} minutes</p>
                <p><strong>Type:</strong> ${interviewToken.type}</p>
              </div>

              ${responseType === "alternative_times" ? `
              <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Candidate's Alternative Time Suggestions:</h3>
                <ul>
                  ${alternativeTimes.map((time, index) => 
                    `<li>${new Date(time.date + 'T' + time.time).toLocaleString()}</li>`
                  ).join('')}
                </ul>
              </div>
              ` : ''}

              ${responseType === "written_response" ? `
              <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Candidate's Message:</h3>
                <p style="white-space: pre-wrap;">${writtenResponse}</p>
              </div>
              ` : ''}

              <p>Please review the request and follow up with the candidate to schedule a new time.</p>
              
              <p>
                <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin/applications/${interviewToken.applicationId}" 
                   style="background: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                  View Application
                </a>
              </p>
            </div>
          `,
          text: `
Interview Reschedule Request

The candidate has requested to reschedule their interview.

Original Interview Details:
- Candidate: ${interviewToken.application.name}
- Position: ${interviewToken.application.job.title}
- Original Time: ${new Date(interviewToken.scheduledAt).toLocaleString()}
- Duration: ${interviewToken.duration} minutes
- Type: ${interviewToken.type}

${responseType === "alternative_times" ? `
Candidate's Alternative Time Suggestions:
${alternativeTimesText}
` : ''}

${responseType === "written_response" ? `
Candidate's Message:
${writtenResponse}
` : ''}

Please review the request and follow up with the candidate to schedule a new time.

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
      message: "Reschedule request submitted successfully"
    });

  } catch (error) {
    console.error("Error submitting reschedule request:", error);
    return NextResponse.json(
      { error: "Failed to submit reschedule request" },
      { status: 500 }
    );
  }
}