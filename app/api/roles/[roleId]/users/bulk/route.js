import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { userHasPermission } from "@/app/lib/permissions";
import { appPrisma } from "@/lib/prisma";

// POST /api/roles/[roleId]/users/bulk - Bulk assign users to role
export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roleId } = params;
    const { userIds } = await request.json();

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

    // Validate input
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: "User IDs array is required" },
        { status: 400 }
      );
    }

    if (userIds.length > 100) {
      return NextResponse.json(
        { error: "Cannot assign more than 100 users at once" },
        { status: 400 }
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

    // Check if all users exist
    const users = await appPrisma.users.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        name: true,
        email: true,
        roleId: true,
      },
    });

    if (users.length !== userIds.length) {
      const foundIds = users.map((u) => u.id);
      const missingIds = userIds.filter((id) => !foundIds.includes(id));
      return NextResponse.json(
        {
          error: `Some users not found: ${missingIds.join(", ")}`,
        },
        { status: 404 }
      );
    }

    // Filter out users already assigned to this role
    const usersToUpdate = users.filter((user) => user.roleId !== roleId);

    if (usersToUpdate.length === 0) {
      return NextResponse.json({
        message: "All specified users are already assigned to this role",
        assignedCount: 0,
        skippedCount: users.length,
      });
    }

    // Bulk update users' roles
    const updateResult = await appPrisma.users.updateMany({
      where: {
        id: { in: usersToUpdate.map((u) => u.id) },
      },
      data: {
        roleId: roleId,
      },
    });

    const skippedCount = users.length - usersToUpdate.length;

    return NextResponse.json({
      success: true,
      message: `Successfully assigned ${updateResult.count} user${updateResult.count !== 1 ? "s" : ""} to role ${role.name}${skippedCount > 0 ? `. ${skippedCount} user${skippedCount !== 1 ? "s were" : " was"} already assigned.` : ""}`,
      assignedCount: updateResult.count,
      skippedCount: skippedCount,
      totalRequested: userIds.length,
    });
  } catch (error) {
    console.error("Error bulk assigning users to role:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/roles/[roleId]/users/bulk - Bulk remove users from role
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roleId } = params;
    const { userIds } = await request.json();

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

    // Validate input
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: "User IDs array is required" },
        { status: 400 }
      );
    }

    if (userIds.length > 100) {
      return NextResponse.json(
        { error: "Cannot remove more than 100 users at once" },
        { status: 400 }
      );
    }

    // Check if role exists
    const role = await appPrisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
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
          error: "Default user role not found. Cannot remove users from role.",
        },
        { status: 500 }
      );
    }

    // Check if all users exist and are assigned to this role
    const users = await appPrisma.users.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        name: true,
        email: true,
        roleId: true,
      },
    });

    if (users.length !== userIds.length) {
      const foundIds = users.map((u) => u.id);
      const missingIds = userIds.filter((id) => !foundIds.includes(id));
      return NextResponse.json(
        {
          error: `Some users not found: ${missingIds.join(", ")}`,
        },
        { status: 404 }
      );
    }

    // Filter users that are actually assigned to this role
    const usersToUpdate = users.filter((user) => user.roleId === roleId);

    if (usersToUpdate.length === 0) {
      return NextResponse.json({
        message: "None of the specified users are assigned to this role",
        removedCount: 0,
        skippedCount: users.length,
      });
    }

    // Bulk update users' roles to default
    const updateResult = await appPrisma.users.updateMany({
      where: {
        id: { in: usersToUpdate.map((u) => u.id) },
      },
      data: {
        roleId: defaultRole.id,
      },
    });

    const skippedCount = users.length - usersToUpdate.length;

    return NextResponse.json({
      success: true,
      message: `Successfully removed ${updateResult.count} user${updateResult.count !== 1 ? "s" : ""} from role ${role.name} and assigned to ${defaultRole.name}${skippedCount > 0 ? `. ${skippedCount} user${skippedCount !== 1 ? "s were" : " was"} not assigned to this role.` : ""}`,
      removedCount: updateResult.count,
      skippedCount: skippedCount,
      totalRequested: userIds.length,
    });
  } catch (error) {
    console.error("Error bulk removing users from role:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
