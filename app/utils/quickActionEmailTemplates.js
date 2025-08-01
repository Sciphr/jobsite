// Quick Action Email Templates for Admin Applications
// These are simple boilerplate templates for mailto links

export const generateInterviewInvitationEmail = (applicantName, jobTitle, companyName = "your company") => {
  const subject = `Interview Invitation - ${jobTitle} Position`;
  
  const body = `Dear ${applicantName},

Thank you for your interest in the ${jobTitle} position at ${companyName}. We were impressed with your application and would like to invite you for an interview.

INTERVIEW DETAILS:
Date: [Please add date]
Time: [Please add time]
Duration: [Please add duration, e.g., 30-45 minutes]
Location/Link: [Please add address or video call link]
Interview Type: [Please specify: In-person, Phone, or Video call]

INTERVIEW FORMAT:
We'll discuss your background, experience, and how you might contribute to our team. Please come prepared to ask any questions you may have about the role or our company.

WHAT TO BRING/PREPARE:
- [Add any specific requirements, e.g., portfolio, references, etc.]
- Questions about the role and company
- [Any other relevant items]

Please reply to confirm your attendance and let us know if you need to reschedule.

We look forward to meeting with you!

Best regards,
[Your name]
[Your title]
${companyName}
[Your contact information]`;

  return {
    subject,
    body,
    mailtoUrl: `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  };
};

export const generateRejectionEmail = (applicantName, jobTitle, companyName = "your company") => {
  const subject = `Application Update - ${jobTitle} Position`;
  
  const body = `Dear ${applicantName},

Thank you for your interest in the ${jobTitle} position at ${companyName} and for taking the time to submit your application.

After careful consideration, we have decided to move forward with other candidates whose qualifications more closely match our current needs for this specific role.

We want to emphasize that this decision does not reflect the quality of your background or potential. We encourage you to:
- Apply for other positions that may be a better fit
- Keep an eye on our careers page for future opportunities
- Connect with us on LinkedIn for updates

We will keep your information on file for [time period, e.g., 6 months] and may reach out if suitable positions become available.

Thank you again for considering ${companyName} as a potential employer. We wish you the best of luck in your job search.

Best regards,
[Your name]
[Your title]
${companyName}
[Your contact information]`;

  return {
    subject,
    body,
    mailtoUrl: `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  };
};

export const generateDocumentRequestEmail = (applicantName, jobTitle, companyName = "your company") => {
  const subject = `Additional Documentation Needed - ${jobTitle} Application`;
  
  const body = `Dear ${applicantName},

Thank you for your application for the ${jobTitle} position at ${companyName}. We are currently reviewing your submission and would like to request some additional documentation to complete our evaluation.

REQUESTED DOCUMENTS:
☐ [Please specify what you need, for example:]
☐ Portfolio samples or work examples
☐ Writing samples
☐ Professional references (3 references)
☐ Certifications or licenses
☐ [Add other specific requirements]

SUBMISSION INSTRUCTIONS:
Please send the requested documents by replying to this email or through our application portal within [timeframe, e.g., 5 business days].

If you have any questions about what we're looking for or need additional time to gather these materials, please don't hesitate to reach out.

We appreciate your continued interest in joining our team.

Best regards,
[Your name]
[Your title]
${companyName}
[Your contact information]`;

  return {
    subject,
    body,
    mailtoUrl: `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  };
};

// Helper function to get applicant info for templates
export const getApplicantDisplayName = (application) => {
  if (application.name) return application.name;
  if (application.user) {
    const firstName = application.user.firstName || '';
    const lastName = application.user.lastName || '';
    return `${firstName} ${lastName}`.trim() || 'there';
  }
  return 'there'; // fallback
};

// Helper function to get job title
export const getJobTitle = (application) => {
  return application.job?.title || 'the position you applied for';
};