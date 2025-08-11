// prisma/seeds/applications.js
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const candidateData = [
  {
    firstName: "Sarah",
    lastName: "Johnson",
    email: "sarah.johnson@email.com",
    phone: "+1-555-0101",
  },
  {
    firstName: "Michael",
    lastName: "Chen",
    email: "michael.chen@email.com",
    phone: "+1-555-0102",
  },
  {
    firstName: "Emily",
    lastName: "Rodriguez",
    email: "emily.rodriguez@email.com",
    phone: "+1-555-0103",
  },
  {
    firstName: "David",
    lastName: "Kim",
    email: "david.kim@email.com",
    phone: "+1-555-0104",
  },
  {
    firstName: "Jessica",
    lastName: "Williams",
    email: "jessica.williams@email.com",
    phone: "+1-555-0105",
  },
  {
    firstName: "Robert",
    lastName: "Taylor",
    email: "robert.taylor@email.com",
    phone: "+1-555-0106",
  },
  {
    firstName: "Amanda",
    lastName: "Brown",
    email: "amanda.brown@email.com",
    phone: "+1-555-0107",
  },
  {
    firstName: "James",
    lastName: "Davis",
    email: "james.davis@email.com",
    phone: "+1-555-0108",
  },
  {
    firstName: "Lisa",
    lastName: "Miller",
    email: "lisa.miller@email.com",
    phone: "+1-555-0109",
  },
  {
    firstName: "Christopher",
    lastName: "Wilson",
    email: "christopher.wilson@email.com",
    phone: "+1-555-0110",
  },
  {
    firstName: "Ashley",
    lastName: "Moore",
    email: "ashley.moore@email.com",
    phone: "+1-555-0111",
  },
  {
    firstName: "Matthew",
    lastName: "Anderson",
    email: "matthew.anderson@email.com",
    phone: "+1-555-0112",
  },
  {
    firstName: "Jennifer",
    lastName: "Thomas",
    email: "jennifer.thomas@email.com",
    phone: "+1-555-0113",
  },
  {
    firstName: "Andrew",
    lastName: "Jackson",
    email: "andrew.jackson@email.com",
    phone: "+1-555-0114",
  },
  {
    firstName: "Stephanie",
    lastName: "White",
    email: "stephanie.white@email.com",
    phone: "+1-555-0115",
  },
  {
    firstName: "Daniel",
    lastName: "Harris",
    email: "daniel.harris@email.com",
    phone: "+1-555-0116",
  },
  {
    firstName: "Michelle",
    lastName: "Martin",
    email: "michelle.martin@email.com",
    phone: "+1-555-0117",
  },
  {
    firstName: "Kevin",
    lastName: "Thompson",
    email: "kevin.thompson@email.com",
    phone: "+1-555-0118",
  },
  {
    firstName: "Nicole",
    lastName: "Garcia",
    email: "nicole.garcia@email.com",
    phone: "+1-555-0119",
  },
  {
    firstName: "Ryan",
    lastName: "Martinez",
    email: "ryan.martinez@email.com",
    phone: "+1-555-0120",
  },
  {
    firstName: "Samantha",
    lastName: "Robinson",
    email: "samantha.robinson@email.com",
    phone: "+1-555-0121",
  },
  {
    firstName: "Brandon",
    lastName: "Clark",
    email: "brandon.clark@email.com",
    phone: "+1-555-0122",
  },
  {
    firstName: "Rachel",
    lastName: "Lewis",
    email: "rachel.lewis@email.com",
    phone: "+1-555-0123",
  },
  {
    firstName: "Jason",
    lastName: "Lee",
    email: "jason.lee@email.com",
    phone: "+1-555-0124",
  },
  {
    firstName: "Megan",
    lastName: "Walker",
    email: "megan.walker@email.com",
    phone: "+1-555-0125",
  },
  {
    firstName: "Tyler",
    lastName: "Hall",
    email: "tyler.hall@email.com",
    phone: "+1-555-0126",
  },
  {
    firstName: "Lauren",
    lastName: "Allen",
    email: "lauren.allen@email.com",
    phone: "+1-555-0127",
  },
  {
    firstName: "Justin",
    lastName: "Young",
    email: "justin.young@email.com",
    phone: "+1-555-0128",
  },
  {
    firstName: "Brittany",
    lastName: "King",
    email: "brittany.king@email.com",
    phone: "+1-555-0129",
  },
  {
    firstName: "Adam",
    lastName: "Wright",
    email: "adam.wright@email.com",
    phone: "+1-555-0130",
  },
];

const coverLetters = [
  "Dear Hiring Manager,\n\nI am excited to apply for this position as it aligns perfectly with my career goals and expertise. With my strong background in the field and passion for innovation, I believe I would be a valuable addition to your team.\n\nThank you for your consideration.\n\nBest regards,",

  "Hello,\n\nI was thrilled to discover this opportunity on your website. My experience and skills make me an ideal candidate for this role. I am particularly drawn to your company's mission and values.\n\nI look forward to discussing how I can contribute to your team.\n\nSincerely,",

  "Dear Team,\n\nI am writing to express my strong interest in this position. Having researched your company extensively, I am impressed by your commitment to excellence and innovation. My background and enthusiasm make me a perfect fit.\n\nThank you for your time and consideration.\n\nWarm regards,",

  "To Whom It May Concern,\n\nI am applying for this role because I believe my skills and experience align well with your requirements. I am excited about the opportunity to grow with your organization.\n\nI appreciate your consideration.\n\nBest,",

  "Dear Hiring Team,\n\nThis position represents exactly the kind of opportunity I have been seeking. My professional background and personal interests align perfectly with your company's goals and culture.\n\nI would welcome the chance to discuss my qualifications further.\n\nRespectfully,",
];

const statuses = ["Applied", "Reviewing", "Interview", "Hired", "Rejected"];
const statusWeights = [0.4, 0.3, 0.15, 0.1, 0.05]; // 40% Applied, 30% Reviewing, etc.

function getRandomStatus() {
  const rand = Math.random();
  let cumulative = 0;

  for (let i = 0; i < statusWeights.length; i++) {
    cumulative += statusWeights[i];
    if (rand <= cumulative) {
      return statuses[i];
    }
  }
  return statuses[0];
}

function getRandomDate() {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * 90); // 0-90 days ago
  const hoursAgo = Math.floor(Math.random() * 24);
  const minutesAgo = Math.floor(Math.random() * 60);

  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);
  date.setHours(date.getHours() - hoursAgo);
  date.setMinutes(date.getMinutes() - minutesAgo);

  return date;
}

async function seedApplications() {
  try {
    console.log("🌱 Starting application seeding...");

    // Get all existing jobs
    const jobs = await prisma.job.findMany({
      where: {
        status: "Active",
      },
    });

    if (jobs.length === 0) {
      console.log("❌ No active jobs found. Please create some jobs first.");
      return;
    }

    console.log(`📋 Found ${jobs.length} active jobs`);

    let totalApplicationsCreated = 0;

    // For each job, create a random number of applications (0-8)
    for (const job of jobs) {
      const numApplications = Math.floor(Math.random() * 9); // 0-8 applications per job
      console.log(
        `📝 Creating ${numApplications} applications for "${job.title}"`
      );

      if (numApplications === 0) {
        console.log(`   ⚠️  No applications for "${job.title}"`);
        continue;
      }

      // Shuffle candidates and pick random ones
      const shuffledCandidates = [...candidateData].sort(
        () => Math.random() - 0.5
      );
      const selectedCandidates = shuffledCandidates.slice(0, numApplications);

      for (const candidate of selectedCandidates) {
        const status = getRandomStatus();
        const appliedAt = getRandomDate();

        // Create application
        const application = await prisma.application.create({
          data: {
            jobId: job.id,
            name: `${candidate.firstName} ${candidate.lastName}`,
            email: candidate.email,
            phone: candidate.phone,
            status: status,
            appliedAt: appliedAt,
            coverLetter: `${coverLetters[Math.floor(Math.random() * coverLetters.length)]}\n\n${candidate.firstName} ${candidate.lastName}`,
            resumeUrl: `https://example.com/resumes/${candidate.firstName.toLowerCase()}-${candidate.lastName.toLowerCase()}-resume.pdf`,
            notes:
              Math.random() > 0.7
                ? `Initial screening notes for ${candidate.firstName} ${candidate.lastName}. Strong candidate with relevant experience.`
                : null,
          },
        });

        console.log(
          `   ✅ Created application: ${candidate.firstName} ${candidate.lastName} (${status})`
        );
        totalApplicationsCreated++;
      }

      // Update job's application count
      await prisma.job.update({
        where: { id: job.id },
        data: { applicationCount: numApplications },
      });
    }

    console.log(
      `\n🎉 Successfully created ${totalApplicationsCreated} applications across ${jobs.length} jobs!`
    );

    // Print summary by status
    const statusCounts = await prisma.application.groupBy({
      by: ["status"],
      _count: {
        status: true,
      },
    });

    console.log("\n📊 Application Status Summary:");
    statusCounts.forEach(({ status, _count }) => {
      console.log(`   ${status}: ${_count.status}`);
    });
  } catch (error) {
    console.error("❌ Error seeding applications:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function if this file is executed directly
if (require.main === module) {
  seedApplications();
}

module.exports = { seedApplications };
