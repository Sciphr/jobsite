import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { userHasPermission } from "@/app/lib/permissions";
import { appPrisma } from "@/lib/prisma";

// POST /api/roles/[roleId]/users/[userId] - Assign user to role
export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roleId, userId } = params;

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
    const role = await appPrisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    if (!role.isActive) {
      return NextResponse.json(
        { error: "Cannot assign users to inactive roles" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await appPrisma.users.findUnique({
      where: { id: userId },
      include: {
        userRole: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user is already assigned to this role
    if (user.roleId === roleId) {
      return NextResponse.json(
        {
          error: "User is already assigned to this role",
        },
        { status: 400 }
      );
    }

    // Update user's role
    const updatedUser = await appPrisma.users.update({
      where: { id: userId },
      data: { roleId: roleId },
      include: {
        userRole: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: `User ${user.name || user.email} assigned to role ${role.name}${user.userRole ? ` (previously ${user.userRole.name})` : ""}`,
    });
  } catch (error) {
    console.error("Error assigning user to role:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/roles/[roleId]/users/[userId] - Remove user from role
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roleId, userId } = params;

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
    const role = await appPrisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // Check if user exists and is assigned to this role
    const user = await appPrisma.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.roleId !== roleId) {
      return NextResponse.json(
        {
          error: "User is not assigned to this role",
        },
        { status: 400 }
      );
    }

    // Find the default "User" role to assign when removing from current role
    const defaultRole = await appPrisma.role.findFirst({
      where: {
        name: "User",
        isSystem: true,
      },
    });

    if (!defaultRole) {
      return NextResponse.json(
        {
          error: "Default user role not found. Cannot remove user from role.",
        },
        { status: 500 }
      );
    }

    // Update user's role to default
    const updatedUser = await appPrisma.users.update({
      where: { id: userId },
      data: { roleId: defaultRole.id },
      include: {
        userRole: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: `User ${user.name || user.email} removed from role ${role.name} and assigned to ${defaultRole.name}`,
    });
  } catch (error) {
    console.error("Error removing user from role:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
