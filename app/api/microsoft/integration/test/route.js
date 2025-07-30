import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getMicrosoftAccessToken } from "@/app/lib/microsoftAuth";

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    // Get Microsoft access token (with automatic refresh)
    let accessToken;
    try {
      accessToken = await getMicrosoftAccessToken(session.user.id);
    } catch (tokenError) {
      console.error("Failed to get Microsoft access token:", tokenError);
      return NextResponse.json(
        { message: tokenError.message },
        { status: 401 }
      );
    }

    // Test calendar access
    const calendarResponse = await fetch('https://graph.microsoft.com/v1.0/me/calendars', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!calendarResponse.ok) {
      const errorText = await calendarResponse.text();
      console.error("Microsoft calendar test failed:", errorText);
      return NextResponse.json(
        { message: "Failed to access Microsoft calendars" },
        { status: 400 }
      );
    }

    const calendars = await calendarResponse.json();

    // Test Teams access by checking if we can create an online meeting
    const teamsTestResponse = await fetch('https://graph.microsoft.com/v1.0/me/onlineMeetings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subject: 'Test Meeting - Connection Verification',
        startDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        endDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(), // Tomorrow + 30 min
      }),
    });

    let teamsAccessible = false;
    if (teamsTestResponse.ok) {
      // Delete the test meeting immediately
      const testMeeting = await teamsTestResponse.json();
      if (testMeeting.id) {
        await fetch(`https://graph.microsoft.com/v1.0/me/onlineMeetings/${testMeeting.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
      }
      teamsAccessible = true;
    }

    return NextResponse.json({
      success: true,
      calendarCount: calendars.value?.length || 0,
      teamsAccessible,
      message: "Microsoft integration test successful",
    });

  } catch (error) {
    console.error("Error testing Microsoft integration:", error);
    return NextResponse.json(
      { message: "Failed to test Microsoft integration" },
      { status: 500 }
    );
  }
}