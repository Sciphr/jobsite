// app/api/admin/settings/[key]/route.js
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

    // Find the existing setting
    const existingSetting = await appPrisma.setting.findFirst({
      where: {
        key,
        userId: isPersonal ? session.user.id : null,
      },
    });

    if (!existingSetting) {
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

    const { key } = params;
    const { searchParams } = new URL(request.url);
    const isPersonal = searchParams.get("personal") === "true";

    const setting = await appPrisma.setting.findFirst({
      where: {
        key,
        userId: isPersonal ? session.user.id : null,
      },
    });

    if (!setting) {
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
