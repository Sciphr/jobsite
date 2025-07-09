// app/api/admin/settings/[key]/route.js - Enhanced version
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { appPrisma } from "../../../../lib/prisma";

export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !session.user.privilegeLevel ||
      session.user.privilegeLevel < 1
    ) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    const { key } = await params;
    const { value, isPersonal } = await request.json();

    // Find existing setting or create if it doesn't exist
    let existingSetting = await appPrisma.setting.findFirst({
      where: {
        key,
        userId: isPersonal ? session.user.id : null,
      },
    });

    // If no personal setting exists but we're trying to set one, create it
    if (!existingSetting && isPersonal) {
      // First check if there's a system default for this setting
      const systemSetting = await appPrisma.setting.findFirst({
        where: {
          key,
          userId: null,
        },
      });

      if (systemSetting) {
        // Create personal setting based on system setting structure
        existingSetting = await appPrisma.setting.create({
          data: {
            key,
            value: stringifySettingValue(value, systemSetting.dataType),
            category: systemSetting.category,
            userId: session.user.id,
            privilegeLevel: 1, // Personal settings require at least level 1
            dataType: systemSetting.dataType,
            description: systemSetting.description + " (Personal)",
          },
        });
      } else {
        // Create new personal setting for admin dashboard theme
        if (key === "admin_dashboard_theme") {
          existingSetting = await appPrisma.setting.create({
            data: {
              key,
              value: stringifySettingValue(value, "string"),
              category: "personal",
              userId: session.user.id,
              privilegeLevel: 1,
              dataType: "string",
              description: "Admin dashboard color theme preference",
            },
          });
        } else {
          return new Response(JSON.stringify({ error: "Setting not found" }), {
            status: 404,
          });
        }
      }
    } else if (!existingSetting) {
      return new Response(JSON.stringify({ error: "Setting not found" }), {
        status: 404,
      });
    }

    // Check if user has permission to modify this setting
    if (session.user.privilegeLevel < existingSetting.privilegeLevel) {
      return new Response(
        JSON.stringify({ error: "Insufficient privileges" }),
        { status: 403 }
      );
    }

    const stringValue = stringifySettingValue(value, existingSetting.dataType);

    const updatedSetting = await appPrisma.setting.update({
      where: { id: existingSetting.id },
      data: {
        value: stringValue,
        updatedAt: new Date(),
      },
    });

    return new Response(
      JSON.stringify({
        ...updatedSetting,
        parsedValue: parseSettingValue(
          updatedSetting.value,
          updatedSetting.dataType
        ),
        canEdit: true,
        isPersonal: updatedSetting.userId !== null,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating setting:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
    });
  }
}

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !session.user.privilegeLevel ||
      session.user.privilegeLevel < 1
    ) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    const { key } = await params;
    const { searchParams } = new URL(request.url);
    const isPersonal = searchParams.get("personal") === "true";

    const setting = await appPrisma.setting.findFirst({
      where: {
        key,
        userId: isPersonal ? session.user.id : null,
      },
    });

    if (!setting) {
      // If requesting a personal setting that doesn't exist, return default
      if (isPersonal && key === "admin_dashboard_theme") {
        return new Response(
          JSON.stringify({
            key,
            value: "default",
            parsedValue: "default",
            canEdit: true,
            isPersonal: true,
          }),
          { status: 200 }
        );
      }

      return new Response(JSON.stringify({ error: "Setting not found" }), {
        status: 404,
      });
    }

    return new Response(
      JSON.stringify({
        ...setting,
        parsedValue: parseSettingValue(setting.value, setting.dataType),
        canEdit: session.user.privilegeLevel >= setting.privilegeLevel,
        isPersonal: setting.userId !== null,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching setting:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
    });
  }
}

// Helper functions (same as in main settings route)
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
