import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { PrismaClient } from "@/app/generated/prisma";
import { CATEGORIES, EVENT_TYPES, SEVERITY } from "@/app/lib/auditLog";

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is admin (privilege level 2 or higher for audit logs)
    if (!session?.user?.privilegeLevel || session.user.privilegeLevel < 2) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Pagination parameters
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = Math.min(parseInt(searchParams.get("limit")) || 50, 100); // Max 100 items per page
    const skip = (page - 1) * limit;
    
    // Filter parameters
    const category = searchParams.get("category");
    const eventType = searchParams.get("eventType");
    const subcategory = searchParams.get("subcategory");
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    const actorId = searchParams.get("actorId");
    const severity = searchParams.get("severity");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    
    // Date range filters
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    
    // Relationship filters
    const relatedUserId = searchParams.get("relatedUserId");
    const relatedJobId = searchParams.get("relatedJobId");
    const relatedApplicationId = searchParams.get("relatedApplicationId");
    
    // Sorting
    const sortBy = searchParams.get("sortBy") || "created_at";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    
    // Build where clause
    const where = {};
    
    if (category) where.category = category;
    if (eventType) where.event_type = eventType;
    if (subcategory) where.subcategory = subcategory;
    if (entityType) where.entity_type = entityType;
    if (entityId) where.entity_id = entityId;
    if (actorId) where.actor_id = actorId;
    if (severity) where.severity = severity;
    if (status) where.status = status;
    if (relatedUserId) where.related_user_id = relatedUserId;
    if (relatedJobId) where.related_job_id = relatedJobId;
    if (relatedApplicationId) where.related_application_id = relatedApplicationId;
    
    // Date range filter
    if (dateFrom || dateTo) {
      where.created_at = {};
      if (dateFrom) where.created_at.gte = new Date(dateFrom);
      if (dateTo) where.created_at.lte = new Date(dateTo);
    }
    
    // Search filter (across multiple text fields)
    if (search) {
      where.OR = [
        { action: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { entity_name: { contains: search, mode: "insensitive" } },
        { actor_name: { contains: search, mode: "insensitive" } }
      ];
    }
    
    // Build orderBy clause
    const orderBy = {};
    orderBy[sortBy] = sortOrder;
    
    // Get total count for pagination
    const totalCount = await prisma.auditLog.count({ where });
    
    // Fetch audit logs with related data
    const auditLogs = await prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        actor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        related_user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        related_job: {
          select: {
            id: true,
            title: true,
            department: true
          }
        },
        related_application: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true
          }
        }
      }
    });
    
    // Transform data for frontend
    const transformedLogs = auditLogs.map(log => ({
      id: log.id,
      eventType: log.event_type,
      category: log.category,
      subcategory: log.subcategory,
      entityType: log.entity_type,
      entityId: log.entity_id,
      entityName: log.entity_name,
      actorId: log.actor_id,
      actorType: log.actor_type,
      actorName: log.actor_name,
      action: log.action,
      description: log.description,
      oldValues: log.old_values,
      newValues: log.new_values,
      changes: log.changes,
      ipAddress: log.ip_address,
      userAgent: log.user_agent,
      sessionId: log.session_id,
      requestId: log.request_id,
      relatedUserId: log.related_user_id,
      relatedJobId: log.related_job_id,
      relatedApplicationId: log.related_application_id,
      createdAt: log.created_at,
      severity: log.severity,
      status: log.status,
      tags: log.tags,
      metadata: log.metadata,
      
      // Related entities (for easy display)
      actor: log.actor ? {
        name: `${log.actor.firstName || ''} ${log.actor.lastName || ''}`.trim() || log.actor.email,
        email: log.actor.email
      } : null,
      relatedUser: log.related_user ? {
        name: `${log.related_user.firstName || ''} ${log.related_user.lastName || ''}`.trim() || log.related_user.email,
        email: log.related_user.email
      } : null,
      relatedJob: log.related_job ? {
        title: log.related_job.title,
        department: log.related_job.department
      } : null,
      relatedApplication: log.related_application ? {
        name: log.related_application.name,
        email: log.related_application.email,
        status: log.related_application.status
      } : null
    }));
    
    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;
    
    // Get summary statistics for the current filter
    const stats = await getAuditLogStats(where);
    
    return NextResponse.json({
      success: true,
      data: transformedLogs,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext,
        hasPrev
      },
      stats,
      filters: {
        category,
        eventType,
        subcategory,
        entityType,
        entityId,
        actorId,
        severity,
        status,
        search,
        dateFrom,
        dateTo,
        relatedUserId,
        relatedJobId,
        relatedApplicationId,
        sortBy,
        sortOrder
      }
    });
    
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs", details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to get audit log statistics
async function getAuditLogStats(where) {
  try {
    // Get counts by category
    const categoryStats = await prisma.auditLog.groupBy({
      by: ['category'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    });
    
    // Get counts by event type
    const eventTypeStats = await prisma.auditLog.groupBy({
      by: ['event_type'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    });
    
    // Get counts by severity
    const severityStats = await prisma.auditLog.groupBy({
      by: ['severity'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    });
    
    // Get counts by status
    const statusStats = await prisma.auditLog.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    });
    
    // Get activity over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const activityStats = await prisma.auditLog.groupBy({
      by: ['created_at'],
      where: {
        ...where,
        created_at: { gte: thirtyDaysAgo }
      },
      _count: { id: true },
      orderBy: { created_at: 'asc' }
    });
    
    return {
      byCategory: categoryStats.map(stat => ({
        category: stat.category,
        count: stat._count.id
      })),
      byEventType: eventTypeStats.map(stat => ({
        eventType: stat.event_type,
        count: stat._count.id
      })),
      bySeverity: severityStats.map(stat => ({
        severity: stat.severity,
        count: stat._count.id
      })),
      byStatus: statusStats.map(stat => ({
        status: stat.status,
        count: stat._count.id
      })),
      recentActivity: activityStats.map(stat => ({
        date: stat.created_at,
        count: stat._count.id
      }))
    };
  } catch (error) {
    console.error("Error getting audit log stats:", error);
    return {
      byCategory: [],
      byEventType: [],
      bySeverity: [],
      byStatus: [],
      recentActivity: []
    };
  }
}

// GET endpoint for getting available filter options
export async function OPTIONS(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.privilegeLevel || session.user.privilegeLevel < 2) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get unique values for filter dropdowns
    const [
      categories,
      eventTypes,
      subcategories,
      entityTypes,
      severities,
      statuses
    ] = await Promise.all([
      prisma.auditLog.findMany({ distinct: ['category'], select: { category: true } }),
      prisma.auditLog.findMany({ distinct: ['event_type'], select: { event_type: true } }),
      prisma.auditLog.findMany({ distinct: ['subcategory'], select: { subcategory: true }, where: { subcategory: { not: null } } }),
      prisma.auditLog.findMany({ distinct: ['entity_type'], select: { entity_type: true }, where: { entity_type: { not: null } } }),
      prisma.auditLog.findMany({ distinct: ['severity'], select: { severity: true } }),
      prisma.auditLog.findMany({ distinct: ['status'], select: { status: true } })
    ]);

    return NextResponse.json({
      success: true,
      filterOptions: {
        categories: categories.map(c => c.category).sort(),
        eventTypes: eventTypes.map(e => e.event_type).sort(),
        subcategories: subcategories.map(s => s.subcategory).sort(),
        entityTypes: entityTypes.map(e => e.entity_type).sort(),
        severities: severities.map(s => s.severity).sort(),
        statuses: statuses.map(s => s.status).sort()
      },
      // Also include the constants for reference
      constants: {
        CATEGORIES: Object.values(CATEGORIES),
        EVENT_TYPES: Object.values(EVENT_TYPES),
        SEVERITY: Object.values(SEVERITY)
      }
    });

  } catch (error) {
    console.error("Error getting filter options:", error);
    return NextResponse.json(
      { error: "Failed to get filter options", details: error.message },
      { status: 500 }
    );
  }
}