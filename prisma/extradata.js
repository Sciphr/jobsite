const { PrismaClient } = require("../app/generated/prisma");

const prisma = new PrismaClient();

// Helper function to generate slug from title
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Sample data arrays
const jobTitles = [
  "Senior Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "DevOps Engineer",
  "Data Scientist",
  "Product Manager",
  "UX/UI Designer",
  "Marketing Manager",
  "Sales Representative",
  "Customer Success Manager",
  "Business Analyst",
  "Project Manager",
  "QA Engineer",
  "Mobile Developer",
  "Data Analyst",
  "Content Writer",
  "HR Specialist",
  "Financial Analyst",
  "Operations Manager",
  "Digital Marketing Specialist",
  "Cloud Architect",
  "Security Engineer",
  "Machine Learning Engineer",
  "Product Designer",
  "Technical Writer",
  "Scrum Master",
  "Database Administrator",
  "IT Support Specialist",
  "Account Manager",
  "Social Media Manager",
  "Legal Counsel",
  "Recruiter",
  "Research Scientist",
  "Supply Chain Manager",
  "Quality Assurance Manager",
  "Software Architect",
  "Brand Manager",
  "Graphic Designer",
  "Video Editor",
  "Customer Support Specialist",
  "Business Development Manager",
  "System Administrator",
  "Network Engineer",
  "Web Developer",
  "Mobile App Designer",
  "E-commerce Manager",
  "SEO Specialist",
  "Content Marketing Manager",
  "Sales Manager",
];

const departments = [
  "Engineering",
  "Marketing",
  "Sales",
  "Human Resources",
  "Finance",
  "Operations",
  "Product",
  "Design",
  "Customer Success",
  "Legal",
  "Research & Development",
  "IT",
  "Business Development",
  "Quality Assurance",
  "Data & Analytics",
];

const employmentTypes = ["Full-time", "Part-time", "Contract", "Internship"];
const experienceLevels = ["Entry", "Mid", "Senior", "Executive"];
const locations = [
  "New York, NY",
  "San Francisco, CA",
  "Los Angeles, CA",
  "Chicago, IL",
  "Austin, TX",
  "Seattle, WA",
  "Boston, MA",
  "Denver, CO",
  "Miami, FL",
  "Atlanta, GA",
  "Portland, OR",
  "Nashville, TN",
  "Toronto, ON",
  "Vancouver, BC",
  "London, UK",
  "Berlin, Germany",
  "Amsterdam, Netherlands",
  "Sydney, Australia",
  "Tokyo, Japan",
  "Singapore",
];

const remotePolicies = ["Remote", "Hybrid", "On-site"];
const statuses = ["Active", "Active", "Active", "Active", "Paused", "Draft"]; // Weighted toward Active

const jobDescriptions = [
  "We are looking for a talented professional to join our dynamic team. You will be responsible for driving innovation and delivering exceptional results in a fast-paced environment.",
  "Join our growing company and make a significant impact on our products and services. We offer competitive compensation and excellent growth opportunities.",
  "Exciting opportunity to work with cutting-edge technology and collaborate with a world-class team. We value creativity, innovation, and professional development.",
  "We are seeking a motivated individual to contribute to our mission of transforming the industry. This role offers great learning opportunities and career advancement.",
  "Be part of a company that values work-life balance and professional growth. You will work on challenging projects with supportive colleagues.",
  "Join our team and help us build the future of technology. We offer a collaborative environment where your ideas and contributions are valued.",
  "Opportunity to work in a diverse and inclusive environment where innovation thrives. We are committed to fostering talent and driving excellence.",
  "We are looking for someone passionate about making a difference. This role offers the chance to work on meaningful projects with global impact.",
  "Join our mission to revolutionize the industry through innovative solutions. We offer comprehensive benefits and opportunities for professional development.",
  "Be part of a team that is changing the way people work and live. We value collaboration, creativity, and continuous learning.",
];

const requirements = [
  "Bachelor's degree in relevant field or equivalent experience. Strong analytical and problem-solving skills. Excellent communication and teamwork abilities.",
  "Proven experience in the field with demonstrated results. Strong technical skills and ability to work in a fast-paced environment.",
  "Relevant degree or certification. Experience with industry-standard tools and technologies. Strong attention to detail and project management skills.",
  "Professional experience in related role. Excellent written and verbal communication skills. Ability to work independently and as part of a team.",
  "Strong background in relevant field. Experience with agile methodologies and cross-functional collaboration. Passion for continuous learning and improvement.",
  "Relevant educational background or equivalent experience. Strong analytical thinking and problem-solving capabilities. Excellent interpersonal skills.",
  "Demonstrated experience in similar role. Strong organizational skills and ability to manage multiple priorities. Proficiency in relevant software and tools.",
  "Educational background in relevant field. Experience with project management and stakeholder communication. Strong leadership and mentoring skills.",
  "Professional certification or relevant experience. Excellent customer service and relationship-building skills. Ability to work in a dynamic environment.",
  "Strong foundation in relevant discipline. Experience with data analysis and reporting. Excellent presentation and communication skills.",
];

const benefits = [
  "Health, dental, and vision insurance. 401(k) with company match. Flexible PTO and remote work options. Professional development budget.",
  "Comprehensive health coverage. Stock options and equity participation. Generous parental leave. Learning and development opportunities.",
  "Medical, dental, and vision benefits. Flexible work arrangements. Wellness programs and gym membership. Career advancement opportunities.",
  "Full health and wellness benefits. Retirement savings plan. Paid time off and holidays. Professional training and certification support.",
  "Complete benefits package including health insurance. Work-from-home stipend. Team building activities and company events. Mentorship programs.",
  "Health and wellness benefits. Flexible scheduling and remote work. Professional development fund. Employee recognition programs.",
  "Comprehensive medical coverage. Equity compensation program. Unlimited vacation policy. Conference and training budget.",
  "Health, dental, and vision insurance. 401(k) retirement plan. Flexible work environment. Innovation time and hackathons.",
  "Full benefits package. Performance bonuses and incentives. Work-life balance initiatives. Continuing education support.",
  "Medical and wellness benefits. Equity participation. Flexible PTO policy. Technology and equipment allowances.",
];

async function main() {
  console.log("Starting job seeding...");

  // First, let's create some categories if they don't exist
  const categoryNames = [
    "Engineering",
    "Marketing",
    "Sales",
    "Design",
    "Operations",
    "Finance",
    "HR",
    "Legal",
    "Product",
    "Customer Success",
  ];

  for (const categoryName of categoryNames) {
    await prisma.category.upsert({
      where: { name: categoryName },
      update: {},
      create: {
        name: categoryName,
        description: `Jobs in ${categoryName} department`,
      },
    });
  }

  // Get all categories for reference
  const categories = await prisma.category.findMany();

  // Create 50 jobs
  const jobs = [];
  for (let i = 0; i < 50; i++) {
    const title = jobTitles[Math.floor(Math.random() * jobTitles.length)];
    const slug = generateSlug(title) + "-" + (i + 1);
    const department =
      departments[Math.floor(Math.random() * departments.length)];
    const employmentType =
      employmentTypes[Math.floor(Math.random() * employmentTypes.length)];
    const experienceLevel =
      experienceLevels[Math.floor(Math.random() * experienceLevels.length)];
    const location = locations[Math.floor(Math.random() * locations.length)];
    const remotePolicy =
      remotePolicies[Math.floor(Math.random() * remotePolicies.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const category = categories[Math.floor(Math.random() * categories.length)];

    // Generate salary ranges based on experience level
    let salaryMin, salaryMax;
    switch (experienceLevel) {
      case "Entry":
        salaryMin = 40000 + Math.floor(Math.random() * 20000);
        salaryMax = salaryMin + 20000 + Math.floor(Math.random() * 15000);
        break;
      case "Mid":
        salaryMin = 60000 + Math.floor(Math.random() * 30000);
        salaryMax = salaryMin + 25000 + Math.floor(Math.random() * 20000);
        break;
      case "Senior":
        salaryMin = 90000 + Math.floor(Math.random() * 40000);
        salaryMax = salaryMin + 30000 + Math.floor(Math.random() * 25000);
        break;
      case "Executive":
        salaryMin = 130000 + Math.floor(Math.random() * 70000);
        salaryMax = salaryMin + 50000 + Math.floor(Math.random() * 50000);
        break;
    }

    const job = {
      title,
      slug,
      description:
        jobDescriptions[Math.floor(Math.random() * jobDescriptions.length)],
      summary: `${title} position in ${department} department. ${experienceLevel} level role with ${employmentType} employment type.`,
      department,
      employmentType,
      experienceLevel,
      location,
      remotePolicy,
      salaryMin,
      salaryMax,
      salaryCurrency: "USD",
      salaryType: "Annual",
      benefits: benefits[Math.floor(Math.random() * benefits.length)],
      requirements:
        requirements[Math.floor(Math.random() * requirements.length)],
      preferredQualifications:
        "Experience with modern tools and technologies. Strong problem-solving skills. Excellent communication abilities.",
      educationRequired:
        Math.random() > 0.3
          ? "Bachelor's degree or equivalent experience"
          : null,
      yearsExperienceRequired:
        experienceLevel === "Entry"
          ? 0
          : experienceLevel === "Mid"
            ? 2 + Math.floor(Math.random() * 3)
            : experienceLevel === "Senior"
              ? 5 + Math.floor(Math.random() * 3)
              : 8 + Math.floor(Math.random() * 5),
      applicationDeadline:
        Math.random() > 0.7
          ? new Date(
              Date.now() + Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000
            )
          : null,
      startDate:
        Math.random() > 0.5
          ? new Date(
              Date.now() + Math.floor(Math.random() * 60) * 24 * 60 * 60 * 1000
            )
          : null,
      applicationInstructions:
        "Please submit your resume and cover letter through our application portal. We will review all applications and contact qualified candidates within 2 weeks.",
      status,
      featured: Math.random() > 0.8,
      showSalary: Math.random() > 0.2,
      priority: Math.floor(Math.random() * 5),
      viewCount: Math.floor(Math.random() * 500),
      applicationCount: Math.floor(Math.random() * 25),
      postedAt:
        status === "Active"
          ? new Date(
              Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000
            )
          : null,
      autoExpiresAt:
        Math.random() > 0.6
          ? new Date(
              Date.now() + Math.floor(Math.random() * 120) * 24 * 60 * 60 * 1000
            )
          : null,
      categoryId: category.id,
      createdBy: null, // Since you made this nullable, we'll leave it null for seed data
    };

    jobs.push(job);
  }

  // Insert all jobs
  for (const job of jobs) {
    await prisma.job.create({
      data: job,
    });
  }

  console.log(`Successfully seeded ${jobs.length} jobs!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
