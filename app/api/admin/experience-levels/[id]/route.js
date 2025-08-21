import { NextResponse } from 'next/server';
import { appPrisma } from '../../../../lib/prisma';
import { protectRoute } from '../../../../lib/middleware/apiProtection';

export async function GET(request, { params }) {
  try {
    const authResult = await protectRoute('job_attributes', 'read');
    if (authResult.error) return authResult.error;

    const { id } = params;

    const experienceLevel = await appPrisma.experience_levels.findUnique({
      where: { id },
      include: {
        jobs: {
          select: {
            id: true,
            title: true,
            status: true
          },
          take: 10
        }
      }
    });

    if (!experienceLevel) {
      return NextResponse.json({ error: 'Experience level not found' }, { status: 404 });
    }

    return NextResponse.json(experienceLevel);
  } catch (error) {
    console.error('Error fetching experience level:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const authResult = await protectRoute('job_attributes', 'update');
    if (authResult.error) return authResult.error;

    const { id } = params;
    const body = await request.json();
    const { name, description, is_active, sort_order } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Check if experience level exists
    const existing = await appPrisma.experience_levels.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Experience level not found' }, { status: 404 });
    }

    // Check for duplicate name (excluding current record)
    const duplicate = await appPrisma.experience_levels.findFirst({
      where: {
        name: name.trim(),
        id: { not: id }
      }
    });

    if (duplicate) {
      return NextResponse.json({ error: 'Experience level with this name already exists' }, { status: 400 });
    }

    const experienceLevel = await appPrisma.experience_levels.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        is_active: is_active ?? existing.is_active,
        sort_order: sort_order ?? existing.sort_order,
        updated_at: new Date()
      }
    });

    return NextResponse.json(experienceLevel);
  } catch (error) {
    console.error('Error updating experience level:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const authResult = await protectRoute('job_attributes', 'delete');
    if (authResult.error) return authResult.error;

    const { id } = params;

    // Check if experience level exists
    const existing = await appPrisma.experience_levels.findUnique({
      where: { id },
      include: {
        jobs: {
          select: { id: true }
        }
      }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Experience level not found' }, { status: 404 });
    }

    // Check if experience level is being used by any jobs
    if (existing.jobs.length > 0) {
      return NextResponse.json({ 
        error: `Cannot delete experience level. It is currently being used by ${existing.jobs.length} job(s).` 
      }, { status: 400 });
    }

    await appPrisma.experience_levels.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Experience level deleted successfully' });
  } catch (error) {
    console.error('Error deleting experience level:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}