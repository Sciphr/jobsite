import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { appPrisma } from "../../../lib/prisma";

export async function GET(req) {
  const session = await getServerSession(authOptions);

  // Check if user is admin (privilege level 1 or higher for viewing settings)
  if (
    !session ||
    !session.user.privilegeLevel ||
    session.user.privilegeLevel < 1
  ) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
    });
  }

  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const userPrivilegeLevel = session.user.privilegeLevel;

    // Build where clause
    const where = {
      // Only show settings the user has privilege to view
      privilegeLevel: {
        lte: userPrivilegeLevel,
      },
    };

    // Add category filter if specified
    if (category && category !== "all") {
      where.category = category;
    }

    // Get system settings (userId is null) and user's personal settings
    const [systemSettings, personalSettings] = await Promise.all([
      appPrisma.setting.findMany({
        where: {
          ...where,
          userId: null, // System settings
        },
        orderBy: [{ category: "asc" }, { key: "asc" }],
      }),
      appPrisma.setting.findMany({
        where: {
          ...where,
          userId: session.user.id, // Personal settings
        },
        orderBy: [{ category: "asc" }, { key: "asc" }],
      }),
    ]);

    // Group settings by category
    const groupedSettings = {};

    [...systemSettings, ...personalSettings].forEach((setting) => {
      if (!groupedSettings[setting.category]) {
        groupedSettings[setting.category] = [];
      }

      // Parse value based on dataType
      let parsedValue = setting.value;
      try {
        switch (setting.dataType) {
          case "boolean":
            parsedValue = setting.value === "true";
            break;
          case "number":
            parsedValue = parseFloat(setting.value);
            break;
          case "json":
            parsedValue = JSON.parse(setting.value);
            break;
          default:
            parsedValue = setting.value;
        }
      } catch (error) {
        console.warn(`Error parsing setting ${setting.key}:`, error);
      }

      groupedSettings[setting.category].push({
        ...setting,
        parsedValue,
        isPersonal: !!setting.userId,
        canEdit: userPrivilegeLevel >= setting.privilegeLevel,
      });
    });

    return new Response(
      JSON.stringify({
        grouped: groupedSettings,
        userPrivilegeLevel,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Settings fetch error:", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}

export async function POST(req) {
  const session = await getServerSession(authOptions);

  if (
    !session ||
    !session.user.privilegeLevel ||
    session.user.privilegeLevel < 1
  ) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
    });
  }

  try {
    const body = await req.json();
    const {
      key,
      value,
      category,
      privilegeLevel,
      dataType,
      description,
      isPersonal,
    } = body;

    // Validation
    if (!key || value === undefined || !category) {
      return new Response(
        JSON.stringify({ message: "Key, value, and category are required" }),
        {
          status: 400,
        }
      );
    }

    // Check if user has privilege to create/update this setting
    const requiredPrivilege = privilegeLevel || 1;
    if (session.user.privilegeLevel < requiredPrivilege) {
      return new Response(
        JSON.stringify({ message: "Insufficient privileges" }),
        {
          status: 403,
        }
      );
    }

    // Convert value to string for storage
    let stringValue;
    switch (dataType) {
      case "boolean":
        stringValue = value ? "true" : "false";
        break;
      case "number":
        stringValue = value.toString();
        break;
      case "json":
        stringValue = JSON.stringify(value);
        break;
      default:
        stringValue = value.toString();
    }

    // Determine userId (null for system settings, user ID for personal)
    const userId = isPersonal ? session.user.id : null;

    // Create or update setting
    const setting = await appPrisma.setting.upsert({
      where: {
        key_userId: {
          key,
          userId,
        },
      },
      update: {
        value: stringValue,
        category,
        dataType: dataType || "string",
        description,
        updatedAt: new Date(),
      },
      create: {
        key,
        value: stringValue,
        category,
        userId,
        privilegeLevel: requiredPrivilege,
        dataType: dataType || "string",
        description,
      },
    });

    return new Response(JSON.stringify(setting), { status: 201 });
  } catch (error) {
    console.error("Setting creation error:", error);

    if (error.code === "P2002") {
      return new Response(
        JSON.stringify({ message: "Setting already exists" }),
        {
          status: 409,
        }
      );
    }

    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}
