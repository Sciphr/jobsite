import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { userHasPermission } from "@/app/lib/permissions";
import { appPrisma } from "@/lib/prisma";

// GET /api/roles/[roleId]/users - Get users for role assignment
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roleId } = params;

    // Check if user has permission to view roles and users
    const canViewRoles = await userHasPermission(
      session.user.id,
      "roles",
      "view"
    );
    const canViewUsers = await userHasPermission(
      session.user.id,
      "users",
      "view"
    );

    if (!canViewRoles || !canViewUsers) {
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

    // Get all users with their current roles
    const allUsers = await appPrisma.users.findMany({
      include: {
        userRole: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
      orderBy: [{ name: "asc" }, { email: "asc" }],
    });

    // Separate users assigned to this role vs available users
    const assignedUsers = allUsers.filter((user) => user.roleId === roleId);
    const availableUsers = allUsers.filter((user) => user.roleId !== roleId);

    return NextResponse.json({
      success: true,
      allUsers,
      assignedUsers,
      availableUsers,
      role,
    });
  } catch (error) {
    console.error("Error fetching role users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
