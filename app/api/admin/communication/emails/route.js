import { NextResponse } from "next/server";
import { appPrisma } from "../../../../lib/prisma";

export async function GET(request) {
  try {
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
    const sortBy = searchParams.get("sortBy") || "sent_at";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Build where clause for filtering
    const where = {};

    if (search) {
      where.OR = [
        { subject: { contains: search, mode: "insensitive" } },
        { recipient_name: { contains: search, mode: "insensitive" } },
        { recipient_email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (jobId) {
      where.job_id = jobId;
    }

    if (templateId) {
      where.template_id = templateId;
    }

    if (dateFrom || dateTo) {
      where.sent_at = {};
      if (dateFrom) {
        where.sent_at.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.sent_at.lte = new Date(dateTo);
      }
    }

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const totalCount = await appPrisma.emails.count({ where });

    // Fetch emails with related data
    const emails = await appPrisma.emails.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        jobs: {
          select: {
            title: true,
            department: true,
          },
        },
        applications: {
          select: {
            id: true,
            name: true,
          },
        },
        users: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Get unique template IDs to fetch template data
    const templateIds = [
      ...new Set(emails.map((email) => email.template_id).filter(Boolean)),
    ];
    const templates =
      templateIds.length > 0
        ? await appPrisma.email_templates.findMany({
            where: {
              id: { in: templateIds },
            },
            select: {
              id: true,
              name: true,
              type: true,
            },
          })
        : [];

    // Create a map for easy template lookup
    const templateMap = templates.reduce((acc, template) => {
      acc[template.id] = template;
      return acc;
    }, {});

    // Transform data for frontend
    const transformedEmails = emails.map((email) => ({
      id: email.id,
      subject: email.subject,
      content: email.content,
      htmlContent: email.html_content,
      recipientEmail: email.recipient_email,
      recipientName: email.recipient_name,
      applicationId: email.application_id,
      jobId: email.job_id,
      templateId: email.template_id,
      emailProvider: email.email_provider,
      messageId: email.message_id,
      status: email.status,
      failureReason: email.failure_reason,
      openedAt: email.opened_at,
      clickedAt: email.clicked_at,
      repliedAt: email.replied_at,
      sentBy: email.sent_by,
      sentAt: email.sent_at,
      campaignId: email.campaign_id,
      template:
        email.template_id && templateMap[email.template_id]
          ? {
              name: templateMap[email.template_id].name,
              type: templateMap[email.template_id].type,
            }
          : null,
      job: email.jobs
        ? {
            title: email.jobs.title,
            department: email.jobs.department,
          }
        : null,
      application: email.applications
        ? {
            id: email.applications.id,
            name: email.applications.name,
          }
        : null,
      sender: email.users
        ? {
            name: `${email.users.firstName || ""} ${email.users.lastName || ""}`.trim(),
            email: email.users.email,
          }
        : null,
    }));

    // Get summary statistics
    const stats = await appPrisma.emails.groupBy({
      by: ["status"],
      where:
        dateFrom || dateTo
          ? {
              sent_at: {
                ...(dateFrom && { gte: new Date(dateFrom) }),
                ...(dateTo && { lte: new Date(dateTo) }),
              },
            }
          : {},
      _count: {
        id: true,
      },
    });

    const statusStats = stats.reduce((acc, stat) => {
      acc[stat.status] = stat._count.id;
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      data: transformedEmails,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page * limit < totalCount,
        hasPrev: page > 1,
      },
      stats: {
        total: totalCount,
        sent: statusStats.sent || 0,
        delivered: statusStats.delivered || 0,
        opened: statusStats.opened || 0,
        failed: statusStats.failed || 0,
        pending: statusStats.pending || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching email history:", error);
    return NextResponse.json(
      { error: "Failed to fetch email history", details: error.message },
      { status: 500 }
    );
  }
}
