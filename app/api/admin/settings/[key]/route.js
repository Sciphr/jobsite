import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { appPrisma } from "../../../../lib/prisma";

export async function PATCH(req, { params }) {
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

  const { key } = params;

  try {
    const body = await req.json();
    const { value, isPersonal } = body;

    // Determine userId (null for system settings, user ID for personal)
    const userId = isPersonal ? session.user.id : null;

    // Find the existing setting
    const existingSetting = await appPrisma.setting.findUnique({
      where: {
        key_userId: {
          key,
          userId,
        },
      },
    });

    if (!existingSetting) {
      return new Response(JSON.stringify({ message: "Setting not found" }), {
        status: 404,
      });
    }

    // Check if user has privilege to update this setting
    if (session.user.privilegeLevel < existingSetting.privilegeLevel) {
      return new Response(
        JSON.stringify({
          message: "Insufficient privileges to update this setting",
        }),
        {
          status: 403,
        }
      );
    }

    // Convert value to string for storage
    let stringValue;
    switch (existingSetting.dataType) {
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

    // Update the setting
    const updatedSetting = await appPrisma.setting.update({
      where: {
        key_userId: {
          key,
          userId,
        },
      },
      data: {
        value: stringValue,
        updatedAt: new Date(),
      },
    });

    // Parse value for response
    let parsedValue = updatedSetting.value;
    try {
      switch (updatedSetting.dataType) {
        case "boolean":
          parsedValue = updatedSetting.value === "true";
          break;
        case "number":
          parsedValue = parseFloat(updatedSetting.value);
          break;
        case "json":
          parsedValue = JSON.parse(updatedSetting.value);
          break;
        default:
          parsedValue = updatedSetting.value;
      }
    } catch (error) {
      console.warn(
        `Error parsing updated setting ${updatedSetting.key}:`,
        error
      );
    }

    return new Response(
      JSON.stringify({
        ...updatedSetting,
        parsedValue,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Setting update error:", error);

    if (error.code === "P2025") {
      return new Response(JSON.stringify({ message: "Setting not found" }), {
        status: 404,
      });
    }

    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}
