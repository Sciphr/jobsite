// prisma/seed.js
const { PrismaClient } = require("../app/generated/prisma");

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed...");

  // Create Categories
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: "Engineering",
        description: "Software development and engineering positions",
      },
    }),
    prisma.category.create({
      data: {
        name: "Design",
        description: "UI/UX design and creative positions",
      },
    }),
    prisma.category.create({
      data: {
        name: "Marketing",
        description: "Marketing and growth positions",
      },
    }),
    prisma.category.create({
      data: {
        name: "Sales",
        description: "Sales and business development positions",
      },
    }),
    prisma.category.create({
      data: {
        name: "Product",
        description: "Product management and strategy positions",
      },
    }),
  ]);

  console.log("Created categories:", categories.length);

  // Create Admin Users
  const adminUsers = await Promise.all([
    prisma.adminUser.create({
      data: {
        email: "admin@company.com",
        password: "hashedpassword123", // In real app, this would be properly hashed
        firstName: "John",
        lastName: "Smith",
        role: "admin",
      },
    }),
    prisma.adminUser.create({
      data: {
        email: "hr@company.com",
        password: "hashedpassword456",
        firstName: "Sarah",
        lastName: "Johnson",
        role: "hr",
      },
    }),
  ]);

  console.log("Created admin users:", adminUsers.length);

  // Create Jobs
  const jobs = await Promise.all([
    prisma.job.create({
      data: {
        title: "Senior Full Stack Developer",
        slug: "senior-full-stack-developer",
        description:
          "We are looking for a Senior Full Stack Developer to join our growing engineering team. You will be responsible for building scalable web applications using modern technologies.",
        summary:
          "Build scalable web applications with React, Node.js, and PostgreSQL",
        department: "Engineering",
        employmentType: "Full-time",
        experienceLevel: "Senior",
        location: "San Francisco, CA",
        remotePolicy: "Hybrid",
        salaryMin: 120000,
        salaryMax: 180000,
        salaryCurrency: "USD",
        salaryType: "Annual",
        benefits:
          "Health insurance, 401k matching, unlimited PTO, stock options",
        requirements:
          "Bachelor's degree in Computer Science or equivalent experience. 5+ years of experience with React, Node.js, and PostgreSQL. Experience with AWS or similar cloud platforms.",
        preferredQualifications:
          "Experience with TypeScript, GraphQL, and Docker. Previous startup experience preferred.",
        educationRequired: "Bachelor's degree preferred",
        yearsExperienceRequired: 5,
        applicationDeadline: new Date("2025-08-15"),
        startDate: new Date("2025-09-01"),
        applicationInstructions:
          "Please submit your resume and a cover letter explaining your interest in the position.",
        status: "Active",
        featured: true,
        priority: 1,
        categoryId: categories[0].id, // Engineering
        createdBy: adminUsers[0].id,
        postedAt: new Date(),
      },
    }),
    prisma.job.create({
      data: {
        title: "UX/UI Designer",
        slug: "ux-ui-designer",
        description:
          "Join our design team to create beautiful and intuitive user experiences. You will work closely with product managers and engineers to design user-centered solutions.",
        summary:
          "Design beautiful and intuitive user experiences for web and mobile",
        department: "Design",
        employmentType: "Full-time",
        experienceLevel: "Mid",
        location: "New York, NY",
        remotePolicy: "Remote",
        salaryMin: 80000,
        salaryMax: 120000,
        salaryCurrency: "USD",
        salaryType: "Annual",
        benefits:
          "Health insurance, flexible work hours, professional development budget",
        requirements:
          "Portfolio demonstrating UX/UI design skills. 3+ years of experience with Figma, Sketch, or similar design tools. Understanding of user-centered design principles.",
        preferredQualifications:
          "Experience with user research and usability testing. Knowledge of HTML/CSS basics.",
        educationRequired: "Bachelor's degree in Design or related field",
        yearsExperienceRequired: 3,
        applicationDeadline: new Date("2025-07-30"),
        startDate: new Date("2025-08-15"),
        applicationInstructions:
          "Please submit your portfolio along with your resume.",
        status: "Active",
        featured: false,
        priority: 2,
        categoryId: categories[1].id, // Design
        createdBy: adminUsers[1].id,
        postedAt: new Date(),
      },
    }),
    prisma.job.create({
      data: {
        title: "Marketing Manager",
        slug: "marketing-manager",
        description:
          "Lead our marketing efforts to drive brand awareness and customer acquisition. You will develop and execute marketing strategies across multiple channels.",
        summary:
          "Drive brand awareness and customer acquisition through strategic marketing",
        department: "Marketing",
        employmentType: "Full-time",
        experienceLevel: "Mid",
        location: "Austin, TX",
        remotePolicy: "Hybrid",
        salaryMin: 70000,
        salaryMax: 100000,
        salaryCurrency: "USD",
        salaryType: "Annual",
        benefits:
          "Health insurance, retirement plan, marketing conference budget",
        requirements:
          "Bachelor's degree in Marketing or related field. 4+ years of marketing experience. Experience with digital marketing tools and analytics.",
        preferredQualifications:
          "Experience with B2B marketing. Knowledge of SEO and content marketing.",
        educationRequired: "Bachelor's degree in Marketing",
        yearsExperienceRequired: 4,
        applicationDeadline: new Date("2025-08-01"),
        startDate: new Date("2025-08-20"),
        applicationInstructions:
          "Please include examples of successful marketing campaigns you've led.",
        status: "Active",
        featured: true,
        priority: 3,
        categoryId: categories[2].id, // Marketing
        createdBy: adminUsers[0].id,
        postedAt: new Date(),
      },
    }),
    prisma.job.create({
      data: {
        title: "Junior Frontend Developer",
        slug: "junior-frontend-developer",
        description:
          "Great opportunity for a junior developer to grow their skills in a supportive environment. You will work on user-facing features using modern frontend technologies.",
        summary:
          "Build user-facing features with React and modern frontend tools",
        department: "Engineering",
        employmentType: "Full-time",
        experienceLevel: "Entry",
        location: "Remote",
        remotePolicy: "Remote",
        salaryMin: 60000,
        salaryMax: 85000,
        salaryCurrency: "USD",
        salaryType: "Annual",
        benefits: "Health insurance, learning budget, mentorship program",
        requirements:
          "Bachelor's degree in Computer Science or bootcamp graduate. 1+ years of experience with JavaScript and React. Portfolio of projects demonstrating frontend skills.",
        preferredQualifications:
          "Experience with TypeScript and modern CSS frameworks.",
        educationRequired: "Bachelor's degree or bootcamp certificate",
        yearsExperienceRequired: 1,
        applicationDeadline: new Date("2025-07-25"),
        startDate: new Date("2025-08-10"),
        applicationInstructions:
          "Please submit your resume and links to your portfolio projects.",
        status: "Active",
        featured: false,
        priority: 4,
        categoryId: categories[0].id, // Engineering
        createdBy: adminUsers[1].id,
        postedAt: new Date(),
      },
    }),
    prisma.job.create({
      data: {
        title: "Product Manager",
        slug: "product-manager",
        description:
          "Drive product strategy and execution for our core platform. You will work with cross-functional teams to deliver features that delight our users.",
        summary: "Drive product strategy and execution for our core platform",
        department: "Product",
        employmentType: "Full-time",
        experienceLevel: "Senior",
        location: "Seattle, WA",
        remotePolicy: "On-site",
        salaryMin: 130000,
        salaryMax: 170000,
        salaryCurrency: "USD",
        salaryType: "Annual",
        benefits:
          "Health insurance, stock options, unlimited PTO, gym membership",
        requirements:
          "Bachelor's degree in Business, Engineering, or related field. 5+ years of product management experience. Experience with agile development methodologies.",
        preferredQualifications:
          "MBA preferred. Experience in B2B SaaS products. Strong analytical and data-driven decision making skills.",
        educationRequired: "Bachelor's degree required, MBA preferred",
        yearsExperienceRequired: 5,
        applicationDeadline: new Date("2025-08-10"),
        startDate: new Date("2025-09-01"),
        applicationInstructions:
          "Please include examples of products you've successfully launched.",
        status: "Draft",
        featured: false,
        priority: 5,
        categoryId: categories[4].id, // Product
        createdBy: adminUsers[0].id,
      },
    }),
  ]);

  console.log("Created jobs:", jobs.length);

  // Create Regular Users
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: "jane.doe@email.com",
        password: "hashedpassword789",
        firstName: "Jane",
        lastName: "Doe",
        phone: "+1-555-0123",
      },
    }),
    prisma.user.create({
      data: {
        email: "mike.wilson@email.com",
        password: "hashedpassword101",
        firstName: "Mike",
        lastName: "Wilson",
        phone: "+1-555-0456",
      },
    }),
    prisma.user.create({
      data: {
        email: "sarah.chen@email.com",
        password: "hashedpassword202",
        firstName: "Sarah",
        lastName: "Chen",
        phone: "+1-555-0789",
      },
    }),
  ]);

  console.log("Created users:", users.length);

  // Create Applications
  const applications = await Promise.all([
    prisma.application.create({
      data: {
        status: "Applied",
        coverLetter:
          "I am very interested in this position and believe my skills in React and Node.js make me a great fit.",
        resumeUrl: "https://example.com/resume/jane-doe.pdf",
        notes: "Strong portfolio, good communication skills",
        userId: users[0].id,
        jobId: jobs[0].id, // Senior Full Stack Developer
      },
    }),
    prisma.application.create({
      data: {
        status: "Interview",
        coverLetter:
          "I would love to bring my design skills to your team and help create amazing user experiences.",
        resumeUrl: "https://example.com/resume/mike-wilson.pdf",
        notes: "Great design portfolio, scheduled for interview",
        userId: users[1].id,
        jobId: jobs[1].id, // UX/UI Designer
      },
    }),
    prisma.application.create({
      data: {
        status: "Reviewing",
        coverLetter:
          "As a recent bootcamp graduate, I am excited to start my career in frontend development.",
        resumeUrl: "https://example.com/resume/sarah-chen.pdf",
        notes: "Bootcamp graduate, strong motivation",
        userId: users[2].id,
        jobId: jobs[3].id, // Junior Frontend Developer
      },
    }),
  ]);

  console.log("Created applications:", applications.length);

  // Create Saved Jobs
  const savedJobs = await Promise.all([
    prisma.savedJob.create({
      data: {
        userId: users[0].id,
        jobId: jobs[1].id, // Jane saved the UX/UI Designer job
      },
    }),
    prisma.savedJob.create({
      data: {
        userId: users[1].id,
        jobId: jobs[2].id, // Mike saved the Marketing Manager job
      },
    }),
    prisma.savedJob.create({
      data: {
        userId: users[2].id,
        jobId: jobs[0].id, // Sarah saved the Senior Full Stack Developer job
      },
    }),
  ]);

  console.log("Created saved jobs:", savedJobs.length);

  // Create User Resumes
  const userResumes = await Promise.all([
    prisma.userResume.create({
      data: {
        userId: users[0].id,
        fileName: "jane-doe-resume.pdf",
        fileSize: 245760, // 240KB
        fileType: "application/pdf",
        storagePath: "/uploads/resumes/jane-doe-resume.pdf",
        isDefault: true,
      },
    }),
    prisma.userResume.create({
      data: {
        userId: users[1].id,
        fileName: "mike-wilson-resume.pdf",
        fileSize: 189440, // 185KB
        fileType: "application/pdf",
        storagePath: "/uploads/resumes/mike-wilson-resume.pdf",
        isDefault: true,
      },
    }),
    prisma.userResume.create({
      data: {
        userId: users[2].id,
        fileName: "sarah-chen-resume.pdf",
        fileSize: 312320, // 305KB
        fileType: "application/pdf",
        storagePath: "/uploads/resumes/sarah-chen-resume.pdf",
        isDefault: true,
      },
    }),
  ]);

  console.log("Created user resumes:", userResumes.length);

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
