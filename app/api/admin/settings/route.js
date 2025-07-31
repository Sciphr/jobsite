// app/api/admin/settings/route.js
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { appPrisma } from "../../../lib/prisma";
import { protectRoute } from "../../../lib/middleware/apiProtection";

export async function GET(request) {
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

    return new Response(JSON.stringify({ settings: parsedSettings, grouped }), {
      status: 200,
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
    });
  }
}

export async function POST(request) {
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
      return new Response(JSON.stringify({ error: "Setting already exists" }), {
        status: 409,
      });
    }
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
