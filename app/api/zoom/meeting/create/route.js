// app/api/zoom/meeting/create/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PrismaClient } from "@/app/generated/prisma";

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { topic, start_time, duration, agenda, timezone } = await request.json();

    // Get user's Zoom integration data
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: {
        zoom_access_token: true,
        zoom_integration_enabled: true,
        zoom_token_expires_at: true,
        zoom_refresh_token: true,
        zoom_user_id: true
      },
    });

    if (!user || !user.zoom_integration_enabled) {
      return NextResponse.json(
        { error: "Zoom integration not enabled" },
        { status: 400 }
      );
    }

    // Check if token is expired
    const isTokenExpired = user.zoom_token_expires_at && new Date() > new Date(user.zoom_token_expires_at);
    
    if (isTokenExpired) {
      return NextResponse.json(
        { error: "Zoom token expired. Please reconnect your Zoom account." },
        { status: 401 }
      );
    }

    // Create Zoom meeting
    const meetingData = {
      topic: topic || "Interview",
      type: 2, // Scheduled meeting
      start_time: start_time, // ISO 8601 format
      duration: duration || 45, // in minutes
      timezone: timezone || "America/Toronto",
      agenda: agenda || "",
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: false,
        mute_participants_upon_entry: true,
        waiting_room: true,
        auto_recording: "none",
        allow_multiple_devices: true
      }
    };

    console.log("🔄 Creating Zoom meeting:", {
      topic: meetingData.topic,
      start_time: meetingData.start_time,
      duration: meetingData.duration
    });

    const zoomResponse = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user.zoom_access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(meetingData)
    });

    if (!zoomResponse.ok) {
      const errorData = await zoomResponse.json();
      console.error("Zoom meeting creation failed:", errorData);
      return NextResponse.json(
        { error: "Failed to create Zoom meeting", details: errorData },
        { status: zoomResponse.status }
      );
    }

    const meeting = await zoomResponse.json();
    
    console.log("✅ Zoom meeting created successfully:", {
      id: meeting.id,
      join_url: meeting.join_url
    });

    return NextResponse.json({
      success: true,
      meeting: {
        id: meeting.id,
        topic: meeting.topic,
        start_time: meeting.start_time,
        duration: meeting.duration,
        join_url: meeting.join_url,
        start_url: meeting.start_url,
        password: meeting.password,
        meeting_id: meeting.id
      }
    });

  } catch (error) {
    console.error("Error creating Zoom meeting:", error);
    return NextResponse.json(
      { error: "Failed to create Zoom meeting" },
      { status: 500 }
    );
  }
}