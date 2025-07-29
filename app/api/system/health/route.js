// app/api/system/health/route.js
import { NextResponse } from 'next/server';
import { weeklyDigestScheduler } from '../../../lib/weeklyDigestScheduler';
import '../../../lib/startup'; // This will auto-initialize the scheduler

export async function GET() {
  try {
    // Get scheduler status
    const scheduleInfo = await weeklyDigestScheduler.getScheduleInfo();
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        weeklyDigestScheduler: {
          enabled: scheduleInfo?.enabled || false,
          isRunning: scheduleInfo?.isRunning || false,
          hasActiveTask: scheduleInfo?.hasActiveTask || false,
          nextRun: scheduleInfo ? `${scheduleInfo.dayName} at ${scheduleInfo.time}` : 'Not configured'
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