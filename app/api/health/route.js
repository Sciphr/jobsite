// Simple health check endpoint for SaaS management monitoring
import { NextResponse } from 'next/server';
import { appPrisma } from '../../lib/prisma';

export async function GET() {
  try {
    // Basic database connectivity test
    await appPrisma.$queryRaw`SELECT 1`;
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      app_name: 'JobSite Application',
      version: process.env.APP_VERSION || '1.0.0',
      checks: {
        database: 'connected',
        server: 'running'
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      checks: {
        database: 'failed',
        server: 'running'
      }
    }, { status: 500 });
  }
}