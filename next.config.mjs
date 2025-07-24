/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['184.145.27.217', '184.145.27.217:80']
    }
  }
};

export default nextConfig;
