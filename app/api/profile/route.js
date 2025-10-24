// app/api/profile/route.js
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { appPrisma } from "../../lib/prisma";
import { logAuditEvent } from "../../../lib/auditMiddleware";
import { extractRequestContext } from "../../lib/auditLog";

export async function GET(req) {
  console.log("🔍 Profile API GET request started");

  const session = await getServerSession(authOptions);

  if (!session) {
    console.log("❌ No session found, returning unauthorized");
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userId = session.user.id;

  try {
    const user = await appPrisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        privilegeLevel: true,
        isActive: true,
        createdAt: true,
        linkedin_url: true,
        portfolio_url: true,
        facebook_url: true,
        twitter_url: true,
        instagram_url: true,
        bluesky_url: true,
        // Include admin-specific data if user is admin
        ...(session.user.privilegeLevel > 0 && {
          jobs: {
            select: {
              id: true,
              title: true,
              status: true,
              applicationCount: true,
              createdAt: true,
            },
            take: 5,
            orderBy: { createdAt: "desc" },
          },
        }),
      },
    });

    if (!user) {
      console.log("❌ User not found in database");
      return new Response(JSON.stringify({ message: "User not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Add computed fields for admin users
    if (user.privilegeLevel > 0) {
      user.isAdmin = true;
      user.canManageJobs = user.privilegeLevel >= 2;
      user.canViewApplications = user.privilegeLevel >= 1;
      user.isSuperAdmin = user.privilegeLevel >= 3;
    }

    return new Response(JSON.stringify(user), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Profile fetch error:", error);
    return new Response(
      JSON.stringify({
        message: "Internal server error",
        error: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function PUT(req) {
  const requestContext = extractRequestContext(req);
  const session = await getServerSession(authOptions);

  if (!session) {
    // Log unauthorized profile update attempt
    await logAuditEvent({
      eventType: "ERROR",
      category: "SECURITY",
      action: "Unauthorized profile update attempt",
      description: "Profile update attempted without valid session",
      actorType: "user",
      actorName: "unauthenticated",
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      severity: "warning",
      status: "failure",
      tags: ["profile", "update", "unauthorized", "security"]
    }, req).catch(console.error);

    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
    });
  }

  const userId = session.user.id;

  try {
    const body = await req.json();
    const { firstName, lastName, email, phone, linkedinUrl, portfolioUrl, facebookUrl, twitterUrl, instagramUrl, blueskyUrl } = body;

    // Get current user data for change tracking
    const currentUser = await appPrisma.users.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        linkedin_url: true,
        portfolio_url: true,
        facebook_url: true,
        twitter_url: true,
        instagram_url: true,
        bluesky_url: true,
      },
    });

    if (!currentUser) {
      // Log user not found error
      await logAuditEvent({
        eventType: "ERROR",
        category: "USER",
        action: "Profile update failed - user not found",
        description: `Profile update attempted for non-existent user ID: ${userId}`,
        entityType: "user",
        entityId: userId,
        actorId: userId,
        actorType: "user",
        actorName: session.user.email,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        severity: "error",
        status: "failure",
        tags: ["profile", "update", "user_not_found", "data_integrity"]
      }, req).catch(console.error);

      return new Response(JSON.stringify({ message: "User not found" }), {
        status: 404,
      });
    }

    // Regular users can only update basic info
    const updateData = {
      firstName,
      lastName,
      email,
      phone,
      linkedin_url: linkedinUrl || null,
      portfolio_url: portfolioUrl || null,
      facebook_url: facebookUrl || null,
      twitter_url: twitterUrl || null,
      instagram_url: instagramUrl || null,
      bluesky_url: blueskyUrl || null,
    };

    // Track changes for audit log
    const changes = {};
    const oldValues = {};
    const newValues = {};

    if (currentUser.firstName !== firstName) {
      changes.firstName = { from: currentUser.firstName, to: firstName };
      oldValues.firstName = currentUser.firstName;
      newValues.firstName = firstName;
    }
    if (currentUser.lastName !== lastName) {
      changes.lastName = { from: currentUser.lastName, to: lastName };
      oldValues.lastName = currentUser.lastName;
      newValues.lastName = lastName;
    }
    if (currentUser.email !== email) {
      changes.email = { from: currentUser.email, to: email };
      oldValues.email = currentUser.email;
      newValues.email = email;
    }
    if (currentUser.phone !== phone) {
      changes.phone = { from: currentUser.phone, to: phone };
      oldValues.phone = currentUser.phone;
      newValues.phone = phone;
    }
    if (currentUser.linkedin_url !== linkedinUrl) {
      changes.linkedin_url = { from: currentUser.linkedin_url, to: linkedinUrl };
      oldValues.linkedin_url = currentUser.linkedin_url;
      newValues.linkedin_url = linkedinUrl;
    }
    if (currentUser.portfolio_url !== portfolioUrl) {
      changes.portfolio_url = { from: currentUser.portfolio_url, to: portfolioUrl };
      oldValues.portfolio_url = currentUser.portfolio_url;
      newValues.portfolio_url = portfolioUrl;
    }
    if (currentUser.facebook_url !== facebookUrl) {
      changes.facebook_url = { from: currentUser.facebook_url, to: facebookUrl };
      oldValues.facebook_url = currentUser.facebook_url;
      newValues.facebook_url = facebookUrl;
    }
    if (currentUser.twitter_url !== twitterUrl) {
      changes.twitter_url = { from: currentUser.twitter_url, to: twitterUrl };
      oldValues.twitter_url = currentUser.twitter_url;
      newValues.twitter_url = twitterUrl;
    }
    if (currentUser.instagram_url !== instagramUrl) {
      changes.instagram_url = { from: currentUser.instagram_url, to: instagramUrl };
      oldValues.instagram_url = currentUser.instagram_url;
      newValues.instagram_url = instagramUrl;
    }
    if (currentUser.bluesky_url !== blueskyUrl) {
      changes.bluesky_url = { from: currentUser.bluesky_url, to: blueskyUrl };
      oldValues.bluesky_url = currentUser.bluesky_url;
      newValues.bluesky_url = blueskyUrl;
    }

    const updatedUser = await appPrisma.users.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        privilegeLevel: true,
        createdAt: true,
        linkedin_url: true,
        portfolio_url: true,
        facebook_url: true,
        twitter_url: true,
        instagram_url: true,
        bluesky_url: true,
      },
    });

    // Log successful profile update
    await logAuditEvent({
      eventType: "UPDATE",
      category: "USER",
      subcategory: "PROFILE_UPDATE",
      action: "Profile updated successfully",
      description: `User ${session.user.email} updated their profile information`,
      entityType: "user",
      entityId: userId,
      entityName: session.user.email,
      actorId: userId,
      actorType: "user",
      actorName: session.user.name || session.user.email,
      oldValues: Object.keys(oldValues).length > 0 ? oldValues : null,
      newValues: Object.keys(newValues).length > 0 ? newValues : null,
      changes: Object.keys(changes).length > 0 ? changes : null,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      relatedUserId: userId,
      severity: "info",
      status: "success",
      tags: ["profile", "update", "success", "self_service"],
      metadata: {
        fieldsChanged: Object.keys(changes),
        changeCount: Object.keys(changes).length,
        updatedBy: session.user.email
      }
    }, req).catch(console.error);

    return new Response(JSON.stringify(updatedUser), { status: 200 });
  } catch (error) {
    console.error("Profile update error:", error);
    
    // Log server error during profile update
    await logAuditEvent({
      eventType: "ERROR",
      category: "SYSTEM",
      action: "Profile update failed - server error",
      description: `Server error during profile update for user: ${session?.user?.email || 'unknown'}`,
      entityType: "user",
      entityId: userId,
      entityName: session?.user?.email,
      actorId: userId,
      actorType: "user",
      actorName: session?.user?.name || session?.user?.email,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      relatedUserId: userId,
      severity: "error",
      status: "failure",
      tags: ["profile", "update", "server_error", "system"],
      metadata: {
        error: error.message,
        stack: error.stack,
        userId: userId
      }
    }, req).catch(console.error);

    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}
