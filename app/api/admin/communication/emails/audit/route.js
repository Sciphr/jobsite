import { NextResponse } from "next/server";
import { PrismaClient } from "@/app/generated/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../auth/[...nextauth]/route";

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !session.user.privilegeLevel ||
      session.user.privilegeLevel < 2
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Parse query parameters for filtering
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 50;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const jobId = searchParams.get("jobId") || "";
    const templateId = searchParams.get("templateId") || "";
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const actorId = searchParams.get("actorId") || "";
    const severity = searchParams.get("severity") || "";
    const includeFailures = searchParams.get("includeFailures") === "true";

    // Build where clause for audit logs
    const where = {
      category: "EMAIL",
    };

    if (search) {
      where.OR = [
        { description: { contains: search, mode: "insensitive" } },
        { actorName: { contains: search, mode: "insensitive" } },
        { entityName: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status === "success") {
      where.status = "success";
    } else if (status === "failure") {
      where.status = "failure";
    } else if (status === "pending") {
      where.status = "pending";
    }

    if (severity) {
      where.severity = severity;
    }

    if (actorId) {
      where.actorId = actorId;
    }

    if (jobId) {
      where.relatedJobId = jobId;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo);
      }
    }

    // Include both successful and failed email events
    where.eventType = { in: ["SEND", "ERROR"] };

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const totalCount = await prisma.audit_logs.count({ where });

    // Fetch audit logs for email events
    const auditLogs = await prisma.audit_logs.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        relatedUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        relatedJob: {
          select: {
            id: true,
            title: true,
            department: true,
          },
        },
        relatedApplication: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Enhance audit logs with email table data when available
    const enhancedLogs = await Promise.all(
      auditLogs.map(async (log) => {
        let emailDetails = null;

        // Try to find corresponding email record if metadata contains email info
        if (log.metadata && (log.metadata.subject || log.metadata.recipients)) {
          try {
            const emailQuery = {};
            if (log.metadata.subject) {
              emailQuery.subject = log.metadata.subject;
            }
            if (log.relatedJobId) {
              emailQuery.job_id = log.relatedJobId;
            }
            if (log.relatedApplicationId) {
              emailQuery.application_id = log.relatedApplicationId;
            }
            if (log.createdAt) {
              // Look for emails sent within 5 minutes of the audit log
              const timeWindow = 5 * 60 * 1000; // 5 minutes in milliseconds
              emailQuery.sent_at = {
                gte: new Date(log.createdAt.getTime() - timeWindow),
                lte: new Date(log.createdAt.getTime() + timeWindow),
              };
            }

            emailDetails = await prisma.email.findFirst({
              where: emailQuery,
              include: {
                email_templates: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                  },
                },
              },
            });
          } catch (error) {
            console.warn(
              "Could not fetch email details for audit log:",
              log.id
            );
          }
        }

        return {
          id: log.id,
          eventType: log.eventType,
          category: log.category,
          subcategory: log.subcategory,
          entityType: log.entityType,
          entityId: log.entityId,
          entityName: log.entityName,
          actorId: log.actorId,
          actorType: log.actorType,
          actorName: log.actorName,
          action: log.action,
          description: log.description,
          oldValues: log.oldValues,
          newValues: log.newValues,
          changes: log.changes,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          sessionId: log.sessionId,
          requestId: log.requestId,
          relatedUserId: log.relatedUserId,
          relatedJobId: log.relatedJobId,
          relatedApplicationId: log.relatedApplicationId,
          severity: log.severity,
          status: log.status,
          tags: log.tags,
          metadata: log.metadata,
          createdAt: log.createdAt,
          // Related entities
          relatedUser: log.relatedUser,
          relatedJob: log.relatedJob,
          relatedApplication: log.relatedApplication,
          // Enhanced email details
          emailDetails: emailDetails
            ? {
                id: emailDetails.id,
                subject: emailDetails.subject,
                content: emailDetails.content,
                recipientEmail: emailDetails.recipient_email,
                recipientName: emailDetails.recipient_name,
                status: emailDetails.status,
                messageId: emailDetails.message_id,
                failureReason: emailDetails.failure_reason,
                openedAt: emailDetails.opened_at,
                clickedAt: emailDetails.clicked_at,
                sentAt: emailDetails.sent_at,
                template: emailDetails.email_templates,
              }
            : null,
          // Computed fields for UI
          recipientInfo: emailDetails
            ? {
                email: emailDetails.recipient_email,
                name: emailDetails.recipient_name,
              }
            : log.relatedApplication
              ? {
                  email: log.relatedApplication.email,
                  name: log.relatedApplication.name,
                }
              : null,
          emailSubject:
            emailDetails?.subject || log.metadata?.subject || "Email Activity",
          emailStatus:
            emailDetails?.status ||
            (log.status === "success" ? "sent" : "failed"),
          sentAt: emailDetails?.sent_at || log.createdAt,
          templateInfo:
            emailDetails?.email_templates ||
            (log.metadata?.templateId
              ? {
                  id: log.metadata.templateId,
                  name: log.metadata.templateName || "Unknown Template",
                }
              : null),
          campaignInfo:
            log.subcategory === "BULK_SEND"
              ? {
                  isBulk: true,
                  recipientCount:
                    log.metadata?.recipientCount ||
                    log.metadata?.successfulSends + log.metadata?.failedSends,
                  successCount: log.metadata?.successfulSends || 0,
                  failureCount: log.metadata?.failedSends || 0,
                }
              : null,
        };
      })
    );

    // Get summary statistics from audit logs
    const statsQuery = {
      category: "EMAIL",
      eventType: { in: ["SEND", "ERROR"] },
    };

    if (dateFrom || dateTo) {
      statsQuery.createdAt = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo) }),
      };
    }

    const [
      totalEmailEvents,
      successfulSends,
      failedSends,
      bulkCampaigns,
      uniqueSenders,
    ] = await Promise.all([
      prisma.audit_logs.count({ where: statsQuery }),
      prisma.audit_logs.count({
        where: { ...statsQuery, status: "success", eventType: "SEND" },
      }),
      prisma.audit_logs.count({
        where: { ...statsQuery, status: "failure" },
      }),
      prisma.audit_logs.count({
        where: { ...statsQuery, subcategory: "BULK_SEND" },
      }),
      prisma.audit_logs.findMany({
        where: statsQuery,
        select: { actorId: true },
        distinct: ["actorId"],
      }),
    ]);

    // Get activity trends (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activityTrends = await prisma.audit_logs.groupBy({
      by: ["createdAt"],
      where: {
        category: "EMAIL",
        eventType: "SEND",
        createdAt: { gte: thirtyDaysAgo },
      },
      _count: { id: true },
      orderBy: { createdAt: "asc" },
    });

    const enhancedStats = {
      total: totalEmailEvents,
      sent: successfulSends,
      failed: failedSends,
      bulkCampaigns: bulkCampaigns,
      uniqueSenders: uniqueSenders.length,
      successRate:
        totalEmailEvents > 0
          ? Math.round((successfulSends / totalEmailEvents) * 100)
          : 0,
      activityTrends: activityTrends.map((trend) => ({
        date: trend.createdAt.toISOString().split("T")[0],
        count: trend._count.id,
      })),
    };

    return NextResponse.json({
      success: true,
      data: enhancedLogs,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page * limit < totalCount,
        hasPrev: page > 1,
      },
      stats: enhancedStats,
    });
  } catch (error) {
    console.error("Error fetching email audit history:", error);
    return NextResponse.json(
      { error: "Failed to fetch email audit history", details: error.message },
      { status: 500 }
    );
  }
}
