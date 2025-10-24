// app/utils/candidateMatching.js

/**
 * Calculate match score between a candidate and a job
 * @param {Object} candidate - Candidate object with skills, experience, etc.
 * @param {Object} job - Job object with requirements
 * @returns {Object} Match score and breakdown
 */
export function calculateMatchScore(candidate, job) {
  const scores = {
    skills: 0,
    experience: 0,
    location: 0,
    availability: 0,
    total: 0,
    percentage: 0,
    breakdown: {},
    missingSkills: [],
    matchedSkills: [],
  };

  // Skills matching (40% weight)
  if (job.required_skills && candidate.skills) {
    const requiredSkills = Array.isArray(job.required_skills)
      ? job.required_skills
      : job.required_skills.split(',').map(s => s.trim().toLowerCase());

    const candidateSkills = candidate.skills.map(s => s.toLowerCase());

    const matchedSkills = requiredSkills.filter(skill =>
      candidateSkills.some(cs =>
        cs.includes(skill) || skill.includes(cs)
      )
    );

    scores.matchedSkills = matchedSkills;
    scores.missingSkills = requiredSkills.filter(skill => !matchedSkills.includes(skill));
    scores.skills = (matchedSkills.length / requiredSkills.length) * 40;
    scores.breakdown.skills = {
      matched: matchedSkills.length,
      required: requiredSkills.length,
      score: scores.skills,
    };
  } else if (!job.required_skills) {
    // No skills required, give full points
    scores.skills = 40;
    scores.breakdown.skills = {
      matched: 0,
      required: 0,
      score: 40,
    };
  }

  // Experience matching (30% weight)
  if (job.min_experience !== undefined && job.min_experience !== null) {
    const candidateExperience = candidate.years_experience || candidate.yearsExperience || 0;
    if (candidateExperience >= job.min_experience) {
      scores.experience = 30;
    } else if (job.min_experience > 0) {
      // Partial credit for having some experience
      scores.experience = (candidateExperience / job.min_experience) * 30;
    }
    scores.breakdown.experience = {
      candidate: candidateExperience,
      required: job.min_experience,
      score: scores.experience,
    };
  } else {
    // No experience requirement, give full points
    scores.experience = 30;
    scores.breakdown.experience = {
      candidate: candidate.years_experience || 0,
      required: 0,
      score: 30,
    };
  }

  // Location matching (20% weight)
  if (job.location && candidate.location) {
    const jobLocation = job.location.toLowerCase();
    const candidateLocation = candidate.location.toLowerCase();

    // Check for exact match or remote
    if (jobLocation.includes('remote') || candidateLocation.includes('remote')) {
      scores.location = 20;
    } else if (candidateLocation.includes(jobLocation) || jobLocation.includes(candidateLocation)) {
      scores.location = 20;
    } else {
      // Check for same city/region (simplified)
      const jobCity = jobLocation.split(',')[0].trim();
      const candidateCity = candidateLocation.split(',')[0].trim();
      if (jobCity === candidateCity) {
        scores.location = 15;
      } else {
        scores.location = 0;
      }
    }
    scores.breakdown.location = {
      candidate: candidate.location,
      job: job.location,
      score: scores.location,
    };
  } else if (job.location?.toLowerCase().includes('remote')) {
    // Remote job, location doesn't matter
    scores.location = 20;
    scores.breakdown.location = {
      candidate: candidate.location || 'Any',
      job: job.location,
      score: 20,
    };
  } else {
    // No location specified or mismatch
    scores.location = 10; // Partial credit
    scores.breakdown.location = {
      candidate: candidate.location || 'Not specified',
      job: job.location || 'Not specified',
      score: 10,
    };
  }

  // Availability (10% weight)
  if (candidate.available_for_opportunities || candidate.availableForOpportunities) {
    scores.availability = 10;
  } else {
    scores.availability = 5; // Partial credit even if not explicitly available
  }
  scores.breakdown.availability = {
    available: candidate.available_for_opportunities || candidate.availableForOpportunities || false,
    score: scores.availability,
  };

  // Calculate total
  scores.total = scores.skills + scores.experience + scores.location + scores.availability;
  scores.percentage = Math.round(scores.total);

  // Determine match level
  if (scores.percentage >= 80) {
    scores.matchLevel = 'excellent';
    scores.matchLabel = 'Excellent Match';
    scores.matchColor = 'green';
  } else if (scores.percentage >= 60) {
    scores.matchLevel = 'good';
    scores.matchLabel = 'Good Match';
    scores.matchColor = 'blue';
  } else if (scores.percentage >= 40) {
    scores.matchLevel = 'fair';
    scores.matchLabel = 'Fair Match';
    scores.matchColor = 'yellow';
  } else {
    scores.matchLevel = 'poor';
    scores.matchLabel = 'Poor Match';
    scores.matchColor = 'gray';
  }

  return scores;
}

/**
 * Find best matching candidates for a job
 * @param {Array} candidates - Array of candidate objects
 * @param {Object} job - Job object
 * @param {Number} limit - Maximum number of candidates to return
 * @returns {Array} Sorted array of candidates with match scores
 */
export function findBestMatches(candidates, job, limit = 10) {
  const candidatesWithScores = candidates.map(candidate => ({
    ...candidate,
    matchScore: calculateMatchScore(candidate, job),
  }));

  // Sort by match percentage descending
  candidatesWithScores.sort((a, b) => b.matchScore.percentage - a.matchScore.percentage);

  return candidatesWithScores.slice(0, limit);
}

/**
 * Find best matching jobs for a candidate
 * @param {Object} candidate - Candidate object
 * @param {Array} jobs - Array of job objects
 * @param {Number} limit - Maximum number of jobs to return
 * @returns {Array} Sorted array of jobs with match scores
 */
export function findBestJobMatches(candidate, jobs, limit = 10) {
  const activeJobs = jobs.filter(job => job.status === 'Active');

  const jobsWithScores = activeJobs.map(job => ({
    ...job,
    matchScore: calculateMatchScore(candidate, job),
  }));

  // Sort by match percentage descending
  jobsWithScores.sort((a, b) => b.matchScore.percentage - a.matchScore.percentage);

  return jobsWithScores.slice(0, limit);
}

/**
 * Get match score color classes for UI
 * @param {Number} percentage - Match percentage
 * @returns {Object} Color classes for text and background
 */
export function getMatchScoreColors(percentage) {
  if (percentage >= 80) {
    return {
      text: 'text-green-700 dark:text-green-400',
      bg: 'bg-green-100 dark:bg-green-900',
      border: 'border-green-300 dark:border-green-700',
    };
  } else if (percentage >= 60) {
    return {
      text: 'text-blue-700 dark:text-blue-400',
      bg: 'bg-blue-100 dark:bg-blue-900',
      border: 'border-blue-300 dark:border-blue-700',
    };
  } else if (percentage >= 40) {
    return {
      text: 'text-yellow-700 dark:text-yellow-400',
      bg: 'bg-yellow-100 dark:bg-yellow-900',
      border: 'border-yellow-300 dark:border-yellow-700',
    };
  } else {
    return {
      text: 'text-gray-700 dark:text-gray-400',
      bg: 'bg-gray-100 dark:bg-gray-800',
      border: 'border-gray-300 dark:border-gray-700',
    };
  }
}