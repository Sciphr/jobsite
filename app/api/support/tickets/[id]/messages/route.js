// app/api/support/tickets/[id]/messages/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../auth/[...nextauth]/route';
import { appPrisma } from '../../../../../lib/prisma';

// Direct database connection for management database
import { Pool } from 'pg';

const managementPool = new Pool({
  connectionString: process.env.MANAGEMENT_DATABASE_URL,
  ssl: false // Adjust based on your setup
});

export async function GET(request, { params }) {
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

    const { id: ticketId } = await params;

    // Get user email to verify ticket ownership
    const user = await appPrisma.users.findUnique({
      where: { id: session.user.id },
      select: { email: true }
    });

    // First verify the ticket belongs to this user
    const ticketQuery = `
      SELECT id, customer_email 
      FROM saas_support_tickets 
      WHERE id = $1 AND installation_id = $2 AND customer_email = $3
    `;
    
    const ticketResult = await managementPool.query(ticketQuery, [
      ticketId,
      process.env.INSTALLATION_ID,
      user.email
    ]);

    if (ticketResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Ticket not found or access denied' },
        { status: 404 }
      );
    }

    // Get messages for this ticket (exclude internal messages)
    const messagesQuery = `
      SELECT id, sender_type, sender_name, sender_email, message, created_at
      FROM saas_support_messages 
      WHERE ticket_id = $1 AND is_internal = false
      ORDER BY created_at ASC
    `;
    
    const messagesResult = await managementPool.query(messagesQuery, [ticketId]);
    
    const messages = messagesResult.rows;

    return NextResponse.json({
      success: true,
      messages
    });

  } catch (error) {
    console.error('Support ticket messages fetch error:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch ticket messages. Please try again.' },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
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

    const { id: ticketId } = await params;
    const { message } = await request.json();

    // Validate required fields
    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Get user details for the message
    const user = await appPrisma.users.findUnique({
      where: { id: session.user.id },
      select: {
        email: true,
        firstName: true,
        lastName: true
      }
    });

    const senderName = user.firstName && user.lastName 
      ? `${user.firstName} ${user.lastName}` 
      : user.email;

    // First verify the ticket belongs to this user
    const ticketQuery = `
      SELECT id, customer_email 
      FROM saas_support_tickets 
      WHERE id = $1 AND installation_id = $2 AND customer_email = $3
    `;
    
    const ticketResult = await managementPool.query(ticketQuery, [
      ticketId,
      process.env.INSTALLATION_ID,
      user.email
    ]);

    if (ticketResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Ticket not found or access denied' },
        { status: 404 }
      );
    }

    // Create message in management database using raw SQL
    const insertQuery = `
      INSERT INTO saas_support_messages (
        ticket_id, sender_type, sender_name, sender_email, 
        message, is_internal, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id, sender_type, sender_name, sender_email, message, created_at
    `;
    
    const result = await managementPool.query(insertQuery, [
      ticketId,
      'customer', // sender_type
      senderName,
      user.email,
      message.trim(),
      false // is_internal
    ]);
    
    const newMessage = result.rows[0];

    return NextResponse.json({
      success: true,
      message: newMessage
    });

  } catch (error) {
    console.error('Support ticket message submission error:', error);
    
    return NextResponse.json(
      { error: 'Failed to send message. Please try again.' },
      { status: 500 }
    );
  }
}