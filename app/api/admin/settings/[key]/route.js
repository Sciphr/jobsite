// app/api/admin/settings/[key]/route.js - Fixed but less restrictive version
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

    console.log("PATCH Settings - Debug info:", {
      key,
      value,
      isPersonal,
      userId: session.user.id,
      userEmail: session.user.email,
    });

    // Special handling for admin_dashboard_theme - always treat as personal
    const shouldBePersonal = isPersonal || key === "admin_dashboard_theme";
    const targetUserId = shouldBePersonal ? session.user.id : null;

    // SAFETY: If this should be personal but we don't have a user ID, that's a problem
    if (shouldBePersonal && !session.user.id) {
      console.error("Missing user ID for personal setting:", {
        key,
        sessionUser: session.user,
      });
      return new Response(
        JSON.stringify({
          error: "Cannot create personal setting: user ID not found",
        }),
        { status: 400 }
      );
    }

    // Find existing setting
    let existingSetting = await appPrisma.settings.findFirst({
      where: {
        key,
        userId: targetUserId,
      },
    });

    console.log("Existing setting found:", existingSetting);

    // If no setting exists, create it
    if (!existingSetting) {
      if (key === "admin_dashboard_theme") {
        // Always create theme setting as personal
        existingSetting = await appPrisma.settings.create({
          data: {
            key,
            value: stringifySettingValue(value, "string"),
            category: "personal",
            userId: session.user.id,
            privilegeLevel: 1,
            dataType: "string",
            description: "Admin dashboard color theme preference (Personal)",
          },
        });
        console.log("Created new theme setting:", existingSetting);
      } else {
        // For other settings, check if there's a system default
        const systemSetting = await appPrisma.setting.findFirst({
          where: {
            key,
            userId: null,
          },
        });

        if (systemSetting && shouldBePersonal) {
          // Create personal setting based on system setting structure
          existingSetting = await appPrisma.settings.create({
            data: {
              key,
              value: stringifySettingValue(value, systemSetting.dataType),
              category: systemSetting.category,
              userId: session.user.id,
              privilegeLevel: 1,
              dataType: systemSetting.dataType,
              description: systemSetting.description + " (Personal)",
            },
          });
        } else if (!shouldBePersonal && systemSetting) {
          // Update existing system setting
          existingSetting = systemSetting;
        } else {
          return new Response(JSON.stringify({ error: "Setting not found" }), {
            status: 404,
          });
        }
      }
    }

    // Check if user has permission to modify this setting
    if (session.user.privilegeLevel < existingSetting.privilegeLevel) {
      return new Response(
        JSON.stringify({ error: "Insufficient privileges" }),
        { status: 403 }
      );
    }

    const stringValue = stringifySettingValue(value, existingSetting.dataType);

    const updatedSetting = await appPrisma.settings.update({
      where: { id: existingSetting.id },
      data: {
        value: stringValue,
        updatedAt: new Date(),
      },
    });

    console.log("Updated setting:", updatedSetting);

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
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error.message,
      }),
      {
        status: 500,
      }
    );
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

    // For theme settings, always check personal first
    const shouldCheckPersonal = isPersonal || key === "admin_dashboard_theme";
    const targetUserId = shouldCheckPersonal ? session.user.id : null;

    const setting = await appPrisma.settings.findFirst({
      where: {
        key,
        userId: targetUserId,
      },
    });

    if (!setting) {
      // If requesting a personal theme setting that doesn't exist, return default
      if (key === "admin_dashboard_theme") {
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

// Helper functions (same as before)
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
