import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { appPrisma } from "../../../lib/prisma";
import bcrypt from "bcryptjs";
import { protectRoute } from "../../../lib/middleware/apiProtection";
import { logAuditEvent } from "../../../../lib/auditMiddleware";
import { extractRequestContext } from "../../../lib/auditLog";
import { withCache, cacheKeys, CACHE_DURATION } from "../../../lib/serverCache";

async function getUsers(req) {
  const requestContext = extractRequestContext(req);
  
  // Check if user has permission to view users
  const authResult = await protectRoute("users", "view");
  if (authResult.error) return authResult.error;
  
  const { session } = authResult;

  try {
    // ✅ OPTIMIZED: Simplified users query without expensive _count operations
    const users = await appPrisma.users.findMany({
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
        user_roles: {
          where: { is_active: true },
          select: {
            id: true,
            assigned_at: true,
            roles: {
              select: {
                id: true,
                name: true,
                color: true,
                is_system_role: true,
              },
            },
          },
          orderBy: { assigned_at: "asc" },
        },
        // ✅ REMOVED: Expensive _count operations that slow the query
        // These can be fetched separately if needed for specific users
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Log successful user list access
    await logAuditEvent({
      eventType: "VIEW",
      category: "ADMIN",
      action: "User list accessed",
      description: `Admin user ${session.user.email} accessed user list (${users.length} users)`,
      entityType: "users",
      actorId: session.user.id,
      actorType: "user",
      actorName: session.user.name || session.user.email,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      relatedUserId: session.user.id,
      severity: "info",
      status: "success",
      tags: ["users", "admin", "view", "list_access"],
      metadata: {
        userCount: users.length,
        accessedBy: session.user.email
      }
    }, req).catch(console.error);

    return new Response(JSON.stringify(users), { status: 200 });
  } catch (error) {
    console.error("Users fetch error:", error);
    
    // Log server error during user list access
    await logAuditEvent({
      eventType: "ERROR",
      category: "SYSTEM",
      action: "User list access failed - server error",
      description: `Server error while accessing user list for admin: ${session?.user?.email || 'unknown'}`,
      entityType: "users",
      actorId: session?.user?.id,
      actorType: "user",
      actorName: session?.user?.name || session?.user?.email,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      relatedUserId: session?.user?.id,
      severity: "error",
      status: "failure",
      tags: ["users", "admin", "server_error", "system"],
      metadata: {
        error: error.message,
        stack: error.stack
      }
    }, req).catch(console.error);

    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}

// Export cached version of GET handler
export const GET = withCache(getUsers, 'admin:users', CACHE_DURATION.MEDIUM)

export async function POST(req) {
  const requestContext = extractRequestContext(req);
  
  // Check if user has permission to create users
  const authResult = await protectRoute("users", "create");
  if (authResult.error) return authResult.error;
  
  const { session } = authResult;

  try {
    const body = await req.json();
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      role,
      privilegeLevel,
    } = body;

    // Validation
    if (!email || !password) {
      // Log validation failure
      await logAuditEvent({
        eventType: "ERROR",
        category: "ADMIN",
        action: "User creation failed - missing required fields",
        description: `Admin user creation validation failed for ${session.user.email}`,
        actorId: session.user.id,
        actorType: "user",
        actorName: session.user.name || session.user.email,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        relatedUserId: session.user.id,
        severity: "warning",
        status: "failure",
        tags: ["users", "admin", "create", "validation", "failed"],
        metadata: {
          missingEmail: !email,
          missingPassword: !password,
          attemptedEmail: email || 'not_provided'
        }
      }, req).catch(console.error);

      return new Response(
        JSON.stringify({ message: "Email and password are required" }),
        {
          status: 400,
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      // Log invalid email format
      await logAuditEvent({
        eventType: "ERROR",
        category: "ADMIN",
        action: "User creation failed - invalid email format",
        description: `Admin user creation failed due to invalid email format: ${email}`,
        actorId: session.user.id,
        actorType: "user",
        actorName: session.user.name || session.user.email,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        relatedUserId: session.user.id,
        severity: "warning",
        status: "failure",
        tags: ["users", "admin", "create", "validation", "invalid_email"],
        metadata: {
          attemptedEmail: email
        }
      }, req).catch(console.error);

      return new Response(JSON.stringify({ message: "Invalid email format" }), {
        status: 400,
      });
    }

    // Validate role and privilege level
    const validRoles = ["user", "hr", "admin", "super_admin"];
    if (role && !validRoles.includes(role)) {
      // Log invalid role
      await logAuditEvent({
        eventType: "ERROR",
        category: "ADMIN",
        action: "User creation failed - invalid role",
        description: `Admin user creation failed due to invalid role: ${role} for email: ${email}`,
        actorId: session.user.id,
        actorType: "user",
        actorName: session.user.name || session.user.email,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        relatedUserId: session.user.id,
        severity: "warning",
        status: "failure",
        tags: ["users", "admin", "create", "validation", "invalid_role"],
        metadata: {
          attemptedEmail: email,
          attemptedRole: role,
          validRoles: validRoles
        }
      }, req).catch(console.error);

      return new Response(JSON.stringify({ message: "Invalid role" }), {
        status: 400,
      });
    }

    if (
      privilegeLevel !== undefined &&
      (privilegeLevel < 0 || privilegeLevel > 3)
    ) {
      // Log invalid privilege level
      await logAuditEvent({
        eventType: "ERROR",
        category: "ADMIN",
        action: "User creation failed - invalid privilege level",
        description: `Admin user creation failed due to invalid privilege level: ${privilegeLevel} for email: ${email}`,
        actorId: session.user.id,
        actorType: "user",
        actorName: session.user.name || session.user.email,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        relatedUserId: session.user.id,
        severity: "warning",
        status: "failure",
        tags: ["users", "admin", "create", "validation", "invalid_privilege"],
        metadata: {
          attemptedEmail: email,
          attemptedPrivilegeLevel: privilegeLevel,
          validRange: "0-3"
        }
      }, req).catch(console.error);

      return new Response(
        JSON.stringify({ message: "Privilege level must be between 0 and 3" }),
        {
          status: 400,
        }
      );
    }

    // Check if user already exists
    const existingUser = await appPrisma.users.findUnique({
      where: { email },
    });

    if (existingUser) {
      // Log duplicate user creation attempt
      await logAuditEvent({
        eventType: "ERROR",
        category: "ADMIN",
        action: "User creation failed - duplicate email",
        description: `Admin attempted to create user with existing email: ${email}`,
        entityType: "user",
        entityId: existingUser.id,
        entityName: email,
        actorId: session.user.id,
        actorType: "user",
        actorName: session.user.name || session.user.email,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        relatedUserId: session.user.id,
        severity: "warning",
        status: "failure",
        tags: ["users", "admin", "create", "duplicate", "failed"],
        metadata: {
          attemptedEmail: email,
          existingUserId: existingUser.id,
          createdBy: session.user.email
        }
      }, req).catch(console.error);

      return new Response(
        JSON.stringify({ message: "User with this email already exists" }),
        {
          status: 409,
        }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const newUser = await appPrisma.users.create({
      data: {
        email,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        phone: phone || null,
        role: role || "user",
        privilegeLevel: privilegeLevel !== undefined ? privilegeLevel : 0,
        isActive: true,
      },
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
            jobs: true,
            applications: true,
            saved_jobs: true,
          },
        },
      },
    });

    // Log successful user creation
    await logAuditEvent({
      eventType: "CREATE",
      category: "ADMIN",
      action: "User created successfully by admin",
      description: `Admin ${session.user.email} created new user: ${email}`,
      entityType: "user",
      entityId: newUser.id,
      entityName: email,
      actorId: session.user.id,
      actorType: "user",
      actorName: session.user.name || session.user.email,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      relatedUserId: newUser.id,
      severity: "info",
      status: "success",
      tags: ["users", "admin", "create", "success"],
      metadata: {
        newUserId: newUser.id,
        newUserEmail: email,
        firstName: firstName || null,
        lastName: lastName || null,
        role: role || "user",
        privilegeLevel: privilegeLevel !== undefined ? privilegeLevel : 0,
        createdBy: session.user.email
      }
    }, req).catch(console.error);

    return new Response(JSON.stringify(newUser), { status: 201 });
  } catch (error) {
    console.error("User creation error:", error);

    if (error.code === "P2002") {
      // Log Prisma duplicate constraint error
      await logAuditEvent({
        eventType: "ERROR",
        category: "ADMIN",
        action: "User creation failed - database constraint",
        description: `Admin user creation failed due to database constraint violation`,
        actorId: session?.user?.id,
        actorType: "user",
        actorName: session?.user?.name || session?.user?.email,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        relatedUserId: session?.user?.id,
        severity: "warning",
        status: "failure",
        tags: ["users", "admin", "create", "database_constraint", "failed"],
        metadata: {
          errorCode: error.code,
          error: error.message,
          createdBy: session?.user?.email
        }
      }, req).catch(console.error);

      return new Response(
        JSON.stringify({ message: "User with this email already exists" }),
        {
          status: 409,
        }
      );
    }

    // Log server error during user creation
    await logAuditEvent({
      eventType: "ERROR",
      category: "SYSTEM",
      action: "User creation failed - server error",
      description: `Server error during admin user creation for: ${session?.user?.email || 'unknown'}`,
      actorId: session?.user?.id,
      actorType: "user",
      actorName: session?.user?.name || session?.user?.email,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      relatedUserId: session?.user?.id,
      severity: "error",
      status: "failure",
      tags: ["users", "admin", "create", "server_error", "system"],
      metadata: {
        error: error.message,
        stack: error.stack,
        errorCode: error.code,
        createdBy: session?.user?.email
      }
    }, req).catch(console.error);

    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}
