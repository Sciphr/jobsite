// app/api/profile/route.js
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { appPrisma } from "../../lib/prisma";

export async function GET(req) {
  console.log("🔍 Profile API GET request started");

  const session = await getServerSession(authOptions);

  if (!session) {
    console.log("❌ No session found, returning unauthorized");
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userId = session.user.id;

  try {
    const user = await appPrisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        privilegeLevel: true,
        isActive: true,
        createdAt: true,
        // Include admin-specific data if user is admin
        ...(session.user.privilegeLevel > 0 && {
          jobs: {
            select: {
              id: true,
              title: true,
              status: true,
              applicationCount: true,
              createdAt: true,
            },
            take: 5,
            orderBy: { createdAt: "desc" },
          },
        }),
      },
    });

    if (!user) {
      console.log("❌ User not found in database");
      return new Response(JSON.stringify({ message: "User not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Add computed fields for admin users
    if (user.privilegeLevel > 0) {
      user.isAdmin = true;
      user.canManageJobs = user.privilegeLevel >= 2;
      user.canViewApplications = user.privilegeLevel >= 1;
      user.isSuperAdmin = user.privilegeLevel >= 3;
    }

    return new Response(JSON.stringify(user), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Profile fetch error:", error);
    return new Response(
      JSON.stringify({
        message: "Internal server error",
        error: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function PUT(req) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
    });
  }

  const userId = session.user.id;

  try {
    const body = await req.json();
    const { firstName, lastName, email, phone } = body;

    // Regular users can only update basic info
    const updateData = {
      firstName,
      lastName,
      email,
      phone,
    };

    const updatedUser = await appPrisma.users.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        privilegeLevel: true,
        createdAt: true,
      },
    });

    return new Response(JSON.stringify(updatedUser), { status: 200 });
  } catch (error) {
    console.error("Profile update error:", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}
