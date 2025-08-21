import { NextResponse } from 'next/server';
import { appPrisma } from '../../../../lib/prisma';
import { protectRoute } from '../../../../lib/middleware/apiProtection';

export async function GET(request, { params }) {
  try {
    const authResult = await protectRoute('job_attributes', 'read');
    if (authResult.error) return authResult.error;

    const { id } = params;

    const remotePolicy = await appPrisma.remote_policies.findUnique({
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

    if (!remotePolicy) {
      return NextResponse.json({ error: 'Remote policy not found' }, { status: 404 });
    }

    return NextResponse.json(remotePolicy);
  } catch (error) {
    console.error('Error fetching remote policy:', error);
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

    // Check if remote policy exists
    const existing = await appPrisma.remote_policies.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Remote policy not found' }, { status: 404 });
    }

    // Check for duplicate name (excluding current record)
    const duplicate = await appPrisma.remote_policies.findFirst({
      where: {
        name: name.trim(),
        id: { not: id }
      }
    });

    if (duplicate) {
      return NextResponse.json({ error: 'Remote policy with this name already exists' }, { status: 400 });
    }

    const remotePolicy = await appPrisma.remote_policies.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        is_active: is_active ?? existing.is_active,
        sort_order: sort_order ?? existing.sort_order,
        updated_at: new Date()
      }
    });

    return NextResponse.json(remotePolicy);
  } catch (error) {
    console.error('Error updating remote policy:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const authResult = await protectRoute('job_attributes', 'delete');
    if (authResult.error) return authResult.error;

    const { id } = params;

    // Check if remote policy exists
    const existing = await appPrisma.remote_policies.findUnique({
      where: { id },
      include: {
        jobs: {
          select: { id: true }
        }
      }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Remote policy not found' }, { status: 404 });
    }

    // Check if remote policy is being used by any jobs
    if (existing.jobs.length > 0) {
      return NextResponse.json({ 
        error: `Cannot delete remote policy. It is currently being used by ${existing.jobs.length} job(s).` 
      }, { status: 400 });
    }

    await appPrisma.remote_policies.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Remote policy deleted successfully' });
  } catch (error) {
    console.error('Error deleting remote policy:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}