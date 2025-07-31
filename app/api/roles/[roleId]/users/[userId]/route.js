import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { userHasPermission, ensureUserHasDefaultRole, wouldBeLastRole } from "@/app/lib/permissions";
import { appPrisma } from "../../../../../lib/prisma";

// POST /api/roles/[roleId]/users/[userId] - Assign user to role (many-to-many)
export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roleId, userId } = await params;

    // Check if user has permission to assign roles
    const canAssignRoles = await userHasPermission(
      session.user.id,
      "roles",
      "assign"
    );
    if (!canAssignRoles) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Check if role exists and is active
    const role = await appPrisma.roles.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    if (!role.is_active) {
      return NextResponse.json(
        { error: "Cannot assign users to inactive roles" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await appPrisma.users.findUnique({
      where: { id: userId },
      include: {
        user_roles: {
          // Include both active and inactive to check for reactivation
          include: {
            roles: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user is already assigned to this role (active)
    const existingActiveAssignment = user.user_roles.find(
      (ur) => ur.role_id === roleId && ur.is_active
    );
    if (existingActiveAssignment) {
      return NextResponse.json(
        {
          error: "User is already assigned to this role",
        },
        { status: 400 }
      );
    }

    // Check if there's an inactive assignment we can reactivate
    const existingInactiveAssignment = user.user_roles.find(
      (ur) => ur.role_id === roleId && !ur.is_active
    );

    let userRole;
    if (existingInactiveAssignment) {
      // Reactivate existing inactive assignment
      userRole = await appPrisma.user_roles.update({
        where: { id: existingInactiveAssignment.id },
        data: {
          is_active: true,
          assigned_at: new Date(),
          assigned_by: session.user.id,
        },
        include: {
          roles: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      });
    } else {
      // Create new user-role assignment
      userRole = await appPrisma.user_roles.create({
        data: {
          user_id: userId,
          role_id: roleId,
          assigned_by: session.user.id,
          is_active: true,
        },
        include: {
          roles: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      });
    }

    // Get updated user with all roles
    const updatedUser = await appPrisma.users.findUnique({
      where: { id: userId },
      include: {
        user_roles: {
          where: { is_active: true },
          include: {
            roles: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
    });

    const currentRoleNames = user.user_roles
      .filter((ur) => ur.is_active)
      .map((ur) => ur.roles.name)
      .join(", ");

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: `User ${user.firstName || user.email} assigned to role ${role.name}${currentRoleNames ? ` (also has: ${currentRoleNames})` : ""}`,
    });
  } catch (error) {
    console.error("Error assigning user to role:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/roles/[roleId]/users/[userId] - Remove user from role (many-to-many)
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roleId, userId } = await params;

    // Check if user has permission to assign roles
    const canAssignRoles = await userHasPermission(
      session.user.id,
      "roles",
      "assign"
    );
    if (!canAssignRoles) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Check if role exists
    const role = await appPrisma.roles.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // Check if user exists and is assigned to this role
    const user = await appPrisma.users.findUnique({
      where: { id: userId },
      include: {
        user_roles: {
          where: { is_active: true },
          include: {
            roles: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find the specific user-role assignment
    const userRoleAssignment = user.user_roles.find(
      (ur) => ur.role_id === roleId
    );
    if (!userRoleAssignment) {
      return NextResponse.json(
        {
          error: "User is not assigned to this role",
        },
        { status: 400 }
      );
    }

    // Check if this would be the user's last role
    const isLastRole = await wouldBeLastRole(userId, roleId);
    let fallbackMessage = "";

    // Remove the user-role assignment (set inactive or delete)
    await appPrisma.user_roles.update({
      where: { id: userRoleAssignment.id },
      data: { is_active: false },
    });

    // If this was their last role, automatically assign the default User role
    if (isLastRole) {
      const fallbackResult = await ensureUserHasDefaultRole(userId);
      if (fallbackResult.success && fallbackResult.roleAssigned) {
        fallbackMessage = ` (automatically assigned to '${fallbackResult.defaultRole.name}' role as fallback)`;
      } else if (!fallbackResult.success) {
        // If we can't assign default role, this is a critical error
        return NextResponse.json(
          {
            error: `Failed to assign default role after removing last role: ${fallbackResult.message}`,
          },
          { status: 500 }
        );
      }
    }

    // Get updated user with remaining roles
    const updatedUser = await appPrisma.users.findUnique({
      where: { id: userId },
      include: {
        user_roles: {
          where: { is_active: true },
          include: {
            roles: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
    });

    const remainingRoleNames = updatedUser.user_roles
      .map((ur) => ur.roles.name)
      .join(", ");

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: `User ${user.firstName || user.email} removed from role ${role.name}${remainingRoleNames ? ` (still has: ${remainingRoleNames})` : ""}${fallbackMessage}`,
      wasLastRole: isLastRole,
      fallbackApplied: isLastRole && fallbackMessage !== "",
    });
  } catch (error) {
    console.error("Error removing user from role:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
