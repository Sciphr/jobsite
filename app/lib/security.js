// app/lib/security.js
import crypto from 'crypto'
import validator from 'validator'

/**
 * Security utilities for input validation and sanitization
 */

// Input validation rules
export const ValidationRules = {
  email: (value) => validator.isEmail(value),
  phone: (value) => validator.isMobilePhone(value),
  url: (value) => validator.isURL(value),
  uuid: (value) => validator.isUUID(value),
  alphanumeric: (value) => validator.isAlphanumeric(value),
  length: (min, max) => (value) => validator.isLength(value, { min, max }),
  
  // Custom rules for your application
  jobTitle: (value) => {
    return validator.isLength(value, { min: 3, max: 100 }) &&
           !/<script|javascript:|data:/i.test(value)
  },
  
  applicationNotes: (value) => {
    return validator.isLength(value, { min: 0, max: 5000 }) &&
           !/<script|javascript:|data:/i.test(value)
  },
  
  fileName: (value) => {
    return /^[a-zA-Z0-9._-]+$/.test(value) &&
           !value.includes('../') &&
           value.length <= 255
  }
}

/**
 * Sanitize input to prevent XSS attacks
 */
export function sanitizeInput(input, type = 'text') {
  if (typeof input !== 'string') return input
  
  // Basic HTML encoding
  let sanitized = input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
  
  switch (type) {
    case 'email':
      return validator.normalizeEmail(sanitized) || ''
    case 'url':
      return validator.escape(sanitized)
    case 'filename':
      return sanitized.replace(/[^a-zA-Z0-9._-]/g, '_')
    default:
      return sanitized
  }
}

/**
 * Validate and sanitize request body
 */
export function validateRequestBody(body, schema) {
  const errors = {}
  const sanitized = {}
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = body[field]
    
    // Check required fields
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors[field] = 'This field is required'
      continue
    }
    
    // Skip validation for optional empty fields
    if (!rules.required && (value === undefined || value === null || value === '')) {
      continue
    }
    
    // Apply validation rules
    if (rules.validate && !rules.validate(value)) {
      errors[field] = rules.message || 'Invalid value'
      continue
    }
    
    // Sanitize the value
    sanitized[field] = rules.sanitize ? rules.sanitize(value) : sanitizeInput(value)
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    data: sanitized
  }
}

/**
 * Generate secure random tokens
 */
export function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex')
}

/**
 * Hash sensitive data (for logging, etc.)
 */
export function hashSensitiveData(data) {
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 8)
}

/**
 * Content Security Policy nonce generator
 */
export function generateCSPNonce() {
  return crypto.randomBytes(16).toString('base64')
}

/**
 * Validate file uploads
 */
export function validateFileUpload(file, options = {}) {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf']
  } = options
  
  const errors = []
  
  // Check file size
  if (file.size > maxSize) {
    errors.push(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`)
  }
  
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not allowed`)
  }
  
  // Check file extension
  const extension = '.' + file.name.split('.').pop().toLowerCase()
  if (!allowedExtensions.includes(extension)) {
    errors.push(`File extension ${extension} is not allowed`)
  }
  
  // Check filename for suspicious patterns
  if (!/^[a-zA-Z0-9._-]+$/.test(file.name)) {
    errors.push('Filename contains invalid characters')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Database query parameter sanitization
 */
export function sanitizeDbParams(params) {
  const sanitized = {}
  
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') {
      // Remove potential SQL injection patterns
      sanitized[key] = value
        .replace(/[';--]/g, '')
        .replace(/\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b/gi, '')
        .trim()
    } else {
      sanitized[key] = value
    }
  }
  
  return sanitized
}

/**
 * Common validation schemas for your application
 */
export const CommonSchemas = {
  // User profile update
  userProfile: {
    firstName: {
      required: true,
      validate: ValidationRules.length(1, 50),
      message: 'First name must be 1-50 characters',
      sanitize: (value) => sanitizeInput(value, 'text')
    },
    lastName: {
      required: true,
      validate: ValidationRules.length(1, 50),
      message: 'Last name must be 1-50 characters',
      sanitize: (value) => sanitizeInput(value, 'text')
    },
    email: {
      required: true,
      validate: ValidationRules.email,
      message: 'Please enter a valid email address',
      sanitize: (value) => sanitizeInput(value, 'email')
    },
    phone: {
      required: false,
      validate: (value) => !value || ValidationRules.phone(value),
      message: 'Please enter a valid phone number',
      sanitize: (value) => sanitizeInput(value, 'text')
    }
  },
  
  // Job creation/update
  job: {
    title: {
      required: true,
      validate: ValidationRules.jobTitle,
      message: 'Job title must be 3-100 characters and contain no scripts',
      sanitize: (value) => sanitizeInput(value, 'text')
    },
    description: {
      required: true,
      validate: ValidationRules.length(10, 10000),
      message: 'Job description must be 10-10000 characters',
      sanitize: (value) => sanitizeInput(value, 'text')
    },
    department: {
      required: true,
      validate: ValidationRules.length(2, 50),
      message: 'Department must be 2-50 characters',
      sanitize: (value) => sanitizeInput(value, 'text')
    }
  },
  
  // Application notes
  applicationNote: {
    content: {
      required: true,
      validate: ValidationRules.applicationNotes,
      message: 'Notes must be 1-5000 characters and contain no scripts',
      sanitize: (value) => sanitizeInput(value, 'text')
    }
  }
}

/**
 * Security audit logging
 */
export function logSecurityEvent(event, details = {}) {
  const timestamp = new Date().toISOString()
  const logEntry = {
    timestamp,
    event,
    details: {
      ...details,
      // Hash any sensitive data
      userAgent: details.userAgent ? hashSensitiveData(details.userAgent) : null,
      ip: details.ip ? hashSensitiveData(details.ip) : null
    }
  }
  
  // In production, send to your security monitoring system
  console.log('SECURITY_AUDIT:', JSON.stringify(logEntry))
}