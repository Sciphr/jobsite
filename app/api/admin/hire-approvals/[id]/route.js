// app/api/admin/hire-approvals/[id]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { getHireApprovalRequestById } from '../../../../lib/hireApprovalUtils';

export async function GET(request, { params }) {
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

    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }

    const request_data = await getHireApprovalRequestById(id);
    
    return NextResponse.json({
      success: true,
      data: request_data,
    });
  } catch (error) {
    console.error('Error fetching hire approval request:', error);
    
    if (error.message === 'Hire approval request not found') {
      return NextResponse.json({ error: 'Hire approval request not found' }, { status: 404 });
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch hire approval request' },
      { status: 500 }
    );
  }
}