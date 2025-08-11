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
};

module.exports = nextConfig;
