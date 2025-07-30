// Temporary debug script to check template categories and defaults
import { PrismaClient } from "./app/generated/prisma/index.js";

const prisma = new PrismaClient();

async function debugTemplates() {
  try {
    console.log("=== ALL EMAIL TEMPLATES ===");
    const allTemplates = await prisma.emailTemplate.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        categories: true,
        is_default: true,
        is_active: true,
        created_at: true,
      },
      orderBy: [{ category: "asc" }, { is_default: "desc" }, { name: "asc" }],
    });

    allTemplates.forEach((template) => {
      console.log(`
Name: ${template.name}
Type: ${template.type}
Category: ${template.category || "NULL"}
Is Default: ${template.is_default}
Is Active: ${template.is_active}
ID: ${template.id}
---`);
    });

    console.log("\n=== DEFAULT TEMPLATES BY CATEGORY ===");
    const defaultTemplates = await prisma.emailTemplate.findMany({
      where: {
        is_default: true,
        is_active: true,
      },
      select: {
        id: true,
        name: true,
        type: true,
        categories: true,
      },
      orderBy: { category: "asc" },
    });

    const categoryGroups = {};
    defaultTemplates.forEach((template) => {
      const cat = template.category || "NULL";
      if (!categoryGroups[cat]) categoryGroups[cat] = [];
      categoryGroups[cat].push(template);
    });

    Object.entries(categoryGroups).forEach(([category, templates]) => {
      console.log(
        `\n${category} category: ${templates.length} default template(s)`
      );
      templates.forEach((template) => {
        console.log(`  - ${template.name} (${template.type})`);
      });
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

debugTemplates();
