// app/api/admin/settings/route.js
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { appPrisma } from "../../../lib/prisma";
import { protectRoute } from "../../../lib/middleware/apiProtection";
import { logAuditEvent } from "../../../../lib/auditMiddleware";
import { extractRequestContext } from "../../../lib/auditLog";

export async function GET(request) {
  const requestContext = extractRequestContext(request);
  
  try {
    // Check if user has permission to view settings
    const authResult = await protectRoute("settings", "view");
    if (authResult.error) return authResult.error;

    const { session } = authResult;

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    let whereClause = {};

    // Filter by category if provided
    if (category) {
      whereClause.category = category;
    }

    // Get settings based on user privilege level
    const settings = await appPrisma.settings.findMany({
      where: {
        ...whereClause,
        OR: [
          { userId: null }, // System settings
          { userId: session.user.id }, // User's personal settings
        ],
        privilegeLevel: {
          lte: session.user.privilegeLevel, // Only settings they can access
        },
      },
      orderBy: [{ category: "asc" }, { key: "asc" }],
    });

    // Parse values and add canEdit flag
    const parsedSettings = settings.map((setting) => ({
      ...setting,
      parsedValue: parseSettingValue(setting.value, setting.dataType),
      canEdit: session.user.privilegeLevel >= setting.privilegeLevel,
      isPersonal: setting.userId !== null,
    }));

    // Group by category
    const grouped = parsedSettings.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = [];
      }
      acc[setting.category].push(setting);
      return acc;
    }, {});

    // Log successful settings access
    await logAuditEvent({
      eventType: "VIEW",
      category: "ADMIN",
      action: "Settings accessed",
      description: `Admin ${session.user.email} accessed system settings${category ? ` (category: ${category})` : ''}`,
      entityType: "settings",
      actorId: session.user.id,
      actorType: "user",
      actorName: session.user.name || session.user.email,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      relatedUserId: session.user.id,
      severity: "info",
      status: "success",
      tags: ["settings", "admin", "view", "access"],
      metadata: {
        settingsCount: parsedSettings.length,
        category: category || 'all',
        accessedBy: session.user.email,
        privilegeLevel: session.user.privilegeLevel
      }
    }, request).catch(console.error);

    return new Response(JSON.stringify({ settings: parsedSettings, grouped }), {
      status: 200,
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    
    // Log server error during settings access
    await logAuditEvent({
      eventType: "ERROR",
      category: "SYSTEM",
      action: "Settings access failed - server error",
      description: `Server error while accessing settings for admin: ${session?.user?.email || 'unknown'}`,
      entityType: "settings",
      actorId: session?.user?.id,
      actorType: "user",
      actorName: session?.user?.name || session?.user?.email,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      relatedUserId: session?.user?.id,
      severity: "error",
      status: "failure",
      tags: ["settings", "admin", "server_error", "system"],
      metadata: {
        error: error.message,
        stack: error.stack
      }
    }, request).catch(console.error);

    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
    });
  }
}

export async function POST(request) {
  const requestContext = extractRequestContext(request);
  
  try {
    // Check if user has permission to edit settings
    const authResult = await protectRoute("settings", "edit_system");
    if (authResult.error) return authResult.error;

    const { session } = authResult;

    const {
      key,
      value,
      category,
      description,
      dataType,
      privilegeLevel,
      isPersonal,
    } = await request.json();

    // Check if user has permission to create this setting
    if (session.user.privilegeLevel < privilegeLevel) {
      // Log insufficient privileges for setting creation
      await logAuditEvent({
        eventType: "ERROR",
        category: "SECURITY",
        action: "Setting creation failed - insufficient privileges",
        description: `Admin ${session.user.email} attempted to create setting '${key}' requiring privilege level ${privilegeLevel}`,
        entityType: "setting",
        entityName: key,
        actorId: session.user.id,
        actorType: "user",
        actorName: session.user.name || session.user.email,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        relatedUserId: session.user.id,
        severity: "warning",
        status: "failure",
        tags: ["settings", "create", "insufficient_privileges", "security"],
        metadata: {
          settingKey: key,
          requiredPrivilegeLevel: privilegeLevel,
          userPrivilegeLevel: session.user.privilegeLevel,
          category: category
        }
      }, request).catch(console.error);

      return new Response(
        JSON.stringify({ error: "Insufficient privileges" }),
        { status: 403 }
      );
    }

    const stringValue = stringifySettingValue(value, dataType);

    const setting = await appPrisma.settings.create({
      data: {
        key,
        value: stringValue,
        category,
        description,
        dataType,
        privilegeLevel,
        userId: isPersonal ? session.user.id : null,
      },
    });

    // Log successful setting creation
    await logAuditEvent({
      eventType: "CREATE",
      category: "ADMIN",
      subcategory: "SETTING_CHANGE",
      action: "Setting created successfully",
      description: `Admin ${session.user.email} created new setting '${key}' in category '${category}'`,
      entityType: "setting",
      entityId: setting.id,
      entityName: key,
      actorId: session.user.id,
      actorType: "user",
      actorName: session.user.name || session.user.email,
      newValues: {
        key: key,
        value: value,
        category: category,
        description: description,
        dataType: dataType,
        privilegeLevel: privilegeLevel,
        isPersonal: isPersonal
      },
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      relatedUserId: session.user.id,
      severity: "info",
      status: "success",
      tags: ["settings", "create", "success", "admin", "configuration"],
      metadata: {
        settingId: setting.id,
        settingKey: key,
        category: category,
        dataType: dataType,
        privilegeLevel: privilegeLevel,
        isPersonal: isPersonal,
        createdBy: session.user.email
      }
    }, request).catch(console.error);

    return new Response(
      JSON.stringify({
        ...setting,
        parsedValue: parseSettingValue(setting.value, setting.dataType),
        canEdit: true,
        isPersonal: setting.userId !== null,
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating setting:", error);
    
    if (error.code === "P2002") {
      // Log duplicate setting creation attempt
      await logAuditEvent({
        eventType: "ERROR",
        category: "ADMIN",
        action: "Setting creation failed - already exists",
        description: `Admin ${session?.user?.email} attempted to create duplicate setting: ${key}`,
        entityType: "setting",
        entityName: key,
        actorId: session?.user?.id,
        actorType: "user",
        actorName: session?.user?.name || session?.user?.email,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        relatedUserId: session?.user?.id,
        severity: "warning",
        status: "failure",
        tags: ["settings", "create", "duplicate", "failed"],
        metadata: {
          settingKey: key,
          category: category,
          errorCode: error.code,
          createdBy: session?.user?.email
        }
      }, request).catch(console.error);

      return new Response(JSON.stringify({ error: "Setting already exists" }), {
        status: 409,
      });
    }

    // Log server error during setting creation
    await logAuditEvent({
      eventType: "ERROR",
      category: "SYSTEM",
      action: "Setting creation failed - server error",
      description: `Server error during setting creation for admin: ${session?.user?.email || 'unknown'}`,
      entityType: "setting",
      entityName: key,
      actorId: session?.user?.id,
      actorType: "user",
      actorName: session?.user?.name || session?.user?.email,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      relatedUserId: session?.user?.id,
      severity: "error",
      status: "failure",
      tags: ["settings", "create", "server_error", "system"],
      metadata: {
        error: error.message,
        stack: error.stack,
        settingKey: key,
        category: category,
        createdBy: session?.user?.email
      }
    }, request).catch(console.error);

    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
    });
  }
}

// Helper functions
function parseSettingValue(value, dataType) {
  try {
    switch (dataType) {
      case "boolean":
        return value === "true" || value === true;
      case "number":
        return parseFloat(value);
      case "json":
        return JSON.parse(value);
      default:
        return value;
    }
  } catch (error) {
    console.error("Error parsing setting value:", error);
    return value;
  }
}

function stringifySettingValue(value, dataType) {
  try {
    switch (dataType) {
      case "boolean":
        return String(Boolean(value));
      case "number":
        return String(Number(value));
      case "json":
        return JSON.stringify(value);
      default:
        return String(value);
    }
  } catch (error) {
    console.error("Error stringifying setting value:", error);
    return String(value);
  }
}
