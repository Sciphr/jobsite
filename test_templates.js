// Quick test to check template data
const { PrismaClient } = require('./app/generated/prisma');

const prisma = new PrismaClient();

async function checkTemplates() {
  try {
    const templates = await prisma.emailTemplate.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        category: true,
        tags: true,
        usage_count: true,
        is_active: true
      }
    });

    console.log('Total templates:', templates.length);
    console.log('\nTemplate data:');
    
    templates.forEach(template => {
      console.log({
        name: template.name,
        type: template.type,
        category: template.category,
        tags: template.tags,
        usage_count: template.usage_count
      });
    });

    // Count by category
    const categoryCounts = templates.reduce((acc, template) => {
      const cat = template.category || 'NULL';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});

    console.log('\nCategory counts:', categoryCounts);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTemplates();