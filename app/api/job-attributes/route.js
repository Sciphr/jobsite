import { NextResponse } from 'next/server';
import { appPrisma } from '../../lib/prisma';

// Public endpoint for fetching all active job attributes
export async function GET(request) {
  try {
    const [categories, employmentTypes, experienceLevels, remotePolicies] = await Promise.all([
      appPrisma.categories.findMany({
        orderBy: { name: 'asc' }
      }),
      appPrisma.employment_types.findMany({
        where: { is_active: true },
        orderBy: [
          { sort_order: 'asc' },
          { name: 'asc' }
        ]
      }),
      appPrisma.experience_levels.findMany({
        where: { is_active: true },
        orderBy: [
          { sort_order: 'asc' },
          { name: 'asc' }
        ]
      }),
      appPrisma.remote_policies.findMany({
        where: { is_active: true },
        orderBy: [
          { sort_order: 'asc' },
          { name: 'asc' }
        ]
      })
    ]);

    return NextResponse.json({
      categories,
      employmentTypes,
      experienceLevels,
      remotePolicies
    });
  } catch (error) {
    console.error('Error fetching job attributes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}