// app/api/admin/weekly-digest/trigger/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { weeklyDigestScheduler } from '../../../../lib/weeklyDigestScheduler';

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is admin (privilege level 1 or higher)
    if (
      !session ||
      !session.user.privilegeLevel ||
      session.user.privilegeLevel < 1
    ) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔧 Manual weekly digest trigger requested by:', session.user.email);

    // Manually trigger the digest
    await weeklyDigestScheduler.triggerNow();

    return NextResponse.json({
      success: true,
      message: 'Weekly digest triggered successfully',
      triggeredBy: session.user.email,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Manual trigger error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to trigger weekly digest',
      error: error.message
    }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is admin (privilege level 1 or higher)
    if (
      !session ||
      !session.user.privilegeLevel ||
      session.user.privilegeLevel < 1
    ) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Get current schedule status
    const scheduleInfo = await weeklyDigestScheduler.getScheduleInfo();

    return NextResponse.json({
      success: true,
      data: {
        enabled: scheduleInfo?.enabled || false,
        isRunning: scheduleInfo?.isRunning || false,
        hasActiveTask: scheduleInfo?.hasActiveTask || false,
        schedule: scheduleInfo ? {
          dayOfWeek: scheduleInfo.dayOfWeek,
          dayName: scheduleInfo.dayName,
          time: scheduleInfo.time,
          nextRun: `${scheduleInfo.dayName} at ${scheduleInfo.time}`
        } : null
      }
    });

  } catch (error) {
    console.error('❌ Schedule status error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to get schedule status',
      error: error.message
    }, { status: 500 });
  }
}