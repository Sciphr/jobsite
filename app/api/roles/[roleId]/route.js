import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { userHasPermission } from "@/app/lib/permissions";
import { appPrisma } from "@/lib/prisma";

// GET /api/roles/[roleId] - Fetch specific role
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roleId } = params;

    // Check if user has permission to view roles
    const canViewRoles = await userHasPermission(session.user.id, "roles", "view");
    if (!canViewRoles) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Fetch the specific role
    const role = await appPrisma.role.findUnique({
      where: { id: roleId },
      include: {
        rolePermissions: {
          include: {
            permission: true
          }
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            users: true,
            rolePermissions: true
          }
        }
      }
    });

    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      role
    });

  } catch (error) {
    console.error("Error fetching role:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/roles/[roleId] - Update role
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roleId } = params;

    // Check if user has permission to edit roles
    const canEditRoles = await userHasPermission(session.user.id, "roles", "edit");
    if (!canEditRoles) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Check if role exists
    const existingRole = await appPrisma.role.findUnique({
      where: { id: roleId }
    });

    if (!existingRole) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    const { name, description, color, isActive, permissions } = await request.json();

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Role name is required" }, { status: 400 });
    }

    if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
      return NextResponse.json({ error: "At least one permission is required" }, { status: 400 });
    }

    // Check if role name already exists (excluding current role)
    if (name.trim() !== existingRole.name) {
      const duplicateRole = await appPrisma.role.findFirst({
        where: {
          name: name.trim(),
          id: { not: roleId }
        }
      });

      if (duplicateRole) {
        return NextResponse.json({ error: "A role with this name already exists" }, { status: 400 });
      }
    }

    // For system roles, restrict name changes
    if (existingRole.isSystemRole && name.trim() !== existingRole.name) {
      return NextResponse.json({ error: "System role names cannot be changed" }, { status: 400 });
    }

    // Parse permissions and validate they exist
    const permissionKeys = permissions.map(p => {
      const [resource, action] = p.split(':');
      return { resource, action };
    });

    const validPermissions = await appPrisma.permission.findMany({
      where: {
        OR: permissionKeys
      }
    });

    if (validPermissions.length !== permissionKeys.length) {
      return NextResponse.json({ error: "Some permissions are invalid" }, { status: 400 });
    }

    // Update the role with permissions in a transaction
    const updatedRole = await appPrisma.$transaction(async (prisma) => {
      // Update the role basic info
      const role = await prisma.role.update({
        where: { id: roleId },
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          color: color || "blue",
          isActive: isActive ?? true
        }
      });

      // Remove existing role-permission associations
      await prisma.rolePermission.deleteMany({
        where: { roleId: roleId }
      });

      // Create new role-permission associations
      const rolePermissions = validPermissions.map(permission => ({
        roleId: roleId,
        permissionId: permission.id
      }));

      await prisma.rolePermission.createMany({
        data: rolePermissions
      });

      // Return role with permissions and counts
      return await prisma.role.findUnique({
        where: { id: roleId },
        include: {
          rolePermissions: {
            include: {
              permission: true
            }
          },
          _count: {
            select: {
              users: true,
              rolePermissions: true
            }
          }
        }
      });
    });

    return NextResponse.json({
      success: true,
      role: updatedRole,
      message: "Role updated successfully"
    });

  } catch (error) {
    console.error("Error updating role:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/roles/[roleId] - Delete role
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roleId } = params;

    // Check if user has permission to delete roles
    const canDeleteRoles = await userHasPermission(session.user.id, "roles", "delete");
    if (!canDeleteRoles) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Check if role exists
    const existingRole = await appPrisma.role.findUnique({
      where: { id: roleId },
      include: {
        _count: {
          select: {
            users: true
          }
        }
      }
    });

    if (!existingRole) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // Prevent deletion of system roles
    if (existingRole.isSystemRole) {
      return NextResponse.json({ 
        error: "System roles cannot be deleted" 
      }, { status: 400 });
    }

    // Check if role has users assigned
    if (existingRole._count.users > 0) {
      return NextResponse.json({ 
        error: `Cannot delete role. ${existingRole._count.users} user${existingRole._count.users !== 1 ? 's are' : ' is'} currently assigned to this role. Please reassign ${existingRole._count.users === 1 ? 'them' : 'them'} to another role first.`
      }, { status: 400 });
    }

    // Delete the role and its permissions in a transaction
    await appPrisma.$transaction(async (prisma) => {
      // Delete role-permission associations
      await prisma.rolePermission.deleteMany({
        where: { roleId: roleId }
      });

      // Delete the role
      await prisma.role.delete({
        where: { id: roleId }
      });
    });

    return NextResponse.json({
      success: true,
      message: "Role deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting role:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}