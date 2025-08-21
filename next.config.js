/** @type {import('next').NextConfig} */
const nextConfig = {
  // External packages that should not be bundled by Next.js
  serverExternalPackages: ["@prisma/client", "bcryptjs", "ldapjs"],

  // Configure allowed image hostnames
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '192.168.2.100',
        port: '9000',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '192.168.2.100',
        port: '9000',
        pathname: '/**',
      },
    ],
  },

  // Environment variables that should be available at build time
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Security Headers
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: [
          // Prevent XSS attacks
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          // Prevent clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          // Enforce HTTPS
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          },
          // Content Security Policy (restrictive but functional)
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com https://www.googletagmanager.com https://www.google-analytics.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https: http://192.168.2.100:9000 https://192.168.2.100:9000 https://www.google-analytics.com https://www.googletagmanager.com",
              "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://www.google-analytics.com https://www.googletagmanager.com",
              "frame-src 'self' https://accounts.google.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'"
            ].join('; ')
          },
          // Referrer Policy
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          // Permissions Policy
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ],
      },
      {
        // Additional headers for API routes
        source: '/api/(.*)',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow'
          },
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate'
          }
        ],
      }
    ]
  },
};

module.exports = nextConfig;
