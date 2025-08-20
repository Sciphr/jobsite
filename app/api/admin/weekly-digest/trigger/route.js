// app/api/admin/weekly-digest/trigger/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
// import { weeklyDigestScheduler } from '../../../../lib/weeklyDigestScheduler';

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

    // Import and run weekly digest directly
    const { weeklyDigestService } = await import('../../../../lib/weeklyDigest');
    const result = await weeklyDigestService.generateAndSend(null, null);

    return NextResponse.json({
      success: true,
      message: 'Weekly digest triggered successfully',
      triggeredBy: session.user.email,
      timestamp: new Date().toISOString(),
      result
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

    // Get settings from database directly
    const { appPrisma } = await import('../../../../lib/prisma');
    const settings = await appPrisma.settings.findMany({
      where: {
        key: {
          in: ['weekly_digest_enabled', 'weekly_digest_day', 'weekly_digest_time', 'weekly_digest_last_run']
        },
        userId: null
      }
    });

    const settingsMap = {};
    settings.forEach(setting => {
      settingsMap[setting.key] = setting.value;
    });

    return NextResponse.json({
      success: true,
      data: {
        enabled: settingsMap.weekly_digest_enabled === 'true',
        day: settingsMap.weekly_digest_day || 'monday',
        time: settingsMap.weekly_digest_time || '09:00',
        lastRun: settingsMap.weekly_digest_last_run || 'Never',
        managedBy: 'External system cron'
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