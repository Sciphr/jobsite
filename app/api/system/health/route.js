// app/api/system/health/route.js
import { NextResponse } from 'next/server';
// import { weeklyDigestScheduler } from '../../../lib/weeklyDigestScheduler';
// import '../../../lib/startup'; // Cron services moved to external system cron

export async function GET() {
  try {
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        cronJobs: {
          message: 'Cron jobs now managed by external system cron',
          endpoint: '/api/cron/scheduler'
        }
      }
    });
  } catch (error) {
    console.error('❌ Health check error:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    }, { status: 500 });
  }
}