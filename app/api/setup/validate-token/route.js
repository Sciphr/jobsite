import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { token } = await request.json();
    
    if (!token) {
      return NextResponse.json(
        { error: "Setup token is required" },
        { status: 400 }
      );
    }

    // TODO: In a real implementation, you would validate this token against your SaaS management system
    // For now, we'll validate the token format and check if setup is already completed
    
    // Validate token format (should be 64 character hex string)
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return NextResponse.json(
        { error: "Invalid token format" },
        { status: 400 }
      );
    }

    // Check if setup is already completed by looking for any admin users
    const { appPrisma } = await import("../../../lib/prisma");
    
    const adminUser = await appPrisma.users.findFirst({
      where: {
        role: "admin"
      },
      select: { id: true }
    });

    if (adminUser) {
      return NextResponse.json(
        { error: "Setup has already been completed for this application" },
        { status: 400 }
      );
    }

    // Token is valid and setup is needed
    return NextResponse.json({
      valid: true,
      message: "Setup token is valid"
    });

  } catch (error) {
    console.error("Error validating setup token:", error);
    return NextResponse.json(
      { error: "Failed to validate setup token" },
      { status: 500 }
    );
  }
}