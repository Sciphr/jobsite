import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { userHasPermission } from "@/app/lib/permissions";
import { appPrisma } from "../../lib/prisma";

// GET /api/roles - Fetch all roles
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to view roles
    const canViewRoles = await userHasPermission(
      session.user.id,
      "roles",
      "view"
    );
    if (!canViewRoles) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Fetch all roles with their permissions and user counts
    const roles = await appPrisma.role.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            users: true,
            rolePermissions: true,
          },
        },
      },
      orderBy: [
        { isSystemRole: "desc" }, // System roles first
        { name: "asc" },
      ],
    });

    return NextResponse.json({
      success: true,
      roles,
    });
  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/roles - Create a new role
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to create roles
    const canCreateRoles = await userHasPermission(
      session.user.id,
      "roles",
      "create"
    );
    if (!canCreateRoles) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { name, description, color, isActive, permissions } =
      await request.json();

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Role name is required" },
        { status: 400 }
      );
    }

    if (
      !permissions ||
      !Array.isArray(permissions) ||
      permissions.length === 0
    ) {
      return NextResponse.json(
        { error: "At least one permission is required" },
        { status: 400 }
      );
    }

    // Check if role name already exists
    const existingRole = await appPrisma.role.findFirst({
      where: {
        name: name.trim(),
      },
    });

    if (existingRole) {
      return NextResponse.json(
        { error: "A role with this name already exists" },
        { status: 400 }
      );
    }

    // Parse permissions and validate they exist
    const permissionKeys = permissions.map((p) => {
      const [resource, action] = p.split(":");
      return { resource, action };
    });

    const validPermissions = await appPrisma.permission.findMany({
      where: {
        OR: permissionKeys,
      },
    });

    if (validPermissions.length !== permissionKeys.length) {
      return NextResponse.json(
        { error: "Some permissions are invalid" },
        { status: 400 }
      );
    }

    // Create the role with permissions in a transaction
    const newRole = await appPrisma.$transaction(async (prisma) => {
      // Create the role
      const role = await prisma.role.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          color: color || "blue",
          isActive: isActive ?? true,
          isSystemRole: false,
        },
      });

      // Create role-permission associations
      const rolePermissions = validPermissions.map((permission) => ({
        roleId: role.id,
        permissionId: permission.id,
      }));

      await prisma.rolePermission.createMany({
        data: rolePermissions,
      });

      // Return role with permissions and counts
      return await prisma.role.findUnique({
        where: { id: role.id },
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
          _count: {
            select: {
              users: true,
              rolePermissions: true,
            },
          },
        },
      });
    });

    return NextResponse.json(
      {
        success: true,
        role: newRole,
        message: "Role created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating role:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
