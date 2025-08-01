// app/api/auth/register/route.js
import { appPrisma } from "../../../lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { logAuditEvent } from "../../../../lib/auditMiddleware";
import { extractRequestContext } from "../../../lib/auditLog";

//const prisma = new prismaClient();

export async function POST(request) {
  const requestContext = extractRequestContext(request);
  
  try {
    const { firstName, lastName, email, password } = await request.json();

    if (!firstName || !lastName || !email || !password) {
      // Log failed registration - missing fields
      await logAuditEvent({
        eventType: "CREATE",
        category: "USER",
        action: "Failed registration attempt - missing required fields",
        description: `Registration failed due to missing required fields for email: ${email || 'unknown'}`,
        actorType: "user",
        actorName: email || "unknown",
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        severity: "warning",
        status: "failure",
        tags: ["authentication", "registration", "failed", "validation"],
        metadata: {
          missingFields: {
            firstName: !firstName,
            lastName: !lastName,
            email: !email,
            password: !password
          }
        }
      }, request).catch(console.error);

      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      // Log failed registration - weak password
      await logAuditEvent({
        eventType: "CREATE",
        category: "USER",
        action: "Failed registration attempt - password too short",
        description: `Registration failed due to weak password for email: ${email}`,
        actorType: "user",
        actorName: email,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        severity: "warning",
        status: "failure",
        tags: ["authentication", "registration", "failed", "password_policy"],
        metadata: {
          passwordLength: password.length,
          minimumRequired: 6
        }
      }, request).catch(console.error);

      return NextResponse.json(
        { message: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await appPrisma.users.findUnique({
      where: { email },
    });

    if (existingUser) {
      // Log failed registration - user already exists
      await logAuditEvent({
        eventType: "CREATE",
        category: "USER",
        action: "Failed registration attempt - user already exists",
        description: `Registration failed because user already exists for email: ${email}`,
        actorType: "user",
        actorName: email,
        entityType: "user",
        entityId: existingUser.id,
        entityName: email,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        relatedUserId: existingUser.id,
        severity: "warning",
        status: "failure",
        tags: ["authentication", "registration", "failed", "duplicate_user"]
      }, request).catch(console.error);

      return NextResponse.json(
        { message: "User already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await appPrisma.users.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
      },
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    // Log successful registration
    await logAuditEvent({
      eventType: "CREATE",
      category: "USER",
      action: "User registered successfully",
      description: `New user account created for email: ${email}`,
      entityType: "user",
      entityId: user.id,
      entityName: email,
      actorId: user.id,
      actorType: "user",
      actorName: `${firstName} ${lastName}`.trim(),
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      relatedUserId: user.id,
      severity: "info",
      status: "success",
      tags: ["authentication", "registration", "success", "user_creation"],
      metadata: {
        userInfo: {
          firstName,
          lastName,
          email,
          userId: user.id
        }
      }
    }, request).catch(console.error);

    return NextResponse.json(
      {
        message: "User created successfully",
        user: userWithoutPassword,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    
    // Log server error during registration
    await logAuditEvent({
      eventType: "ERROR",
      category: "USER",
      action: "Registration failed - server error",
      description: `Registration failed due to server error: ${error.message}`,
      actorType: "user",
      actorName: "unknown",
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      severity: "error",
      status: "failure",
      tags: ["authentication", "registration", "failed", "server_error"],
      metadata: {
        error: error.message,
        stack: error.stack
      }
    }, request).catch(console.error);

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
