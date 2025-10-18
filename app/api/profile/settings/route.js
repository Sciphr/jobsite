// app/api/profile/settings/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { appPrisma } from "@/app/lib/prisma";

/**
 * GET /api/profile/settings
 * Get current user's talent pool profile settings
 */
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await appPrisma.users.findUnique({
      where: { id: session.user.id },
      select: {
        bio: true,
        skills: true,
        location: true,
        current_company: true,
        current_title: true,
        years_experience: true,
        linkedin_url: true,
        portfolio_url: true,
        available_for_opportunities: true,
        last_profile_update: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching profile settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile settings" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/profile/settings
 * Update current user's talent pool profile settings
 */
export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      bio,
      skills,
      location,
      current_company,
      current_title,
      years_experience,
      linkedin_url,
      portfolio_url,
      available_for_opportunities,
    } = body;

    // Validate skills array
    if (skills && !Array.isArray(skills)) {
      return NextResponse.json(
        { error: "Skills must be an array" },
        { status: 400 }
      );
    }

    // Validate URLs if provided
    if (linkedin_url && linkedin_url.trim() && !isValidUrl(linkedin_url)) {
      return NextResponse.json(
        { error: "Invalid LinkedIn URL" },
        { status: 400 }
      );
    }

    if (portfolio_url && portfolio_url.trim() && !isValidUrl(portfolio_url)) {
      return NextResponse.json(
        { error: "Invalid portfolio URL" },
        { status: 400 }
      );
    }

    // Validate years of experience
    if (years_experience && (years_experience < 0 || years_experience > 50)) {
      return NextResponse.json(
        { error: "Years of experience must be between 0 and 50" },
        { status: 400 }
      );
    }

    // Update user profile
    const updatedUser = await appPrisma.users.update({
      where: { id: session.user.id },
      data: {
        bio: bio || null,
        skills: skills || [],
        location: location || null,
        current_company: current_company || null,
        current_title: current_title || null,
        years_experience: years_experience ? parseInt(years_experience) : null,
        linkedin_url: linkedin_url?.trim() || null,
        portfolio_url: portfolio_url?.trim() || null,
        available_for_opportunities:
          available_for_opportunities !== undefined
            ? available_for_opportunities
            : true,
        last_profile_update: new Date(),
      },
      select: {
        bio: true,
        skills: true,
        location: true,
        current_company: true,
        current_title: true,
        years_experience: true,
        linkedin_url: true,
        portfolio_url: true,
        available_for_opportunities: true,
        last_profile_update: true,
      },
    });

    return NextResponse.json({
      success: true,
      profile: updatedUser,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Error updating profile settings:", error);
    return NextResponse.json(
      { error: "Failed to update profile settings" },
      { status: 500 }
    );
  }
}

/**
 * Helper function to validate URLs
 */
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}
