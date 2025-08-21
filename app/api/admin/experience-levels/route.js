import { NextResponse } from 'next/server';
import { appPrisma } from '../../../lib/prisma';
import { protectRoute } from '../../../lib/middleware/apiProtection';

export async function GET(request) {
  try {
    const authResult = await protectRoute('job_attributes', 'read');
    if (authResult.error) return authResult.error;

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const whereClause = includeInactive ? {} : { is_active: true };

    const experienceLevels = await appPrisma.experience_levels.findMany({
      where: whereClause,
      orderBy: [
        { sort_order: 'asc' },
        { name: 'asc' }
      ]
    });

    return NextResponse.json(experienceLevels);
  } catch (error) {
    console.error('Error fetching experience levels:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const authResult = await protectRoute('job_attributes', 'create');
    if (authResult.error) return authResult.error;

    const body = await request.json();
    const { name, description, is_active = true, sort_order = 0 } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Check for duplicate name
    const existing = await appPrisma.experience_levels.findUnique({
      where: { name: name.trim() }
    });

    if (existing) {
      return NextResponse.json({ error: 'Experience level with this name already exists' }, { status: 400 });
    }

    const experienceLevel = await appPrisma.experience_levels.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        is_active,
        sort_order
      }
    });

    return NextResponse.json(experienceLevel, { status: 201 });
  } catch (error) {
    console.error('Error creating experience level:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}