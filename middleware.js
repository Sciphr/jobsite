import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { rateLimit } from './app/lib/redis'

// Rate limiting store (fallback for when Redis is unavailable)
const rateLimitStore = new Map()

// Rate limiting configuration (excludes /api/auth/* routes)
const RATE_LIMITS = {
  '/api/v1': { windowMs: 60 * 1000, max: 100 }, // 100 requests per minute for API
  '/api': { windowMs: 60 * 1000, max: 200 }, // 200 requests per minute for regular API
  default: { windowMs: 60 * 1000, max: 300 } // 300 requests per minute default
}

// Get client IP address
function getClientIP(request) {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const clientIP = forwarded ? forwarded.split(',')[0] : realIP
  return clientIP || 'unknown'
}

// Rate limiting logic with Redis fallback
async function isRateLimited(request, pathname) {
  const clientIP = getClientIP(request)
  
  // Determine rate limit config
  let config = RATE_LIMITS.default
  for (const [path, limit] of Object.entries(RATE_LIMITS)) {
    if (path !== 'default' && pathname.startsWith(path)) {
      config = limit
      break
    }
  }
  
  const identifier = `${clientIP}-${pathname.split('/')[1]}`
  
  try {
    // Try Redis first
    const result = await rateLimit.checkLimit(identifier, config.max, config.windowMs / 1000)
    return !result.allowed
  } catch (error) {
    // Fallback to in-memory store
    console.warn('Redis rate limiting failed, using fallback:', error.message)
    
    const key = `${clientIP}-${pathname.split('/')[1]}`
    const now = Date.now()
    
    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, { count: 1, resetTime: now + config.windowMs })
      return false
    }
    
    const data = rateLimitStore.get(key)
    
    if (now > data.resetTime) {
      rateLimitStore.set(key, { count: 1, resetTime: now + config.windowMs })
      return false
    }
    
    if (data.count >= config.max) {
      return true
    }
    
    data.count++
    return false
  }
}

// Security checks
function performSecurityChecks(request) {
  const headers = request.headers
  const userAgent = headers.get('user-agent') || ''
  const pathname = request.nextUrl.pathname
  
  // Block suspicious user agents
  const suspiciousUAs = ['curl', 'wget', 'python-requests', 'bot', 'crawler']
  if (suspiciousUAs.some(ua => userAgent.toLowerCase().includes(ua)) && 
      !pathname.startsWith('/api/v1')) { // Allow legitimate API access
    return new NextResponse('Forbidden', { status: 403 })
  }
  
  // Block suspicious paths
  const suspiciousPaths = [
    '/wp-admin', '/phpmyadmin', '/.env', '/config.php', 
    '/wp-config.php', '/.git', '/admin.php', '/xmlrpc.php'
  ]
  if (suspiciousPaths.some(path => pathname.includes(path))) {
    return new NextResponse('Not Found', { status: 404 })
  }
  
  // Check for SQL injection attempts in query parameters
  const url = request.nextUrl
  const queryString = url.search
  const sqlPatterns = [
    /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b)/i,
    /('|(\\x27)|(\\x2D\\x2D))/,
    /((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i
  ]
  
  for (const pattern of sqlPatterns) {
    if (pattern.test(queryString)) {
      return new NextResponse('Bad Request', { status: 400 })
    }
  }
  
  return null
}

export async function middleware(request) {
  const pathname = request.nextUrl.pathname
  
  // Perform security checks
  const securityCheck = performSecurityChecks(request)
  if (securityCheck) return securityCheck
  
  // Apply rate limiting (skip for all NextAuth routes)
  const skipRateLimit = pathname.startsWith('/api/auth/')
  
  if (!skipRateLimit && await isRateLimited(request, pathname)) {
    return new NextResponse('Too Many Requests', { 
      status: 429,
      headers: {
        'Retry-After': '60'
      }
    })
  }
  
  // Admin route protection
  if (pathname.startsWith('/admin') || pathname.startsWith('/app/admin')) {
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    })
    
    if (!token) {
      return NextResponse.redirect(new URL('/auth/signin', request.url))
    }
    
    // Check if user has admin privileges
    if (!token.privilegeLevel || token.privilegeLevel < 1) {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
  }
  
  // API route protection
  if (pathname.startsWith('/api/admin')) {
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    })
    
    // Allow API key authentication to proceed to route handlers
    const authHeader = request.headers.get('authorization')
    if (!token && !authHeader?.startsWith('Bearer ')) {
      return new NextResponse('Unauthorized', { status: 401 })
    }
  }
  
  // Add security headers to all responses
  const response = NextResponse.next()
  
  // Remove server identification
  response.headers.set('Server', 'JobSite')
  
  // Add additional security headers
  response.headers.set('X-Request-ID', crypto.randomUUID())
  
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}