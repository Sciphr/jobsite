// app/lib/env-check.js
/**
 * Environment variable security validation
 * Run this at application startup to ensure all required security variables are set
 */

const REQUIRED_ENV_VARS = {
  // Authentication
  NEXTAUTH_SECRET: {
    required: true,
    minLength: 32,
    description: 'NextAuth secret for JWT signing'
  },
  NEXTAUTH_URL: {
    required: true,
    pattern: /^https?:\/\/.+/,
    description: 'NextAuth URL for OAuth callbacks'
  },
  
  // Database
  DATABASE_URL: {
    required: true,
    pattern: /^(postgres|mysql):\/\/.+/,
    description: 'Database connection string'
  },
  
  // Encryption/Security
  ENCRYPTION_KEY: {
    required: false,
    minLength: 32,
    description: 'Application encryption key'
  },
  
  // API Security
  CRON_SECRET: {
    required: true,
    minLength: 16,
    description: 'Secret for cron job authentication'
  },
  
  // Email Security
  SMTP_PASSWORD: {
    required: false,
    minLength: 8,
    description: 'SMTP password for email sending'
  }
}

export function validateEnvironmentSecurity() {
  const errors = []
  const warnings = []
  
  // Check Node environment
  if (process.env.NODE_ENV === 'production') {
    // Production-specific checks
    if (!process.env.NEXTAUTH_URL?.startsWith('https://')) {
      errors.push('NEXTAUTH_URL must use HTTPS in production')
    }
  }
  
  // Validate each required environment variable
  for (const [varName, config] of Object.entries(REQUIRED_ENV_VARS)) {
    const value = process.env[varName]
    
    if (config.required && !value) {
      errors.push(`Missing required environment variable: ${varName} - ${config.description}`)
      continue
    }
    
    if (!value && !config.required) {
      warnings.push(`Optional environment variable not set: ${varName} - ${config.description}`)
      continue
    }
    
    if (value) {
      // Check minimum length
      if (config.minLength && value.length < config.minLength) {
        errors.push(`${varName} must be at least ${config.minLength} characters long`)
      }
      
      // Check pattern
      if (config.pattern && !config.pattern.test(value)) {
        errors.push(`${varName} format is invalid - ${config.description}`)
      }
      
      // Check for common weak values
      const weakValues = ['password', '123456', 'secret', 'admin', 'test']
      if (weakValues.includes(value.toLowerCase())) {
        errors.push(`${varName} uses a weak/common value`)
      }
    }
  }
  
  // Check for potentially exposed secrets
  const publicEnvVars = Object.keys(process.env).filter(key => 
    key.startsWith('NEXT_PUBLIC_')
  )
  
  for (const publicVar of publicEnvVars) {
    const value = process.env[publicVar]
    if (value && (
      value.includes('secret') ||
      value.includes('password') ||
      value.includes('key') ||
      value.length > 50 // Potentially a secret
    )) {
      warnings.push(`Public environment variable ${publicVar} may contain sensitive data`)
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

export function logEnvironmentSecurityCheck() {
  const result = validateEnvironmentSecurity()
  
  if (!result.isValid) {
    console.error('❌ Environment Security Check Failed:')
    result.errors.forEach(error => console.error(`  - ${error}`))
    
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Environment security validation failed in production')
    }
  } else {
    console.log('✅ Environment Security Check Passed')
  }
  
  if (result.warnings.length > 0) {
    console.warn('⚠️  Environment Security Warnings:')
    result.warnings.forEach(warning => console.warn(`  - ${warning}`))
  }
  
  return result
}

// Auto-run in production
if (process.env.NODE_ENV === 'production') {
  logEnvironmentSecurityCheck()
}