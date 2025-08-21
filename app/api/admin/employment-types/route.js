import { NextResponse } from 'next/server';
import { appPrisma } from '../../../lib/prisma';
import { protectRoute } from '../../../lib/middleware/apiProtection';
import { getSystemSetting } from '../../../lib/settings';

export async function GET(request) {
  try {
    const authResult = await protectRoute('job_attributes', 'read');
    if (authResult.error) return authResult.error;

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const whereClause = includeInactive ? {} : { is_active: true };

    const employmentTypes = await appPrisma.employment_types.findMany({
      where: whereClause,
      orderBy: [
        { sort_order: 'asc' },
        { name: 'asc' }
      ]
    });

    return NextResponse.json(employmentTypes);
  } catch (error) {
    console.error('Error fetching employment types:', error);
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
    const existing = await appPrisma.employment_types.findUnique({
      where: { name: name.trim() }
    });

    if (existing) {
      return NextResponse.json({ error: 'Employment type with this name already exists' }, { status: 400 });
    }

    const employmentType = await appPrisma.employment_types.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        is_active,
        sort_order
      }
    });

    return NextResponse.json(employmentType, { status: 201 });
  } catch (error) {
    console.error('Error creating employment type:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}