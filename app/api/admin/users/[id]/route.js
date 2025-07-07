import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { appPrisma } from "../../../../lib/prisma";
import bcrypt from "bcryptjs";

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions);

  // Check if user is super admin (privilege level 3)
  if (
    !session ||
    !session.user.privilegeLevel ||
    session.user.privilegeLevel < 3
  ) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
    });
  }

  const { id } = params;

  try {
    const user = await appPrisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        privilegeLevel: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            createdJobs: true,
            applications: true,
            savedJobs: true,
          },
        },
        createdJobs: {
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true,
          },
          take: 5,
          orderBy: { createdAt: "desc" },
        },
        applications: {
          select: {
            id: true,
            status: true,
            appliedAt: true,
            job: {
              select: {
                title: true,
              },
            },
          },
          take: 5,
          orderBy: { appliedAt: "desc" },
        },
      },
    });

    if (!user) {
      return new Response(JSON.stringify({ message: "User not found" }), {
        status: 404,
      });
    }

    return new Response(JSON.stringify(user), { status: 200 });
  } catch (error) {
    console.error("User fetch error:", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions);

  // Check if user is super admin (privilege level 3)
  if (
    !session ||
    !session.user.privilegeLevel ||
    session.user.privilegeLevel < 3
  ) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
    });
  }

  const { id } = params;

  try {
    const body = await req.json();

    // Extract fields that can be updated
    const updateData = {};

    // Basic profile fields
    const allowedFields = ["firstName", "lastName", "phone", "email"];
    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    // Role and privilege updates
    if (body.role !== undefined) {
      const validRoles = ["user", "hr", "admin", "super_admin"];
      if (!validRoles.includes(body.role)) {
        return new Response(JSON.stringify({ message: "Invalid role" }), {
          status: 400,
        });
      }
      updateData.role = body.role;
    }

    if (body.privilegeLevel !== undefined) {
      if (body.privilegeLevel < 0 || body.privilegeLevel > 3) {
        return new Response(
          JSON.stringify({
            message: "Privilege level must be between 0 and 3",
          }),
          {
            status: 400,
          }
        );
      }
      updateData.privilegeLevel = body.privilegeLevel;
    }

    // Status update
    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive;
    }

    // Password update
    if (body.password !== undefined && body.password !== "") {
      if (body.password.length < 6) {
        return new Response(
          JSON.stringify({ message: "Password must be at least 6 characters" }),
          {
            status: 400,
          }
        );
      }
      updateData.password = await bcrypt.hash(body.password, 12);
    }

    // Always update the updatedAt timestamp
    updateData.updatedAt = new Date();

    // Prevent users from demoting themselves
    if (
      id === session.user.id &&
      body.privilegeLevel !== undefined &&
      body.privilegeLevel < session.user.privilegeLevel
    ) {
      return new Response(
        JSON.stringify({ message: "Cannot reduce your own privilege level" }),
        {
          status: 403,
        }
      );
    }

    // Prevent users from deactivating themselves
    if (id === session.user.id && body.isActive === false) {
      return new Response(
        JSON.stringify({ message: "Cannot deactivate your own account" }),
        {
          status: 403,
        }
      );
    }

    const updatedUser = await appPrisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        privilegeLevel: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            createdJobs: true,
            applications: true,
            savedJobs: true,
          },
        },
      },
    });

    return new Response(JSON.stringify(updatedUser), { status: 200 });
  } catch (error) {
    console.error("User update error:", error);

    if (error.code === "P2025") {
      return new Response(JSON.stringify({ message: "User not found" }), {
        status: 404,
      });
    }

    if (error.code === "P2002") {
      return new Response(JSON.stringify({ message: "Email already exists" }), {
        status: 409,
      });
    }

    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);

  // Check if user is super admin (privilege level 3)
  if (
    !session ||
    !session.user.privilegeLevel ||
    session.user.privilegeLevel < 3
  ) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
    });
  }

  const { id } = params;

  // Prevent users from deleting themselves
  if (id === session.user.id) {
    return new Response(
      JSON.stringify({ message: "Cannot delete your own account" }),
      {
        status: 403,
      }
    );
  }

  try {
    // Check if user exists and get their data
    const userToDelete = await appPrisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            createdJobs: true,
            applications: true,
          },
        },
      },
    });

    if (!userToDelete) {
      return new Response(JSON.stringify({ message: "User not found" }), {
        status: 404,
      });
    }

    // Warn if user has created jobs or applications
    if (userToDelete._count.createdJobs > 0) {
      console.warn(
        `Deleting user ${id} who has created ${userToDelete._count.createdJobs} jobs`
      );
    }

    if (userToDelete._count.applications > 0) {
      console.warn(
        `Deleting user ${id} who has ${userToDelete._count.applications} applications`
      );
    }

    // Delete the user (this will cascade delete related records)
    await appPrisma.user.delete({
      where: { id },
    });

    return new Response(
      JSON.stringify({ message: "User deleted successfully" }),
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("User deletion error:", error);

    if (error.code === "P2025") {
      return new Response(JSON.stringify({ message: "User not found" }), {
        status: 404,
      });
    }

    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}
