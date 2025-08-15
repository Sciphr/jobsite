// app/api/support/tickets/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { appPrisma } from '../../../lib/prisma';

// Direct database connection for management database
import { Pool } from 'pg';

const managementPool = new Pool({
  connectionString: process.env.MANAGEMENT_DATABASE_URL,
  ssl: false // Adjust based on your setup
});

export async function POST(request) {
  try {
    // Get session to verify authentication
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user has Admin or Super Admin role
    const userRoles = await appPrisma.user_roles.findMany({
      where: {
        user_id: session.user.id
      },
      include: {
        roles: true
      }
    });

    const hasAdminAccess = userRoles.some(userRole => 
      ['Admin', 'Super Admin'].includes(userRole.roles.name)
    );

    if (!hasAdminAccess) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Admin or Super Admin role required.' },
        { status: 403 }
      );
    }

    // Get request data
    const { title, description, priority = 'medium', category = 'technical' } = await request.json();

    // Validate required fields
    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      );
    }

    // Get user details for the ticket
    const user = await appPrisma.users.findUnique({
      where: { id: session.user.id },
      select: {
        email: true,
        firstName: true,
        lastName: true
      }
    });

    const customerName = user.firstName && user.lastName 
      ? `${user.firstName} ${user.lastName}` 
      : user.email;

    // Create ticket in management database using raw SQL
    const ticketNumber = `ST-${Date.now()}`;
    const query = `
      INSERT INTO saas_support_tickets (
        installation_id, ticket_number, title, description, 
        customer_email, customer_name, status, priority, category,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING id, ticket_number, title, status, priority, created_at
    `;
    
    const result = await managementPool.query(query, [
      process.env.INSTALLATION_ID,
      ticketNumber,
      title,
      description,
      user.email,
      customerName,
      'open',
      priority,
      category
    ]);
    
    const ticket = result.rows[0];

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        ticket_number: ticket.ticket_number,
        title: ticket.title,
        status: ticket.status,
        priority: ticket.priority,
        created_at: ticket.created_at
      }
    });

  } catch (error) {
    console.error('Support ticket submission error:', error);
    
    return NextResponse.json(
      { error: 'Failed to submit support ticket. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    // Get session to verify authentication
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user has Admin or Super Admin role
    const userRoles = await appPrisma.user_roles.findMany({
      where: {
        user_id: session.user.id
      },
      include: {
        roles: true
      }
    });

    const hasAdminAccess = userRoles.some(userRole => 
      ['Admin', 'Super Admin'].includes(userRole.roles.name)
    );

    if (!hasAdminAccess) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Admin or Super Admin role required.' },
        { status: 403 }
      );
    }

    // Get user email to filter tickets
    const user = await appPrisma.users.findUnique({
      where: { id: session.user.id },
      select: { email: true }
    });

    // Get tickets for this user from management database using raw SQL
    const query = `
      SELECT id, ticket_number, title, description, status, priority, 
             category, created_at, updated_at
      FROM saas_support_tickets 
      WHERE installation_id = $1 AND customer_email = $2 
      ORDER BY created_at DESC
    `;
    
    const result = await managementPool.query(query, [
      process.env.INSTALLATION_ID,
      user.email
    ]);
    
    const tickets = result.rows;

    return NextResponse.json({
      success: true,
      tickets
    });

  } catch (error) {
    console.error('Support tickets fetch error:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch support tickets. Please try again.' },
      { status: 500 }
    );
  }
}