import { NextResponse } from "next/server";
import { protectRoute } from "../../lib/middleware/apiProtection";
import { appPrisma } from "../../lib/prisma";
import { withCache, cacheKeys, CACHE_DURATION } from "../../lib/serverCache";
import { logAuditEvent } from "../../../lib/auditMiddleware";
import { extractRequestContext } from "../../lib/auditLog";

// GET /api/roles - Fetch all roles (OPTIMIZED)
async function getRoles(request) {
  const requestContext = extractRequestContext(request);
  
  try {
    // ✅ FAST: Use new permission system instead of slow userHasPermission
    const authResult = await protectRoute("roles", "view");
    if (authResult.error) return authResult.error;
    
    const { session } = authResult;

    // ✅ OPTIMIZED: Fetch roles with streamlined query
    const roles = await appPrisma.roles.findMany({
      include: {
        role_permissions: {
          include: {
            permissions: {
              select: {
                id: true,
                resource: true,
                action: true,
                description: true,
                category: true
              }
            },
          },
        },
        _count: {
          select: {
            user_roles: {
              where: { is_active: true }
            },
            role_permissions: true,
          },
        },
      },
      orderBy: [
        { is_system_role: "desc" },
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

// Export cached version of GET handler  
export const GET = withCache(getRoles, cacheKeys.rolesList, CACHE_DURATION.LONG)

// POST /api/roles - Create a new role
export async function POST(request) {
  const requestContext = extractRequestContext(request);
  
  try {
    // Check if user has permission to create roles  
    const authResult = await protectRoute("roles", "create");
    if (authResult.error) return authResult.error;
    
    const { session } = authResult;

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
