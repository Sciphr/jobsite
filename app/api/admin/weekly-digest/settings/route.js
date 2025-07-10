// app/api/admin/weekly-digest/settings/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { appPrisma } from "../../../../lib/prisma";

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is admin (privilege level 1 or higher)
    if (
      !session ||
      !session.user.privilegeLevel ||
      session.user.privilegeLevel < 1
    ) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get all weekly digest settings
    const settings = await appPrisma.setting.findMany({
      where: {
        key: {
          in: [
            "weekly_digest_enabled",
            "weekly_digest_recipients",
            "weekly_digest_sections",
            "weekly_digest_customizations",
            "weekly_digest_theme", // Add this line
            "weekly_digest_day",
            "weekly_digest_time",
          ],
        },
        userId: null,
      },
    });

    // Transform settings into the expected format
    const digestConfig = {
      enabled: true,
      recipients: [],
      emailTheme: "professional",
      sections: {
        jobMetrics: true,
        userMetrics: true,
        applicationData: true,
        systemHealth: true,
      },
      sectionCustomizations: {
        jobMetrics: {
          newJobs: true,
          jobViews: true,
          topJobs: true,
          lowJobs: true,
          jobsByDepartment: true,
          featuredJobs: false,
        },
        userMetrics: {
          newUsers: true,
          activeUsers: false,
          userGrowth: true,
          usersByRole: false,
          registrationTrends: true,
        },
        applicationData: {
          totalApps: true,
          applied: true,
          reviewing: true,
          interview: true,
          hired: true,
          rejected: false,
          appTrends: true,
          dailyBreakdown: true,
          conversionRates: false,
          avgTimeToHire: true,
        },
        systemHealth: {
          systemStatus: true,
          performance: false,
          alerts: true,
          uptime: false,
          errorRates: false,
          responseTime: false,
        },
      },
      schedule: {
        dayOfWeek: 1, // Monday
        time: "09:00",
      },
    };

    // Parse settings and override defaults
    settings.forEach((setting) => {
      try {
        switch (setting.key) {
          case "weekly_digest_enabled":
            digestConfig.enabled = setting.value === "true";
            break;
          case "weekly_digest_recipients":
            const recipients = JSON.parse(setting.value || "[]");
            digestConfig.recipients = Array.isArray(recipients)
              ? recipients
              : [];
            break;
          case "weekly_digest_theme": // Add this case
            digestConfig.emailTheme = setting.value || "professional";
            break;
          case "weekly_digest_sections":
            const sections = JSON.parse(setting.value || "{}");
            digestConfig.sections = { ...digestConfig.sections, ...sections };
            break;
          case "weekly_digest_customizations":
            const customizations = JSON.parse(setting.value || "{}");
            digestConfig.sectionCustomizations = {
              ...digestConfig.sectionCustomizations,
              ...customizations,
            };
            break;
          case "weekly_digest_day":
            const dayMap = {
              monday: 1,
              tuesday: 2,
              wednesday: 3,
              thursday: 4,
              friday: 5,
              saturday: 6,
              sunday: 0,
            };
            digestConfig.schedule.dayOfWeek = dayMap[setting.value] || 1;
            break;
          case "weekly_digest_time":
            digestConfig.schedule.time = setting.value || "09:00";
            break;
        }
      } catch (parseError) {
        console.warn(`Failed to parse setting ${setting.key}:`, parseError);
      }
    });

    return NextResponse.json({
      success: true,
      data: digestConfig,
    });
  } catch (error) {
    console.error("❌ Error fetching digest settings:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is admin (privilege level 1 or higher)
    if (
      !session ||
      !session.user.privilegeLevel ||
      session.user.privilegeLevel < 1
    ) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { digestConfig } = body;

    if (!digestConfig) {
      return NextResponse.json(
        { success: false, message: "Missing digest configuration" },
        { status: 400 }
      );
    }

    console.log("💾 Saving weekly digest settings:", {
      enabled: digestConfig.enabled,
      recipientCount: digestConfig.recipients?.length || 0,
      sections: Object.keys(digestConfig.sections || {}),
    });

    // Prepare settings to save
    const settingsToSave = [
      {
        key: "weekly_digest_enabled",
        value: digestConfig.enabled ? "true" : "false",
        dataType: "boolean",
        category: "notifications",
        description: "Enable/disable weekly digest emails",
      },
      {
        key: "weekly_digest_theme", // Add this setting
        value: digestConfig.emailTheme || "professional",
        dataType: "string",
        category: "notifications",
        description: "Visual theme for digest emails",
      },
      {
        key: "weekly_digest_recipients",
        value: JSON.stringify(digestConfig.recipients || []),
        dataType: "json",
        category: "notifications",
        description: "List of user IDs to receive weekly digest",
      },
      {
        key: "weekly_digest_sections",
        value: JSON.stringify(digestConfig.sections || {}),
        dataType: "json",
        category: "notifications",
        description: "Enabled sections for weekly digest",
      },
      {
        key: "weekly_digest_customizations",
        value: JSON.stringify(digestConfig.sectionCustomizations || {}),
        dataType: "json",
        category: "notifications",
        description: "Customization settings for digest sections",
      },
    ];

    // Add schedule settings if provided
    if (digestConfig.schedule) {
      const dayNames = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ];
      const dayName = dayNames[digestConfig.schedule.dayOfWeek] || "monday";

      settingsToSave.push(
        {
          key: "weekly_digest_day",
          value: dayName,
          dataType: "string",
          category: "notifications",
          description: "Day of week to send digest",
        },
        {
          key: "weekly_digest_time",
          value: digestConfig.schedule.time || "09:00",
          dataType: "string",
          category: "notifications",
          description: "Time of day to send digest",
        }
      );
    }

    // Save settings using find-then-create/update approach to avoid upsert issues
    for (const setting of settingsToSave) {
      try {
        // First try to find existing setting
        const existingSetting = await appPrisma.setting.findFirst({
          where: {
            key: setting.key,
            userId: null,
          },
        });

        if (existingSetting) {
          // Update existing setting
          await appPrisma.setting.update({
            where: { id: existingSetting.id },
            data: {
              value: setting.value,
              updatedAt: new Date(),
            },
          });
          console.log(`✅ Updated setting: ${setting.key}`);
        } else {
          // Create new setting
          await appPrisma.setting.create({
            data: {
              key: setting.key,
              value: setting.value,
              dataType: setting.dataType,
              category: setting.category,
              description: setting.description,
              userId: null,
              privilegeLevel: 1,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });
          console.log(`✅ Created setting: ${setting.key}`);
        }
      } catch (settingError) {
        console.error(`❌ Error saving setting ${setting.key}:`, settingError);
        // Continue with other settings even if one fails
      }
    }

    console.log("✅ Weekly digest settings saved successfully");

    return NextResponse.json({
      success: true,
      message: "Weekly digest settings saved successfully",
      data: digestConfig,
    });
  } catch (error) {
    console.error("❌ Error saving digest settings:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to save settings",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
