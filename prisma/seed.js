const { PrismaClient } = require("../app/generated/prisma");

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed...");

  // Create categories
  const engineering = await prisma.category.create({
    data: {
      name: "Engineering",
      description: "Software development and technical roles",
    },
  });

  const marketing = await prisma.category.create({
    data: {
      name: "Marketing",
      description: "Marketing and growth roles",
    },
  });

  const design = await prisma.category.create({
    data: {
      name: "Design",
      description: "UI/UX and creative roles",
    },
  });

  console.log("Categories created!");

  // Create admin user
  const admin = await prisma.adminUser.create({
    data: {
      email: "admin@company.com",
      password: "temp-password-123", // You'll hash this properly later with NextAuth
      firstName: "Admin",
      lastName: "User",
      role: "admin",
    },
  });

  console.log("Admin user created!");

  // Create sample jobs
  const job1 = await prisma.job.create({
    data: {
      title: "Senior Frontend Developer",
      slug: "senior-frontend-developer",
      description:
        "<h2>About the Role</h2><p>We are looking for a senior frontend developer to join our growing engineering team. You will be responsible for building user-facing features and ensuring great user experience.</p><h3>Responsibilities</h3><ul><li>Build responsive web applications using React and TypeScript</li><li>Collaborate with designers and backend developers</li><li>Optimize applications for maximum speed and scalability</li><li>Mentor junior developers</li></ul>",
      summary:
        "Join our team as a senior frontend developer working with React and TypeScript",
      department: "Engineering",
      employmentType: "Full-time",
      experienceLevel: "Senior",
      location: "Toronto, ON",
      remotePolicy: "Hybrid",
      salaryMin: 90000,
      salaryMax: 130000,
      salaryCurrency: "CAD",
      requirements:
        "<ul><li>5+ years of React experience</li><li>Strong TypeScript skills</li><li>Experience with modern CSS frameworks</li><li>Knowledge of testing frameworks (Jest, React Testing Library)</li></ul>",
      preferredQualifications:
        "Experience with Next.js, GraphQL, and cloud platforms",
      educationRequired:
        "Bachelor's degree in Computer Science or equivalent experience",
      yearsExperienceRequired: 5,
      status: "Active",
      featured: true,
      priority: 1,
      categoryId: engineering.id,
      createdBy: admin.id,
      postedAt: new Date(),
    },
  });

  const job2 = await prisma.job.create({
    data: {
      title: "Marketing Manager",
      slug: "marketing-manager",
      description:
        "<h2>About the Role</h2><p>We are seeking a dynamic Marketing Manager to lead our marketing efforts and drive growth. You will develop and execute marketing strategies across multiple channels.</p><h3>Key Responsibilities</h3><ul><li>Develop and implement marketing strategies</li><li>Manage social media and content marketing</li><li>Analyze market trends and competitor activities</li><li>Coordinate with sales team for lead generation</li></ul>",
      summary: "Lead our marketing efforts and drive company growth",
      department: "Marketing",
      employmentType: "Full-time",
      experienceLevel: "Mid",
      location: "Vancouver, BC",
      remotePolicy: "Remote",
      salaryMin: 65000,
      salaryMax: 85000,
      salaryCurrency: "CAD",
      requirements:
        "<ul><li>3+ years of marketing experience</li><li>Strong analytical and communication skills</li><li>Experience with digital marketing tools</li><li>Knowledge of SEO and SEM</li></ul>",
      preferredQualifications:
        "Experience with marketing automation tools, Google Analytics, and A/B testing",
      educationRequired: "Bachelor's degree in Marketing or related field",
      yearsExperienceRequired: 3,
      status: "Active",
      featured: false,
      priority: 2,
      categoryId: marketing.id,
      createdBy: admin.id,
      postedAt: new Date(),
    },
  });

  const job3 = await prisma.job.create({
    data: {
      title: "UI/UX Designer",
      slug: "ui-ux-designer",
      description:
        "<h2>About the Role</h2><p>Join our design team as a UI/UX Designer and help create intuitive, beautiful user experiences. You will work closely with product managers and developers to bring designs to life.</p><h3>What You'll Do</h3><ul><li>Create wireframes, prototypes, and high-fidelity designs</li><li>Conduct user research and usability testing</li><li>Collaborate with cross-functional teams</li><li>Maintain and evolve our design system</li></ul>",
      summary:
        "Create beautiful and intuitive user experiences for our products",
      department: "Design",
      employmentType: "Full-time",
      experienceLevel: "Mid",
      location: "Montreal, QC",
      remotePolicy: "Hybrid",
      salaryMin: 70000,
      salaryMax: 95000,
      salaryCurrency: "CAD",
      requirements:
        "<ul><li>3+ years of UI/UX design experience</li><li>Proficiency in Figma and design tools</li><li>Strong portfolio demonstrating design process</li><li>Understanding of user-centered design principles</li></ul>",
      preferredQualifications:
        "Experience with design systems, prototyping tools, and user research methods",
      educationRequired: "Bachelor's degree in Design or related field",
      yearsExperienceRequired: 3,
      status: "Active",
      featured: false,
      priority: 3,
      categoryId: design.id,
      createdBy: admin.id,
      postedAt: new Date(),
    },
  });

  console.log("Sample jobs created!");

  // Create a sample user
  const user = await prisma.user.create({
    data: {
      email: "john.doe@example.com",
      firstName: "John",
      lastName: "Doe",
      phone: "416-555-0123",
    },
  });

  console.log("Sample user created!");

  // Create a sample application
  await prisma.application.create({
    data: {
      userId: user.id,
      jobId: job1.id,
      status: "Applied",
      coverLetter:
        "I am excited to apply for the Senior Frontend Developer position. With over 5 years of experience in React and TypeScript, I believe I would be a great fit for your team.",
      appliedAt: new Date(),
    },
  });

  console.log("Sample application created!");

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
