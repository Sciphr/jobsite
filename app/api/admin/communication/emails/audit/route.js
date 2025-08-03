import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../auth/[...nextauth]/route";
import { appPrisma } from "../../../../../lib/prisma";

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
        { actor_name: { contains: search, mode: "insensitive" } },
        { entity_name: { contains: search, mode: "insensitive" } },
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
      where.actor_id = actorId;
    }

    if (jobId) {
      where.related_job_id = jobId;
    }

    if (dateFrom || dateTo) {
      where.created_at = {};
      if (dateFrom) {
        where.created_at.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.created_at.lte = new Date(dateTo);
      }
    }

    // Include both successful and failed email events
    where.event_type = { in: ["SEND", "ERROR"] };

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const totalCount = await appPrisma.audit_logs.count({ where });

    // Fetch audit logs for email events
    const auditLogs = await appPrisma.audit_logs.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sortBy === "createdAt" ? "created_at" : sortBy]: sortOrder,
      },
      include: {
        users_audit_logs_related_user_idTousers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        jobs: {
          select: {
            id: true,
            title: true,
            department: true,
          },
        },
        applications: {
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
            if (log.related_job_id) {
              emailQuery.job_id = log.related_job_id;
            }
            if (log.related_application_id) {
              emailQuery.application_id = log.related_application_id;
            }
            if (log.created_at) {
              // Look for emails sent within 5 minutes of the audit log
              const timeWindow = 5 * 60 * 1000; // 5 minutes in milliseconds
              emailQuery.sent_at = {
                gte: new Date(log.created_at.getTime() - timeWindow),
                lte: new Date(log.created_at.getTime() + timeWindow),
              };
            }

            emailDetails = await appPrisma.emails.findFirst({
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
          severity: log.severity,
          status: log.status,
          tags: log.tags,
          metadata: log.metadata,
          createdAt: log.created_at,
          // Related entities
          relatedUser: log.users_audit_logs_related_user_idTousers,
          relatedJob: log.jobs,
          relatedApplication: log.applications,
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
          sentAt: emailDetails?.sent_at || log.created_at,
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
      event_type: { in: ["SEND", "ERROR"] },
    };

    if (dateFrom || dateTo) {
      statsQuery.created_at = {
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
      appPrisma.audit_logs.count({ where: statsQuery }),
      appPrisma.audit_logs.count({
        where: { ...statsQuery, status: "success", event_type: "SEND" },
      }),
      appPrisma.audit_logs.count({
        where: { ...statsQuery, status: "failure" },
      }),
      appPrisma.audit_logs.count({
        where: { ...statsQuery, subcategory: "BULK_SEND" },
      }),
      appPrisma.audit_logs.findMany({
        where: statsQuery,
        select: { actor_id: true },
        distinct: ["actor_id"],
      }),
    ]);

    // Get activity trends (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activityTrends = await appPrisma.audit_logs.groupBy({
      by: ["created_at"],
      where: {
        category: "EMAIL",
        event_type: "SEND",
        created_at: { gte: thirtyDaysAgo },
      },
      _count: { id: true },
      orderBy: { created_at: "asc" },
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
        date: trend.created_at.toISOString().split("T")[0],
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
