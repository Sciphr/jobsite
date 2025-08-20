import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(request) {
  try {
    const { token, setupData } = await request.json();
    
    if (!token || !setupData) {
      return NextResponse.json(
        { error: "Token and setup data are required" },
        { status: 400 }
      );
    }

    // Validate token format
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return NextResponse.json(
        { error: "Invalid token format" },
        { status: 400 }
      );
    }

    // Import Prisma client
    const { appPrisma } = await import("../../../lib/prisma");

    // Check if setup is already completed
    const existingAdmin = await appPrisma.users.findFirst({
      where: { role: "admin" },
      select: { id: true }
    });

    if (existingAdmin) {
      return NextResponse.json(
        { error: "Setup has already been completed" },
        { status: 400 }
      );
    }

    // Start transaction to ensure all operations succeed or fail together
    const result = await appPrisma.$transaction(async (prisma) => {
      // 1. Create admin user
      const hashedPassword = await bcrypt.hash(setupData.admin.password, 12);
      
      const adminUser = await prisma.users.create({
        data: {
          email: setupData.admin.email,
          password: hashedPassword,
          firstName: setupData.admin.firstName,
          lastName: setupData.admin.lastName,
          role: "admin",
          privilegeLevel: 100,
          isActive: true,
          is_active: true,
          account_type: "local",
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });

      // 2. Save SMTP settings if enabled
      if (setupData.smtp?.enabled) {
        const smtpSettings = [
          { key: "smtp_enabled", value: "true", category: "email" },
          { key: "smtp_host", value: setupData.smtp.host, category: "email" },
          { key: "smtp_port", value: setupData.smtp.port.toString(), category: "email" },
          { key: "smtp_secure", value: setupData.smtp.secure.toString(), category: "email" },
          { key: "smtp_requires_auth", value: setupData.smtp.requiresAuth.toString(), category: "email" },
          { key: "smtp_username", value: setupData.smtp.username || "", category: "email" },
          { key: "smtp_password", value: setupData.smtp.password || "", category: "email" },
          { key: "smtp_from_name", value: setupData.smtp.fromName, category: "email" },
          { key: "smtp_from_email", value: setupData.smtp.fromEmail, category: "email" },
        ];

        for (const setting of smtpSettings) {
          await prisma.settings.create({
            data: {
              ...setting,
              privilegeLevel: 100,
              dataType: "string",
              description: `SMTP configuration - ${setting.key}`,
              createdAt: new Date(),
              updatedAt: new Date(),
            }
          });
        }
      } else {
        // Disable SMTP
        await prisma.settings.create({
          data: {
            key: "smtp_enabled",
            value: "false",
            category: "email",
            privilegeLevel: 100,
            dataType: "string",
            description: "SMTP configuration - smtp_enabled",
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        });
      }

      // 3. Save company settings
      const companySettings = [
        { key: "company_name", value: setupData.company?.companyName || "My Company", category: "company" },
        { key: "company_website", value: setupData.company?.companyWebsite || "", category: "company" },
        { key: "company_description", value: setupData.company?.companyDescription || "", category: "company" },
        { key: "timezone", value: setupData.company?.timezone || "America/Toronto", category: "general" },
        { key: "date_format", value: setupData.company?.dateFormat || "MM/DD/YYYY", category: "general" },
        { key: "time_format", value: setupData.company?.timeFormat || "12", category: "general" },
        { key: "currency", value: setupData.company?.currency || "USD", category: "general" },
        { key: "language", value: setupData.company?.language || "en", category: "general" },
        { key: "allow_public_registration", value: setupData.company?.allowPublicRegistration?.toString() || "false", category: "security" },
        { key: "require_email_verification", value: setupData.company?.requireEmailVerification?.toString() || "true", category: "security" },
        { key: "default_user_role", value: setupData.company?.defaultUserRole || "user", category: "security" },
        { key: "setup_completed", value: "true", category: "system" },
        { key: "setup_completed_at", value: new Date().toISOString(), category: "system" },
        { key: "setup_token_used", value: token, category: "system" },
      ];

      for (const setting of companySettings) {
        await prisma.settings.create({
          data: {
            ...setting,
            privilegeLevel: 100,
            dataType: setting.key.includes("_at") ? "datetime" : 
                     setting.key.includes("allow_") || setting.key.includes("require_") ? "boolean" : "string",
            description: `Application setting - ${setting.key}`,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        });
      }

      return {
        adminUser: {
          id: adminUser.id,
          email: adminUser.email,
          firstName: adminUser.firstName,
          lastName: adminUser.lastName,
        }
      };
    });

    // TODO: In a real implementation, you would also mark the setup token as used 
    // in your SaaS management system via an API call

    return NextResponse.json({
      success: true,
      message: "Setup completed successfully",
      adminCredentials: {
        email: result.adminUser.email,
        name: `${result.adminUser.firstName} ${result.adminUser.lastName}`,
      }
    });

  } catch (error) {
    console.error("Error completing setup:", error);
    
    // Provide more specific error messages for common issues
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to complete setup. Please try again." },
      { status: 500 }
    );
  }
}