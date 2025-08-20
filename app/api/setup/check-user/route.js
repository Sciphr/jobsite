import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Check if any user with this email already exists
    const { appPrisma } = await import("../../../lib/prisma");
    
    const existingUser = await appPrisma.users.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email address already exists" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      available: true,
      message: "Email is available"
    });

  } catch (error) {
    console.error("Error checking user email:", error);
    return NextResponse.json(
      { error: "Failed to validate email address" },
      { status: 500 }
    );
  }
}