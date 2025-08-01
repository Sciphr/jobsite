import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { userHasPermission } from "@/app/lib/permissions";
import { appPrisma } from "../../lib/prisma";
import { logAuditEvent, extractRequestContext } from "../../../lib/auditMiddleware";

// GET /api/roles - Fetch all roles
export async function GET(request) {
  const requestContext = extractRequestContext(request);
  
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      // Log unauthorized access attempt
      await logAuditEvent({
        eventType: "ERROR",
        category: "SECURITY",
        action: "Unauthorized role access attempt",
        description: "Attempted to access roles without valid session",
        actorType: "user",
        actorName: "unauthenticated",
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        severity: "warning",
        status: "failure",
        tags: ["roles", "unauthorized", "security", "access_denied"]
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
      // Log insufficient permissions
      await logAuditEvent({
        eventType: "ERROR",
        category: "SECURITY",
        action: "Insufficient permissions for role access",
        description: `User ${session.user.email} attempted to view roles without proper permissions`,
        entityType: "user",
        entityId: session.user.id,
        entityName: session.user.email,
        actorId: session.user.id,
        actorType: "user",
        actorName: session.user.name || session.user.email,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        relatedUserId: session.user.id,
        severity: "warning",
        status: "failure",
        tags: ["roles", "insufficient_permissions", "access_denied"]
      }, request).catch(console.error);

      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Fetch all roles with their permissions and user counts
    const roles = await appPrisma.roles.findMany({
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
                is_active: true
              }
            },
            role_permissions: true,
          },
        },
      },
      orderBy: [
        { is_system_role: "desc" }, // System roles first
        { name: "asc" },
      ],
    });

    // Log successful role access
    await logAuditEvent({
      eventType: "VIEW",
      category: "ADMIN",
      action: "Roles accessed successfully",
      description: `User ${session.user.email} accessed roles list`,
      entityType: "roles",
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
        rolesCount: roles.length,
        accessedBy: session.user.email
      }
    }, request).catch(console.error);

    return NextResponse.json({
      success: true,
      roles,
    });
  } catch (error) {
    console.error("Error fetching roles:", error);
    
    // Log server error
    await logAuditEvent({
      eventType: "ERROR",
      category: "SYSTEM",
      action: "Role access failed - server error",
      description: `Server error while accessing roles for user: ${session?.user?.email || 'unknown'}`,
      entityType: "roles",
      actorId: session?.user?.id,
      actorType: "user",
      actorName: session?.user?.name || session?.user?.email,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      relatedUserId: session?.user?.id,
      severity: "error",
      status: "failure",
      tags: ["roles", "server_error", "system"],
      metadata: {
        error: error.message,
        stack: error.stack
      }
    }, request).catch(console.error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/roles - Create a new role
export async function POST(request) {
  const requestContext = extractRequestContext(request);
  
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      // Log unauthorized role creation attempt
      await logAuditEvent({
        eventType: "ERROR",
        category: "SECURITY",
        action: "Unauthorized role creation attempt",
        description: "Attempted to create role without valid session",
        actorType: "user",
        actorName: "unauthenticated",
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        severity: "warning",
        status: "failure",
        tags: ["roles", "create", "unauthorized", "security"]
      }, request).catch(console.error);

      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to create roles
    const canCreateRoles = await userHasPermission(
      session.user.id,
      "roles",
      "create"
    );
    if (!canCreateRoles) {
      // Log insufficient permissions for role creation
      await logAuditEvent({
        eventType: "ERROR",
        category: "SECURITY",
        action: "Insufficient permissions for role creation",
        description: `User ${session.user.email} attempted to create role without proper permissions`,
        entityType: "user",
        entityId: session.user.id,
        entityName: session.user.email,
        actorId: session.user.id,
        actorType: "user",
        actorName: session.user.name || session.user.email,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        relatedUserId: session.user.id,
        severity: "warning",
        status: "failure",
        tags: ["roles", "create", "insufficient_permissions", "access_denied"]
      }, request).catch(console.error);

      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { name, description, color, isActive, permissions } =
      await request.json();

    // Validate required fields
    if (!name || !name.trim()) {
      // Log validation failure
      await logAuditEvent({
        eventType: "ERROR",
        category: "ADMIN",
        action: "Role creation failed - missing name",
        description: `Role creation validation failed for user: ${session.user.email}`,
        actorId: session.user.id,
        actorType: "user",
        actorName: session.user.name || session.user.email,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        relatedUserId: session.user.id,
        severity: "warning",
        status: "failure",
        tags: ["roles", "create", "validation", "failed"]
      }, request).catch(console.error);

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
      // Log validation failure
      await logAuditEvent({
        eventType: "ERROR",
        category: "ADMIN",
        action: "Role creation failed - missing permissions",
        description: `Role creation validation failed due to missing permissions for user: ${session.user.email}`,
        actorId: session.user.id,
        actorType: "user",
        actorName: session.user.name || session.user.email,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        relatedUserId: session.user.id,
        severity: "warning",
        status: "failure",
        tags: ["roles", "create", "validation", "failed", "permissions"],
        metadata: {
          attemptedRoleName: name?.trim() || 'unnamed'
        }
      }, request).catch(console.error);

      return NextResponse.json(
        { error: "At least one permission is required" },
        { status: 400 }
      );
    }

    // Check if role name already exists
    const existingRole = await appPrisma.roles.findFirst({
      where: {
        name: name.trim(),
      },
    });

    if (existingRole) {
      // Log duplicate role name attempt
      await logAuditEvent({
        eventType: "ERROR",
        category: "ADMIN",
        action: "Role creation failed - duplicate name",
        description: `Role creation failed because name '${name.trim()}' already exists`,
        entityType: "role",
        entityId: existingRole.id,
        entityName: name.trim(),
        actorId: session.user.id,
        actorType: "user", 
        actorName: session.user.name || session.user.email,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        relatedUserId: session.user.id,
        severity: "warning",
        status: "failure",
        tags: ["roles", "create", "duplicate", "failed"],
        metadata: {
          attemptedRoleName: name.trim(),
          existingRoleId: existingRole.id
        }
      }, request).catch(console.error);

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

    const validPermissions = await appPrisma.permissions.findMany({
      where: {
        OR: permissionKeys,
      },
    });

    if (validPermissions.length !== permissionKeys.length) {
      // Log invalid permissions
      await logAuditEvent({
        eventType: "ERROR",
        category: "ADMIN",
        action: "Role creation failed - invalid permissions",
        description: `Role creation failed due to invalid permissions for role: ${name.trim()}`,
        actorId: session.user.id,
        actorType: "user",
        actorName: session.user.name || session.user.email,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        relatedUserId: session.user.id,
        severity: "warning",
        status: "failure",
        tags: ["roles", "create", "validation", "invalid_permissions"],
        metadata: {
          attemptedRoleName: name.trim(),
          requestedPermissions: permissions,
          validPermissionCount: validPermissions.length,
          requestedPermissionCount: permissionKeys.length
        }
      }, request).catch(console.error);

      return NextResponse.json(
        { error: "Some permissions are invalid" },
        { status: 400 }
      );
    }

    // Create the role with permissions in a transaction
    const newRole = await appPrisma.$transaction(async (prisma) => {
      // Create the role
      const role = await prisma.roles.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          color: color || "#6b7280",
          is_active: isActive ?? true,
          is_system_role: false,
          created_by: session.user.id,
        },
      });

      // Create role-permission associations
      const rolePermissions = validPermissions.map((permission) => ({
        role_id: role.id,
        permission_id: permission.id,
        granted_by: session.user.id,
      }));

      await prisma.role_permissions.createMany({
        data: rolePermissions,
      });

      // Return role with permissions and counts
      return await prisma.roles.findUnique({
        where: { id: role.id },
        include: {
          role_permissions: {
            include: {
              permissions: true,
            },
          },
          _count: {
            select: {
              user_roles: true,
              role_permissions: true,
            },
          },
        },
      });
    });

    // Log successful role creation
    await logAuditEvent({
      eventType: "CREATE",
      category: "ADMIN",
      action: "Role created successfully",
      description: `New role '${name.trim()}' created with ${permissions.length} permissions`,
      entityType: "role",
      entityId: newRole.id,
      entityName: name.trim(),
      actorId: session.user.id,
      actorType: "user",
      actorName: session.user.name || session.user.email,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      relatedUserId: session.user.id,
      severity: "info",
      status: "success",
      tags: ["roles", "create", "success", "admin"],
      metadata: {
        roleId: newRole.id,
        roleName: name.trim(),
        description: description?.trim() || null,
        color: color || "#6b7280",
        isActive: isActive ?? true,
        permissionCount: permissions.length,
        permissions: permissions,
        createdBy: session.user.email
      }
    }, request).catch(console.error);

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
    
    // Log server error during role creation
    await logAuditEvent({
      eventType: "ERROR",
      category: "SYSTEM",
      action: "Role creation failed - server error",
      description: `Server error during role creation for user: ${session?.user?.email || 'unknown'}`,
      actorId: session?.user?.id,
      actorType: "user",
      actorName: session?.user?.name || session?.user?.email,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      relatedUserId: session?.user?.id,
      severity: "error",
      status: "failure",
      tags: ["roles", "create", "server_error", "system"],
      metadata: {
        error: error.message,
        stack: error.stack,
        attemptedRoleName: name?.trim() || 'unknown'
      }
    }, request).catch(console.error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
