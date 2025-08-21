const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

const defaultEmploymentTypes = [
  { name: 'Full-time', description: 'Full-time employment', sort_order: 1 },
  { name: 'Part-time', description: 'Part-time employment', sort_order: 2 },
  { name: 'Contract', description: 'Contract work', sort_order: 3 },
  { name: 'Temporary', description: 'Temporary work', sort_order: 4 },
  { name: 'Freelance', description: 'Freelance work', sort_order: 5 },
  { name: 'Internship', description: 'Internship position', sort_order: 6 }
];

const defaultExperienceLevels = [
  { name: 'Entry Level', description: '0-2 years of experience', sort_order: 1 },
  { name: 'Mid Level', description: '2-5 years of experience', sort_order: 2 },
  { name: 'Senior Level', description: '5+ years of experience', sort_order: 3 },
  { name: 'Lead Level', description: '7+ years with leadership experience', sort_order: 4 },
  { name: 'Executive Level', description: 'Executive or C-level positions', sort_order: 5 }
];

const defaultRemotePolicies = [
  { name: 'On-site', description: 'Work must be performed on-site', sort_order: 1 },
  { name: 'Remote', description: 'Fully remote work allowed', sort_order: 2 },
  { name: 'Hybrid', description: 'Mix of remote and on-site work', sort_order: 3 },
  { name: 'Remote-first', description: 'Remote work preferred with occasional on-site', sort_order: 4 }
];

async function seedJobAttributes() {
  try {
    console.log('🌱 Starting job attributes seeding...');

    // Seed Employment Types
    console.log('📝 Seeding employment types...');
    for (const employmentType of defaultEmploymentTypes) {
      await prisma.employment_types.upsert({
        where: { name: employmentType.name },
        update: {
          description: employmentType.description,
          sort_order: employmentType.sort_order
        },
        create: employmentType
      });
    }
    console.log(`✅ Created/updated ${defaultEmploymentTypes.length} employment types`);

    // Seed Experience Levels
    console.log('🏆 Seeding experience levels...');
    for (const experienceLevel of defaultExperienceLevels) {
      await prisma.experience_levels.upsert({
        where: { name: experienceLevel.name },
        update: {
          description: experienceLevel.description,
          sort_order: experienceLevel.sort_order
        },
        create: experienceLevel
      });
    }
    console.log(`✅ Created/updated ${defaultExperienceLevels.length} experience levels`);

    // Seed Remote Policies
    console.log('🏠 Seeding remote policies...');
    for (const remotePolicy of defaultRemotePolicies) {
      await prisma.remote_policies.upsert({
        where: { name: remotePolicy.name },
        update: {
          description: remotePolicy.description,
          sort_order: remotePolicy.sort_order
        },
        create: remotePolicy
      });
    }
    console.log(`✅ Created/updated ${defaultRemotePolicies.length} remote policies`);

    console.log('🎉 Job attributes seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding job attributes:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding function if this file is called directly
if (require.main === module) {
  seedJobAttributes()
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedJobAttributes };