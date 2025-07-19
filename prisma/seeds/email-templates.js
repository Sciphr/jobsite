// prisma/seeds/email-templates.js
const { PrismaClient } = require("../../app/generated/prisma");

const prisma = new PrismaClient();

const defaultEmailTemplates = [
  // Applied Status Templates
  {
    name: "Application Received Confirmation",
    subject: "Application Received - {{jobTitle}} Position",
    content: `Dear {{candidateName}},

Thank you for applying for the {{jobTitle}} position at {{companyName}}. We have received your application and our team will review it carefully.

We will be in touch within {{reviewTimeframe}} to let you know about next steps.

If you have any questions, please don't hesitate to reach out.

Best regards,
{{senderName}}
{{companyName}} Hiring Team`,
    type: "Applied",
    description: "Confirmation email sent when application is received",
    variables: [
      "candidateName",
      "jobTitle", 
      "companyName",
      "reviewTimeframe",
      "senderName"
    ],
  },
  {
    name: "Request Additional Information",
    subject: "Additional Information Needed - {{jobTitle}} Application",
    content: `Dear {{candidateName}},

Thank you for your application for the {{jobTitle}} position. We are interested in learning more about your background.

Could you please provide the following additional information:
• {{requestedInfo}}

Please reply to this email with the requested information at your earliest convenience.

Best regards,
{{senderName}}
{{companyName}} Hiring Team`,
    type: "Applied",
    description: "Request additional information from candidate",
    variables: [
      "candidateName",
      "jobTitle",
      "companyName", 
      "requestedInfo",
      "senderName"
    ],
  },

  // Reviewing Status Templates
  {
    name: "Application Under Review",
    subject: "Application Update - {{jobTitle}} Position",
    content: `Dear {{candidateName}},

We wanted to update you on your application for the {{jobTitle}} position at {{companyName}}.

Your application is currently under review by our hiring team. We are carefully evaluating all candidates and will be in touch with next steps within {{timeframe}}.

Thank you for your patience during this process.

Best regards,
{{senderName}}
{{companyName}} Hiring Team`,
    type: "Reviewing",
    description: "Update email during review process",
    variables: [
      "candidateName",
      "jobTitle",
      "companyName",
      "timeframe",
      "senderName"
    ],
  },

  // Interview Status Templates
  {
    name: "Interview Invitation",
    subject: "Interview Invitation - {{jobTitle}} Position",
    content: `Dear {{candidateName}},

Congratulations! We were impressed with your application for the {{jobTitle}} position and would like to invite you for an interview.

Interview Details:
• Position: {{jobTitle}}
• Department: {{department}}
• Date: {{interviewDate}}
• Time: {{interviewTime}}
• Duration: {{duration}}
• Format: {{interviewFormat}}
• Location/Link: {{interviewLocation}}

Please confirm your availability by replying to this email. If you need to reschedule, please let us know as soon as possible.

We look forward to speaking with you!

Best regards,
{{senderName}}
{{companyName}} Hiring Team`,
    type: "Interview",
    description: "Invitation to interview",
    variables: [
      "candidateName",
      "jobTitle",
      "department",
      "interviewDate",
      "interviewTime", 
      "duration",
      "interviewFormat",
      "interviewLocation",
      "senderName",
      "companyName"
    ],
  },
  {
    name: "Interview Confirmation",
    subject: "Interview Confirmed - {{jobTitle}} Position",
    content: `Dear {{candidateName}},

This email confirms your upcoming interview for the {{jobTitle}} position.

Interview Details:
• Date: {{interviewDate}}
• Time: {{interviewTime}}
• Duration: {{duration}}
• Format: {{interviewFormat}}
• {{interviewDetails}}

What to expect:
• {{interviewExpectations}}

If you have any questions or need to make changes, please contact us immediately.

Best regards,
{{senderName}}
{{companyName}} Hiring Team`,
    type: "Interview",
    description: "Interview confirmation email",
    variables: [
      "candidateName",
      "jobTitle",
      "interviewDate",
      "interviewTime",
      "duration", 
      "interviewFormat",
      "interviewDetails",
      "interviewExpectations",
      "senderName",
      "companyName"
    ],
  },

  // Hired Status Templates
  {
    name: "Job Offer",
    subject: "Congratulations! Job Offer - {{jobTitle}} Position",
    content: `Dear {{candidateName}},

Congratulations! We are delighted to offer you the position of {{jobTitle}} at {{companyName}}.

Offer Details:
• Position: {{jobTitle}}
• Department: {{department}}
• Start Date: {{startDate}}
• Salary: {{salary}}
• Benefits: {{benefits}}

Please review the attached offer letter carefully. To accept this offer, please reply to this email and return the signed documents by {{deadline}}.

If you have any questions about the offer, please don't hesitate to reach out.

Welcome to the team!

Best regards,
{{senderName}}
{{companyName}} Hiring Team`,
    type: "Hired",
    description: "Job offer email",
    variables: [
      "candidateName",
      "jobTitle",
      "companyName",
      "department",
      "startDate",
      "salary",
      "benefits", 
      "deadline",
      "senderName"
    ],
  },

  // Rejected Status Templates
  {
    name: "Application Not Selected",
    subject: "Application Update - {{jobTitle}} Position",
    content: `Dear {{candidateName}},

Thank you for your interest in the {{jobTitle}} position at {{companyName}} and for taking the time to apply.

After careful consideration, we have decided to move forward with other candidates whose experience more closely matches our current needs.

We were impressed with your qualifications and encourage you to apply for future positions that match your skills and experience. We will keep your information on file and may reach out if suitable opportunities arise.

Thank you again for your interest in {{companyName}}.

Best regards,
{{senderName}}
{{companyName}} Hiring Team`,
    type: "Rejected",
    description: "Polite rejection email",
    variables: [
      "candidateName",
      "jobTitle",
      "companyName",
      "senderName"
    ],
  },
  {
    name: "Post-Interview Rejection",
    subject: "Interview Follow-up - {{jobTitle}} Position",
    content: `Dear {{candidateName}},

Thank you for taking the time to interview for the {{jobTitle}} position at {{companyName}}. We enjoyed our conversation and learning more about your background.

After careful consideration of all candidates, we have decided to move forward with another candidate whose experience more closely aligns with our specific requirements.

We appreciate the time and effort you put into the interview process. Your skills and experience are impressive, and we encourage you to apply for future opportunities that may be a better fit.

Thank you again for your interest in {{companyName}}.

Best regards,
{{senderName}}
{{companyName}} Hiring Team`,
    type: "Rejected",
    description: "Rejection email after interview",
    variables: [
      "candidateName",
      "jobTitle",
      "companyName",
      "senderName"
    ],
  },
];

async function seedEmailTemplates() {
  console.log("🌱 Seeding email templates...");

  try {
    // First, check if templates already exist
    const existingTemplates = await prisma.emailTemplate.findMany({
      where: { is_default: true },
    });

    if (existingTemplates.length > 0) {
      console.log("📧 Default email templates already exist, skipping seed");
      return;
    }

    // Create default templates
    for (const template of defaultEmailTemplates) {
      await prisma.emailTemplate.create({
        data: {
          name: template.name,
          subject: template.subject,
          content: template.content,
          type: template.type,
          description: template.description,
          variables: JSON.stringify(template.variables),
          is_default: true,
          is_active: true,
          created_by: null, // System templates
        },
      });
    }

    console.log(`✅ Created ${defaultEmailTemplates.length} default email templates`);
  } catch (error) {
    console.error("❌ Error seeding email templates:", error);
    throw error;
  }
}

module.exports = { seedEmailTemplates };

if (require.main === module) {
  seedEmailTemplates()
    .then(() => {
      console.log("✅ Email templates seeded successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Email templates seeding failed:", error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}