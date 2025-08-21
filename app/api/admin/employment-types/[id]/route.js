import { NextResponse } from 'next/server';
import { appPrisma } from '../../../../lib/prisma';
import { protectRoute } from '../../../../lib/middleware/apiProtection';

export async function GET(request, { params }) {
  try {
    const authResult = await protectRoute('job_attributes', 'read');
    if (authResult.error) return authResult.error;

    const { id } = params;

    const employmentType = await appPrisma.employment_types.findUnique({
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

    if (!employmentType) {
      return NextResponse.json({ error: 'Employment type not found' }, { status: 404 });
    }

    return NextResponse.json(employmentType);
  } catch (error) {
    console.error('Error fetching employment type:', error);
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

    // Check if employment type exists
    const existing = await appPrisma.employment_types.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Employment type not found' }, { status: 404 });
    }

    // Check for duplicate name (excluding current record)
    const duplicate = await appPrisma.employment_types.findFirst({
      where: {
        name: name.trim(),
        id: { not: id }
      }
    });

    if (duplicate) {
      return NextResponse.json({ error: 'Employment type with this name already exists' }, { status: 400 });
    }

    const employmentType = await appPrisma.employment_types.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        is_active: is_active ?? existing.is_active,
        sort_order: sort_order ?? existing.sort_order,
        updated_at: new Date()
      }
    });

    return NextResponse.json(employmentType);
  } catch (error) {
    console.error('Error updating employment type:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const authResult = await protectRoute('job_attributes', 'delete');
    if (authResult.error) return authResult.error;

    const { id } = params;

    // Check if employment type exists
    const existing = await appPrisma.employment_types.findUnique({
      where: { id },
      include: {
        jobs: {
          select: { id: true }
        }
      }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Employment type not found' }, { status: 404 });
    }

    // Check if employment type is being used by any jobs
    if (existing.jobs.length > 0) {
      return NextResponse.json({ 
        error: `Cannot delete employment type. It is currently being used by ${existing.jobs.length} job(s).` 
      }, { status: 400 });
    }

    await appPrisma.employment_types.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Employment type deleted successfully' });
  } catch (error) {
    console.error('Error deleting employment type:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}