// AI Rating Service for Resume Analysis
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// Initialize AI clients
let openai = null;
let claude = null;

function initializeOpenAI() {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

function initializeClaude() {
  if (!claude && process.env.ANTHROPIC_API_KEY) {
    claude = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return claude;
}

/**
 * Rate a job application using AI
 * @param {Object} application - The application object
 * @param {Object} job - The job object
 * @param {string} resumeText - Extracted text from resume (optional)
 * @returns {Promise<number>} Rating from 1-5
 */
export async function rateApplicationWithAI(application, job, resumeText = '') {
  const aiProvider = process.env.AI_PROVIDER || 'fallback';
  
  console.log(`Using AI provider: ${aiProvider} for application:`, application.id);
  
  // Skip AI entirely if requested
  if (process.env.SKIP_OPENAI_API === 'true' || aiProvider === 'fallback') {
    console.log('Using fallback algorithm');
    return getFallbackRating(application, job, resumeText);
  }

  try {
    const prompt = buildRatingPrompt(application, job, resumeText);
    let rating;

    switch (aiProvider) {
      case 'claude':
        rating = await rateWithClaude(prompt, application.id);
        break;
      case 'openai':
        rating = await rateWithOpenAI(prompt, application.id);
        break;
      default:
        console.warn('Unknown AI provider:', aiProvider, 'using fallback');
        return getFallbackRating(application, job, resumeText);
    }

    // Validate the rating is between 1-5
    if (isNaN(rating) || rating < 1 || rating > 5) {
      console.warn('AI returned invalid rating:', rating, 'defaulting to 3');
      return 3;
    }

    console.log('Successfully rated application:', application.id, 'with rating:', rating);
    return rating;

  } catch (error) {
    console.error('Error rating application with AI:', error);
    
    // If quota exceeded or any API error, use fallback
    if (error.status === 429 || error.code === 'insufficient_quota' || error.name === 'APIError') {
      console.log('AI API error, using fallback algorithm');
      return getFallbackRating(application, job, resumeText);
    }
    
    return getFallbackRating(application, job, resumeText);
  }
}

/**
 * Rate application using Claude API
 */
async function rateWithClaude(prompt, applicationId) {
  const client = initializeClaude();
  
  if (!client) {
    throw new Error('Claude not configured');
  }

  console.log('Making Claude API call for application:', applicationId);
  
  const message = await client.messages.create({
    model: "claude-3-haiku-20240307", // Fast, cost-effective model
    max_tokens: 10,
    temperature: 0.3,
    system: "You are an expert HR professional who rates job applications. You must return ONLY a number from 1 to 5, nothing else.",
    messages: [
      {
        role: "user",
        content: prompt
      }
    ]
  });

  const ratingText = message.content[0].text.trim();
  const rating = parseInt(ratingText);
  
  console.log('Claude API response:', ratingText);
  console.log('Parsed rating:', rating);
  
  return rating;
}

/**
 * Rate application using OpenAI API
 */
async function rateWithOpenAI(prompt, applicationId) {
  const client = initializeOpenAI();
  
  if (!client) {
    throw new Error('OpenAI not configured');
  }

  console.log('Making OpenAI API call for application:', applicationId);
  
  const completion = await client.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: "You are an expert HR professional who rates job applications. You must return ONLY a number from 1 to 5, nothing else."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    max_tokens: 10,
    temperature: 0.3,
  });

  const ratingText = completion.choices[0].message.content.trim();
  const rating = parseInt(ratingText);
  
  console.log('OpenAI API response:', ratingText);
  console.log('Parsed rating:', rating);
  
  return rating;
}

/**
 * Build the prompt for AI rating
 */
function buildRatingPrompt(application, job, resumeText) {
  return `Rate this job application on a scale of 1-5 stars based on how well the candidate matches the job requirements.

JOB DETAILS:
- Title: ${job.title}
- Department: ${job.department}
- Experience Level: ${job.experienceLevel || 'Not specified'}
- Employment Type: ${job.employmentType || 'Not specified'}
- Location: ${job.location}

REQUIREMENTS:
${job.requirements || 'No requirements specified'}

PREFERRED QUALIFICATIONS:
${job.preferredQualifications || 'No preferred qualifications specified'}

CANDIDATE APPLICATION:
- Name: ${application.name || 'Not provided'}
- Email: ${application.email}

COVER LETTER:
${application.coverLetter || 'No cover letter provided'}

RESUME CONTENT:
${resumeText || 'Resume content not available'}

RATING CRITERIA:
- 5 stars: Exceptional match, exceeds requirements, highly qualified
- 4 stars: Strong match, meets most requirements with some standout qualities  
- 3 stars: Good match, meets basic requirements
- 2 stars: Partial match, meets some requirements but missing key qualifications
- 1 star: Poor match, does not meet basic requirements

Return ONLY the number (1, 2, 3, 4, or 5).`;
}

/**
 * Fallback rating using basic keyword matching
 */
function getFallbackRating(application, job, resumeText) {
  try {
    let score = 0;
    let maxScore = 0;

    // Combine all candidate text
    const candidateText = [
      application.coverLetter || '',
      resumeText || '',
      application.name || ''
    ].join(' ').toLowerCase();

    // Extract keywords from job requirements
    const jobKeywords = extractKeywords(job.requirements || '');
    const jobTitle = job.title?.toLowerCase() || '';

    if (jobKeywords.length > 0) {
      // Check keyword matches (40% of score)
      const keywordMatches = jobKeywords.filter(keyword => 
        candidateText.includes(keyword.toLowerCase())
      ).length;
      
      score += (keywordMatches / jobKeywords.length) * 0.4;
      maxScore += 0.4;
    }

    // Check title relevance (30% of score)
    if (jobTitle && candidateText.includes(jobTitle)) {
      score += 0.3;
    }
    maxScore += 0.3;

    // Check if cover letter exists (20% of score)
    if (application.coverLetter && application.coverLetter.trim().length > 50) {
      score += 0.2;
    }
    maxScore += 0.2;

    // Check if resume content exists (10% of score)
    if (resumeText && resumeText.trim().length > 100) {
      score += 0.1;
    }
    maxScore += 0.1;

    // Convert to 1-5 scale
    const normalizedScore = maxScore > 0 ? score / maxScore : 0;
    return Math.max(1, Math.min(5, Math.round(normalizedScore * 4) + 1));

  } catch (error) {
    console.error('Error in fallback rating:', error);
    return 3; // Default middle rating
  }
}

/**
 * Extract keywords from job requirements
 */
function extractKeywords(text) {
  if (!text) return [];

  // Common tech and professional keywords
  const keywords = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => 
      word.length > 2 && 
      !isCommonWord(word) &&
      (isSkill(word) || isTechKeyword(word))
    );

  return [...new Set(keywords)]; // Remove duplicates
}

/**
 * Check if word is a common word to filter out
 */
function isCommonWord(word) {
  const commonWords = [
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our',
    'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two',
    'who', 'boy', 'did', 'man', 'men', 'put', 'say', 'she', 'too', 'use', 'able', 'about', 'after',
    'again', 'away', 'back', 'been', 'call', 'came', 'come', 'each', 'even', 'from', 'good', 'have',
    'here', 'into', 'just', 'know', 'like', 'long', 'look', 'made', 'make', 'many', 'more', 'must',
    'over', 'said', 'same', 'some', 'than', 'that', 'them', 'they', 'this', 'time', 'very', 'want',
    'well', 'went', 'were', 'what', 'when', 'with', 'work', 'year', 'your'
  ];
  
  return commonWords.includes(word);
}

/**
 * Check if word is likely a skill or tech keyword
 */
function isTechKeyword(word) {
  const techPatterns = [
    /^\w+(js|py|sql|css|html|php|cpp|java)$/,
    /^(react|vue|angular|node|django|rails|spring|flutter|swift|kotlin)$/,
    /^(aws|azure|gcp|docker|kubernetes|git|jenkins|terraform)$/,
    /^(python|javascript|typescript|java|csharp|ruby|php|golang|rust)$/,
    /^(mysql|postgresql|mongodb|redis|elasticsearch|cassandra)$/,
    /^(agile|scrum|devops|cicd|microservices|restful|graphql|api)$/
  ];
  
  return techPatterns.some(pattern => pattern.test(word));
}

/**
 * Check if word is likely a general skill
 */
function isSkill(word) {
  const skillKeywords = [
    'management', 'leadership', 'communication', 'analysis', 'design', 'development',
    'testing', 'debugging', 'optimization', 'integration', 'deployment', 'monitoring',
    'security', 'performance', 'scalability', 'architecture', 'database', 'frontend',
    'backend', 'fullstack', 'mobile', 'web', 'cloud', 'machine', 'learning', 'data',
    'analytics', 'visualization', 'reporting', 'automation', 'scripting', 'networking'
  ];
  
  return skillKeywords.includes(word);
}

/**
 * Check if AI rating is enabled for the current user/organization
 */
export async function isAIRatingEnabled() {
  // For now, always return true for testing
  // In production, this would check user's subscription/settings
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Batch rate multiple applications
 */
export async function batchRateApplications(applications, jobs) {
  const results = [];
  
  for (const application of applications) {
    const job = jobs.find(j => j.id === application.jobId);
    if (!job) continue;

    try {
      const rating = await rateApplicationWithAI(application, job);
      results.push({
        applicationId: application.id,
        rating,
        success: true
      });
      
      // Add small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      results.push({
        applicationId: application.id,
        rating: null,
        success: false,
        error: error.message
      });
    }
  }
  
  return results;
}