/**
 * Email template utilities for job sharing
 */

/**
 * Generate a formatted plain text email body for sharing a job posting
 * @param {Object} job - Job object with all job details
 * @param {string} siteUrl - Base URL of the site (e.g., 'https://yourjobsite.com')
 * @returns {string} Formatted plain text email body
 */
export function generateJobShareEmailBody(job, siteUrl = '') {
  const lines = [];
  
  lines.push('Hi!');
  lines.push('');
  lines.push('I found this job opportunity that might interest you:');
  lines.push('');
  lines.push(`Job Title: ${job.title}`);
  lines.push(`Company: ${job.department}`);
  lines.push(`Location: ${job.location}`);
  
  // Add salary if it's shown
  if (job.showSalary && job.salaryMin && job.salaryMax) {
    const salaryRange = `${job.salaryCurrency || '$'} ${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()}`;
    lines.push(`Salary: ${salaryRange}${job.salaryPeriod ? ` per ${job.salaryPeriod}` : ''}`);
  }
  
  lines.push(`Employment Type: ${job.employmentType}`);
  lines.push(`Experience Level: ${job.experienceLevel}`);
  
  if (job.remotePolicy) {
    lines.push(`Remote Policy: ${job.remotePolicy}`);
  }
  
  lines.push('');
  
  // Add job summary if available
  if (job.summary) {
    lines.push('Description:');
    lines.push(job.summary);
    lines.push('');
  }
  
  // Add application deadline if available
  if (job.applicationDeadline) {
    lines.push(`Application Deadline: ${new Date(job.applicationDeadline).toLocaleDateString()}`);
    lines.push('');
  }
  
  // Add job link
  const jobUrl = `${siteUrl}/jobs/${job.slug}`;
  lines.push(`Apply here: ${jobUrl}`);
  lines.push('');
  lines.push('Best regards!');
  
  return lines.join('\n');
}

/**
 * Generate a subject line for job sharing email
 * @param {Object} job - Job object with job details
 * @returns {string} Email subject line
 */
export function generateJobShareEmailSubject(job) {
  return `Job Opportunity: ${job.title} at ${job.department}`;
}

/**
 * Generate a complete mailto URL for sharing a job
 * @param {Object} job - Job object with all job details
 * @param {string} siteUrl - Base URL of the site
 * @returns {string} Complete mailto URL with encoded parameters
 */
export function generateJobShareMailtoUrl(job, siteUrl = '') {
  const subject = generateJobShareEmailSubject(job);
  const body = generateJobShareEmailBody(job, siteUrl);
  
  // URL encode the parameters
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);
  
  return `mailto:?subject=${encodedSubject}&body=${encodedBody}`;
}