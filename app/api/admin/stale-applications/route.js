// app/api/admin/stale-applications/route.js
import { withAdminAuth, PRIVILEGE_LEVELS } from '../../../lib/auth';
import { 
  getAllStaleApplications, 
  getStaleApplicationsCount,
  getStaleApplicationThreshold 
} from '../../../lib/staleApplicationUtils';

const handler = async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'full';

    switch (type) {
      case 'count':
        const count = await getStaleApplicationsCount();
        return new Response(JSON.stringify({ count }), { 
          headers: { 'Content-Type': 'application/json' } 
        });

      case 'threshold':
        const threshold = await getStaleApplicationThreshold();
        return new Response(JSON.stringify({ 
          threshold,
          enabled: threshold !== null && threshold > 0 
        }), { headers: { 'Content-Type': 'application/json' } });

      case 'full':
      default:
        const staleApplications = await getAllStaleApplications();
        const currentThreshold = await getStaleApplicationThreshold();
        
        return new Response(JSON.stringify({
          applications: staleApplications,
          count: staleApplications.length,
          threshold: currentThreshold,
          enabled: currentThreshold !== null && currentThreshold > 0,
          lastUpdated: new Date().toISOString(),
        }), { headers: { 'Content-Type': 'application/json' } });
    }
  } catch (error) {
    console.error('Error fetching stale applications:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch stale applications' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const GET = withAdminAuth(handler, PRIVILEGE_LEVELS.HR);