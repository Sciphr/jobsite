// scripts/seed-settings.js
// Run this with: node scripts/seed-settings.js

import { PrismaClient } from "../app/generated/prisma/index.js";

const prisma = new PrismaClient();

const defaultSettings = [
  // System Settings (Privilege Level 3 - Super Admin only)
  {
    key: "allow_guest_applications",
    value: "true",
    category: "system",
    description: "Allow users to apply for jobs without creating an account",
    dataType: "boolean",
    privilegeLevel: 3,
  },
  {
    key: "site_name",
    value: "Job Board",
    category: "system",
    description: "Name of the job board site",
    dataType: "string",
    privilegeLevel: 3,
  },
  {
    key: "site_description",
    value: "Find your next career opportunity",
    category: "system",
    description: "Site description for SEO and branding",
    dataType: "string",
    privilegeLevel: 3,
  },
  {
    key: "default_currency",
    value: "USD",
    category: "system",
    description: "Default currency for salary listings",
    dataType: "string",
    privilegeLevel: 3,
  },
  {
    key: "max_resume_size_mb",
    value: "5",
    category: "system",
    description: "Maximum resume file size in megabytes",
    dataType: "number",
    privilegeLevel: 3,
  },
  {
    key: "allowed_resume_types",
    value: '["pdf", "doc", "docx"]',
    category: "system",
    description: "Allowed resume file types",
    dataType: "json",
    privilegeLevel: 3,
  },

  // Jobs Settings (Privilege Level 2 - Admin)
  {
    key: "auto_expire_jobs_days",
    value: "30",
    category: "jobs",
    description: "Number of days after which jobs auto-expire (0 = never)",
    dataType: "number",
    privilegeLevel: 2,
  },
  {
    key: "require_salary_range",
    value: "false",
    category: "jobs",
    description: "Require salary range to be specified for all job postings",
    dataType: "boolean",
    privilegeLevel: 2,
  },
  {
    key: "show_salary_by_default",
    value: "true",
    category: "jobs",
    description: "Show salary information on job listings by default",
    dataType: "boolean",
    privilegeLevel: 2,
  },
  {
    key: "max_featured_jobs",
    value: "5",
    category: "jobs",
    description: "Maximum number of jobs that can be featured at once",
    dataType: "number",
    privilegeLevel: 2,
  },
  {
    key: "auto_publish_jobs",
    value: "false",
    category: "jobs",
    description: "Automatically publish job postings when created",
    dataType: "boolean",
    privilegeLevel: 2,
  },
  {
    key: "application_deadline_required",
    value: "false",
    category: "jobs",
    description: "Require application deadlines for all job postings",
    dataType: "boolean",
    privilegeLevel: 2,
  },

  // Notification Settings (Privilege Level 1 - HR)
  {
    key: "email_new_applications",
    value: "true",
    category: "notifications",
    description: "Send email notifications for new job applications",
    dataType: "boolean",
    privilegeLevel: 1,
  },
  {
    key: "email_job_published",
    value: "true",
    category: "notifications",
    description: "Send email notifications when jobs are published",
    dataType: "boolean",
    privilegeLevel: 1,
  },
  {
    key: "notification_email",
    value: "admin@example.com",
    category: "notifications",
    description: "Email address to receive system notifications",
    dataType: "string",
    privilegeLevel: 1,
  },
  {
    key: "application_confirmation_email",
    value: "true",
    category: "notifications",
    description: "Send confirmation emails to applicants",
    dataType: "boolean",
    privilegeLevel: 1,
  },
  {
    key: "weekly_digest_enabled",
    value: "true",
    category: "notifications",
    description: "Send weekly digest of applications and job performance",
    dataType: "boolean",
    privilegeLevel: 1,
  },
];

async function seedSettings() {
  console.log("🌱 Seeding default settings...");

  try {
    for (const setting of defaultSettings) {
      const existing = await prisma.setting.findFirst({
        where: {
          key: setting.key,
          userId: null, // System settings
        },
      });

      if (!existing) {
        await prisma.setting.create({
          data: setting,
        });
        console.log(`✅ Created setting: ${setting.key}`);
      } else {
        console.log(`⏭️  Setting already exists: ${setting.key}`);
      }
    }

    console.log("🎉 Settings seeding completed!");
  } catch (error) {
    console.error("❌ Error seeding settings:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seedSettings();
