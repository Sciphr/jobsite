// app/api/admin/stale-applications/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { 
  getAllStaleApplications, 
  getStaleApplicationsCount,
  getStaleApplicationThreshold 
} from '../../../lib/staleApplicationUtils';

export async function GET(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin privileges
    if (!session.user.email || !session.user.privilegeLevel || session.user.privilegeLevel < 10) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'full';

    switch (type) {
      case 'count':
        const count = await getStaleApplicationsCount();
        return NextResponse.json({ count });

      case 'threshold':
        const threshold = await getStaleApplicationThreshold();
        return NextResponse.json({ 
          threshold,
          enabled: threshold !== null && threshold > 0 
        });

      case 'full':
      default:
        const staleApplications = await getAllStaleApplications();
        const currentThreshold = await getStaleApplicationThreshold();
        
        return NextResponse.json({
          applications: staleApplications,
          count: staleApplications.length,
          threshold: currentThreshold,
          enabled: currentThreshold !== null && currentThreshold > 0,
          lastUpdated: new Date().toISOString(),
        });
    }
  } catch (error) {
    console.error('Error fetching stale applications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stale applications' },
      { status: 500 }
    );
  }
}