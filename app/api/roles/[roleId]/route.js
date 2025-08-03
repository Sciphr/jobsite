import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { userHasPermission } from "@/app/lib/permissions";
import { appPrisma } from "../../../lib/prisma";
import { logAuditEvent } from "../../../../lib/auditMiddleware";
import { extractRequestContext } from "../../../lib/auditLog";

// GET /api/roles/[roleId] - Fetch specific role
export async function GET(request, { params }) {
  const requestContext = extractRequestContext(request);
  let session;
  let roleId;
  
  try {
    session = await getServerSession(authOptions);
    const resolvedParams = await params;
    roleId = resolvedParams.roleId;

    if (!session?.user?.id) {
      // Log unauthorized role details access attempt
      await logAuditEvent({
        eventType: "ERROR",
        category: "SECURITY",
        action: "Unauthorized role details access attempt",
        description: "Role details access attempted without valid session",
        actorType: "user",
        actorName: "unauthenticated",
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        severity: "warning",
        status: "failure",
        tags: ["roles", "access", "unauthorized", "security"]
      }, request).catch(console.error);

      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to view roles
    const canViewRoles = await userHasPermission(
      session.user.id,
      "roles",
      "view"
    );
    if (!canViewRoles) {
      // Log insufficient permissions for role details access
      await logAuditEvent({
        eventType: "ERROR",
        category: "SECURITY",
        action: "Insufficient permissions for role details access",
        description: `User ${session.user.email} attempted to access role details without sufficient permissions`,
        actorId: session.user.id,
        actorType: "user",
        actorName: session.user.name || session.user.email,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        relatedUserId: session.user.id,
        severity: "warning",
        status: "failure",
        tags: ["roles", "access", "permissions", "security"]
      }, request).catch(console.error);

      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Fetch the specific role
    const role = await appPrisma.roles.findUnique({
      where: { id: roleId },
      include: {
        role_permissions: {
          include: {
            permissions: true,
          },
        },
        user_roles: {
          where: {
            is_active: true
          },
          include: {
            users: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              }
            }
          }
        },
        _count: {
          select: {
            user_roles: {
              where: {
                is_active: true
              }
            },
            role_permissions: true,
          },
        },
      },
    });

    if (!role) {
      // Log role not found
      await logAuditEvent({
        eventType: "ERROR",
        category: "DATA",
        action: "Role not found",
        description: `User ${session.user.email} attempted to access non-existent role: ${roleId}`,
        entityType: "role",
        entityId: roleId,
        actorId: session.user.id,
        actorType: "user",
        actorName: session.user.name || session.user.email,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        relatedUserId: session.user.id,
        severity: "info",
        status: "failure",
        tags: ["roles", "access", "not_found"]
      }, request).catch(console.error);

      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // Log successful role details access
    await logAuditEvent({
      eventType: "VIEW",
      category: "ADMIN",
      action: "Role details accessed",
      description: `User ${session.user.email} accessed details for role '${role.name}'`,
      entityType: "role",
      entityId: roleId,
      entityName: role.name,
      actorId: session.user.id,
      actorType: "user",
      actorName: session.user.name || session.user.email,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      relatedUserId: session.user.id,
      severity: "info",
      status: "success",
      tags: ["roles", "access", "view", "admin"],
      metadata: {
        roleId: roleId,
        roleName: role.name,
        permissionCount: role._count?.role_permissions || 0,
        userCount: role._count?.user_roles || 0,
        accessedBy: session.user.email
      }
    }, request).catch(console.error);

    return NextResponse.json({
      success: true,
      role,
    });
  } catch (error) {
    console.error("Error fetching role:", error);
    
    // Log server error during role details access
    await logAuditEvent({
      eventType: "ERROR",
      category: "SYSTEM",
      action: "Role details access failed - server error",
      description: `Server error during role details access for user: ${session?.user?.email || 'unknown'}`,
      entityType: "role",
      entityId: roleId,
      actorId: session?.user?.id,
      actorType: "user",
      actorName: session?.user?.name || session?.user?.email,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      relatedUserId: session?.user?.id,
      severity: "error",
      status: "failure",
      tags: ["roles", "access", "server_error", "system"],
      metadata: {
        error: error.message,
        stack: error.stack,
        roleId: roleId,
        accessedBy: session?.user?.email
      }
    }, request).catch(console.error);
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/roles/[roleId] - Update role
export async function PUT(request, { params }) {
  const requestContext = extractRequestContext(request);
  
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      // Log unauthorized role update attempt
      await logAuditEvent({
        eventType: "ERROR",
        category: "SECURITY",
        action: "Unauthorized role update attempt",
        description: "Role update attempted without valid session",
        actorType: "user",
        actorName: "unauthenticated",
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        severity: "warning",
        status: "failure",
        tags: ["roles", "update", "unauthorized", "security"]
      }, request).catch(console.error);

      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roleId } = await params;

    // Check if user has permission to edit roles
    const canEditRoles = await userHasPermission(
      session.user.id,
      "roles",
      "edit"
    );
    if (!canEditRoles) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Check if role exists
    const existingRole = await appPrisma.roles.findUnique({
      where: { id: roleId },
    });

    if (!existingRole) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    const { name, description, color, is_active, permissions } =
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

    // Check if role name already exists (excluding current role)
    if (name.trim() !== existingRole.name) {
      const duplicateRole = await appPrisma.roles.findFirst({
        where: {
          name: name.trim(),
          id: { not: roleId },
        },
      });

      if (duplicateRole) {
        return NextResponse.json(
          { error: "A role with this name already exists" },
          { status: 400 }
        );
      }
    }

    // For system roles, restrict name changes
    if (existingRole.is_system_role && name.trim() !== existingRole.name) {
      return NextResponse.json(
        { error: "System role names cannot be changed" },
        { status: 400 }
      );
    }

    // Parse permissions and validate they exist
    const permissionKeys = permissions.map((p) => {
      const [resource, action] = p.split(":");
      return { resource, action };
    });

    const validPermissions = await appPrisma.permissions.findMany({
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

    // Update the role with permissions in a transaction
    const updatedRole = await appPrisma.$transaction(async (prisma) => {
      // Update the role basic info
      const role = await prisma.roles.update({
        where: { id: roleId },
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          color: color || "blue",
          is_active: is_active ?? true,
        },
      });

      // Remove existing role-permission associations
      await prisma.role_permissions.deleteMany({
        where: { role_id: roleId },
      });

      // Create new role-permission associations
      const rolePermissions = validPermissions.map((permission) => ({
        role_id: roleId,
        permission_id: permission.id,
      }));

      await prisma.role_permissions.createMany({
        data: rolePermissions,
      });

      // Return role with permissions and counts
      return await prisma.roles.findUnique({
        where: { id: roleId },
        include: {
          role_permissions: {
            include: {
              permissions: true,
            },
          },
          _count: {
            select: {
              user_roles: {
                where: {
                  is_active: true,
                },
              },
              role_permissions: true,
            },
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      role: updatedRole,
      message: "Role updated successfully",
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

    const { roleId } = await params;

    // Check if user has permission to delete roles
    const canDeleteRoles = await userHasPermission(
      session.user.id,
      "roles",
      "delete"
    );
    if (!canDeleteRoles) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Check if role exists
    const existingRole = await appPrisma.roles.findUnique({
      where: { id: roleId },
      include: {
        _count: {
          select: {
            user_roles: {
              where: {
                is_active: true,
              },
            },
          },
        },
      },
    });

    if (!existingRole) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // Prevent deletion of system roles
    if (existingRole.is_system_role) {
      return NextResponse.json(
        {
          error: "System roles cannot be deleted",
        },
        { status: 400 }
      );
    }

    // Check if role has users assigned
    if (existingRole._count.user_roles > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete role. ${existingRole._count.user_roles} user${existingRole._count.user_roles !== 1 ? "s are" : " is"} currently assigned to this role. Please reassign ${existingRole._count.user_roles === 1 ? "them" : "them"} to another role first.`,
        },
        { status: 400 }
      );
    }

    // Delete the role and its permissions in a transaction
    await appPrisma.$transaction(async (prisma) => {
      // Delete role-permission associations
      await prisma.role_permissions.deleteMany({
        where: { role_id: roleId },
      });

      // Delete the role
      await prisma.roles.delete({
        where: { id: roleId },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Role deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting role:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
