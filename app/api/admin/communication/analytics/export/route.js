import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../auth/[...nextauth]/route";
import { appPrisma } from "../../../../../lib/prisma";
import ExcelJS from "exceljs";
import * as XLSX from 'xlsx';
import { protectRoute } from "../../../../../lib/middleware/apiProtection";

export async function GET(request) {
  try {
    const authResult = await protectRoute("analytics", "export");
    if (authResult.error) return authResult.error;
    const { session } = authResult;

    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const timeRange = searchParams.get("timeRange") || "30d";
    const format = searchParams.get("format") || "xlsx"; // xlsx or csv
    const sortBy = searchParams.get("sortBy") || "sent_at";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Calculate date range based on timeRange if no explicit dates provided
    let startDate, endDate;
    if (dateFrom && dateTo) {
      startDate = new Date(dateFrom);
      endDate = new Date(dateTo);
    } else {
      endDate = new Date();
      startDate = new Date();
      
      switch (timeRange) {
        case "7d":
          startDate.setDate(endDate.getDate() - 7);
          break;
        case "30d":
          startDate.setDate(endDate.getDate() - 30);
          break;
        case "90d":
          startDate.setDate(endDate.getDate() - 90);
          break;
        case "1y":
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }
    }

    // Build where clause for date filtering
    const emailWhere = {
      sent_at: {
        gte: startDate,
        lte: endDate,
      },
    };

    // Fetch comprehensive email analytics data
    const [
      totalEmails,
      emailsByStatus,
      emailsByTemplate,
      emailsByJob,
      emailsByDay,
      topPerformingTemplates,
      recentEmails,
      emailEngagement,
    ] = await Promise.all([
      // Total emails
      appPrisma.emails.count({ where: emailWhere }),

      // Emails by status
      appPrisma.emails.groupBy({
        by: ["status"],
        where: emailWhere,
        _count: { id: true },
      }),

      // Emails by template
      appPrisma.emails.groupBy({
        by: ["template_id"],
        where: { ...emailWhere, template_id: { not: null } },
        _count: { id: true },
      }),

      // Emails by job
      appPrisma.emails.groupBy({
        by: ["job_id"],
        where: { ...emailWhere, job_id: { not: null } },
        _count: { id: true },
      }),

      // Daily email activity
      appPrisma.emails.groupBy({
        by: ["sent_at"],
        where: emailWhere,
        _count: { id: true },
        orderBy: { sent_at: "asc" },
      }),

      // Top performing templates (by open rate)
      appPrisma.emails.findMany({
        where: { 
          ...emailWhere, 
          template_id: { not: null },
          opened_at: { not: null }
        },
        select: {
          template_id: true,
          opened_at: true,
        },
      }),

      // Recent emails for detailed analysis
      appPrisma.emails.findMany({
        where: emailWhere,
        orderBy: { [sortBy]: sortOrder },
        take: 100, // Limit for export
        include: {
          jobs: {
            select: {
              title: true,
              department: true,
            },
          },
          applications: {
            select: {
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
      }),

      // Engagement metrics
      appPrisma.emails.aggregate({
        where: emailWhere,
        _count: {
          id: true,
          opened_at: true,
          clicked_at: true,
          replied_at: true,
        },
      }),
    ]);

    // Process template data
    const templateIds = [...new Set([
      ...emailsByTemplate.map(t => t.template_id),
      ...topPerformingTemplates.map(t => t.template_id),
      ...recentEmails.filter(e => e.template_id).map(e => e.template_id)
    ])];
    
    const templates = templateIds.length > 0 ? await appPrisma.email_templates.findMany({
      where: { id: { in: templateIds } },
      select: { id: true, name: true, type: true },
    }) : [];
    
    const templateMap = templates.reduce((acc, template) => {
      acc[template.id] = template;
      return acc;
    }, {});

    // Process job data
    const jobIds = emailsByJob.map(j => j.job_id);
    const jobs = jobIds.length > 0 ? await appPrisma.jobs.findMany({
      where: { id: { in: jobIds } },
      select: { id: true, title: true, department: true },
    }) : [];
    const jobMap = jobs.reduce((acc, job) => {
      acc[job.id] = job;
      return acc;
    }, {});

    // Calculate analytics
    const statusStats = emailsByStatus.reduce((acc, stat) => {
      acc[stat.status] = stat._count.id;
      return acc;
    }, {});

    const deliveryRate = totalEmails > 0 ? Math.round(((statusStats.delivered || 0) / totalEmails) * 100) : 0;
    const openRate = (statusStats.delivered || 0) > 0 ? Math.round((emailEngagement._count.opened_at / (statusStats.delivered || 1)) * 100) : 0;
    const clickRate = emailEngagement._count.opened_at > 0 ? Math.round((emailEngagement._count.clicked_at / emailEngagement._count.opened_at) * 100) : 0;
    const replyRate = totalEmails > 0 ? Math.round((emailEngagement._count.replied_at / totalEmails) * 100) : 0;

    // Prepare analytics data
    const analyticsData = {
      overview: {
        totalEmails,
        deliveryRate,
        openRate,
        clickRate,
        replyRate,
        sent: statusStats.sent || 0,
        delivered: statusStats.delivered || 0,
        opened: emailEngagement._count.opened_at || 0,
        clicked: emailEngagement._count.clicked_at || 0,
        failed: statusStats.failed || 0,
        pending: statusStats.pending || 0,
        bounced: statusStats.bounced || 0,
      },
      timeRange: getTimeRangeLabel(timeRange),
      dateRange: {
        from: startDate.toISOString().split('T')[0],
        to: endDate.toISOString().split('T')[0],
      },
      emailsByTemplate: emailsByTemplate.map(t => ({
        templateId: t.template_id,
        templateName: templateMap[t.template_id]?.name || "Unknown Template",
        templateType: templateMap[t.template_id]?.type || "Unknown",
        count: t._count.id,
      })),
      emailsByJob: emailsByJob.map(j => ({
        jobId: j.job_id,
        jobTitle: jobMap[j.job_id]?.title || "Unknown Job",
        department: jobMap[j.job_id]?.department || "Unknown",
        count: j._count.id,
      })),
      dailyActivity: emailsByDay.map(day => ({
        date: day.sent_at ? day.sent_at.toISOString().split('T')[0] : null,
        emails: day._count.id,
      })),
      topTemplates: Object.values(
        topPerformingTemplates.reduce((acc, email) => {
          const templateId = email.template_id;
          if (!acc[templateId]) {
            acc[templateId] = {
              templateId,
              templateName: templateMap[templateId]?.name || "Unknown",
              templateType: templateMap[templateId]?.type || "Unknown",
              totalSent: 0,
              totalOpened: 0,
            };
          }
          acc[templateId].totalSent++;
          if (email.opened_at) {
            acc[templateId].totalOpened++;
          }
          return acc;
        }, {})
      ).map(template => ({
        ...template,
        openRate: template.totalSent > 0 ? Math.round((template.totalOpened / template.totalSent) * 100) : 0,
      })).sort((a, b) => b.openRate - a.openRate).slice(0, 10),
      recentEmails: recentEmails.map(email => ({
        id: email.id,
        subject: email.subject,
        recipientName: email.recipient_name || "Unknown",
        recipientEmail: email.recipient_email,
        status: email.status,
        templateName: templateMap[email.template_id]?.name || "Custom",
        jobTitle: email.jobs?.title || "",
        department: email.jobs?.department || "",
        sentAt: email.sent_at,
        openedAt: email.opened_at,
        clickedAt: email.clicked_at,
        repliedAt: email.replied_at,
        senderName: email.users ? `${email.users.firstName || ""} ${email.users.lastName || ""}`.trim() : "System",
      })),
    };

    if (format === "csv") {
      return generateCSVExport(analyticsData);
    } else {
      return generateExcelExport(analyticsData);
    }

  } catch (error) {
    console.error("Error generating analytics export:", error);
    return NextResponse.json(
      { error: "Failed to generate analytics export", details: error.message },
      { status: 500 }
    );
  }
}

function generateExcelExport(analyticsData) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "JobSite Communication Analytics";
  workbook.created = new Date();

  // Overview Sheet
  const overviewSheet = workbook.addWorksheet("Analytics Overview");
  
  overviewSheet.columns = [
    { header: "Metric", key: "metric", width: 25 },
    { header: "Value", key: "value", width: 15 },
    { header: "Percentage", key: "percentage", width: 15 },
  ];

  // Style header row
  overviewSheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '366092' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' }, left: { style: 'thin' },
      bottom: { style: 'thin' }, right: { style: 'thin' }
    };
  });

  // Add overview data
  const overviewData = [
    { metric: "Report Period", value: analyticsData.timeRange, percentage: "" },
    { metric: "Date Range", value: `${analyticsData.dateRange.from} to ${analyticsData.dateRange.to}`, percentage: "" },
    { metric: "", value: "", percentage: "" },
    { metric: "CORE METRICS", value: "", percentage: "" },
    { metric: "Total Emails Sent", value: analyticsData.overview.totalEmails, percentage: "" },
    { metric: "Successfully Delivered", value: analyticsData.overview.delivered, percentage: `${analyticsData.overview.deliveryRate}%` },
    { metric: "Emails Opened", value: analyticsData.overview.opened, percentage: `${analyticsData.overview.openRate}%` },
    { metric: "Links Clicked", value: analyticsData.overview.clicked, percentage: `${analyticsData.overview.clickRate}%` },
    { metric: "Replies Received", value: analyticsData.overview.replied || 0, percentage: `${analyticsData.overview.replyRate}%` },
    { metric: "", value: "", percentage: "" },
    { metric: "STATUS BREAKDOWN", value: "", percentage: "" },
    { metric: "Pending", value: analyticsData.overview.pending, percentage: "" },
    { metric: "Sent", value: analyticsData.overview.sent, percentage: "" },
    { metric: "Failed", value: analyticsData.overview.failed, percentage: "" },
    { metric: "Bounced", value: analyticsData.overview.bounced, percentage: "" },
  ];

  overviewData.forEach((row, index) => {
    const addedRow = overviewSheet.addRow(row);
    addedRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
      };
      if (index % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8F9FA' } };
      }
    });
  });

  // Templates Performance Sheet
  const templatesSheet = workbook.addWorksheet("Template Performance");
  templatesSheet.columns = [
    { header: "Template Name", key: "name", width: 30 },
    { header: "Type", key: "type", width: 15 },
    { header: "Emails Sent", key: "sent", width: 12 },
    { header: "Emails Opened", key: "opened", width: 12 },
    { header: "Open Rate", key: "openRate", width: 12 },
  ];

  // Style templates header
  templatesSheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '366092' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' }, left: { style: 'thin' },
      bottom: { style: 'thin' }, right: { style: 'thin' }
    };
  });

  analyticsData.topTemplates.forEach((template, index) => {
    const row = templatesSheet.addRow({
      name: template.templateName,
      type: template.templateType,
      sent: template.totalSent,
      opened: template.totalOpened,
      openRate: `${template.openRate}%`,
    });

    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
      };
      if (index % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8F9FA' } };
      }
    });
  });

  // Daily Activity Sheet
  const dailySheet = workbook.addWorksheet("Daily Activity");
  dailySheet.columns = [
    { header: "Date", key: "date", width: 15 },
    { header: "Emails Sent", key: "emails", width: 15 },
  ];

  // Style daily header
  dailySheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '366092' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' }, left: { style: 'thin' },
      bottom: { style: 'thin' }, right: { style: 'thin' }
    };
  });

  analyticsData.dailyActivity.forEach((day, index) => {
    if (day.date) {
      const row = dailySheet.addRow({
        date: day.date,
        emails: day.emails,
      });

      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' }
        };
        if (index % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8F9FA' } };
        }
      });
    }
  });

  // Recent Emails Sheet (first 50 for performance)
  const emailsSheet = workbook.addWorksheet("Recent Emails");
  emailsSheet.columns = [
    { header: "Subject", key: "subject", width: 40 },
    { header: "Recipient", key: "recipient", width: 25 },
    { header: "Status", key: "status", width: 12 },
    { header: "Template", key: "template", width: 20 },
    { header: "Job", key: "job", width: 25 },
    { header: "Sent At", key: "sentAt", width: 20 },
    { header: "Opened", key: "opened", width: 10 },
    { header: "Clicked", key: "clicked", width: 10 },
  ];

  // Style emails header
  emailsSheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '366092' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' }, left: { style: 'thin' },
      bottom: { style: 'thin' }, right: { style: 'thin' }
    };
  });

  analyticsData.recentEmails.slice(0, 50).forEach((email, index) => {
    const row = emailsSheet.addRow({
      subject: email.subject,
      recipient: `${email.recipientName} (${email.recipientEmail})`,
      status: email.status,
      template: email.templateName,
      job: email.jobTitle,
      sentAt: email.sentAt ? new Date(email.sentAt).toLocaleString() : "",
      opened: email.openedAt ? "Yes" : "No",
      clicked: email.clickedAt ? "Yes" : "No",
    });

    row.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
      };

      // Color code status
      if (colNumber === 3) {
        switch (email.status) {
          case 'sent':
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E3F2FD' } };
            break;
          case 'delivered':
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E8F5E8' } };
            break;
          case 'opened':
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F3E5F5' } };
            break;
          case 'failed':
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBEE' } };
            break;
        }
      } else if (index % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8F9FA' } };
      }
    });
  });

  // Generate Excel buffer
  return workbook.xlsx.writeBuffer().then(buffer => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `email-analytics-${analyticsData.timeRange}-${timestamp}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  });
}

function generateCSVExport(analyticsData) {
  // Create comprehensive CSV data
  const csvData = [
    // Header
    [`Email Analytics Export - ${analyticsData.timeRange}`, '', '', '', ''],
    [`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, '', '', '', ''],
    [`Date Range: ${analyticsData.dateRange.from} to ${analyticsData.dateRange.to}`, '', '', '', ''],
    ['', '', '', '', ''],
    
    // Overview metrics
    ['OVERVIEW METRICS', '', '', '', ''],
    ['Metric', 'Value', 'Percentage', '', ''],
    ['Total Emails', analyticsData.overview.totalEmails, '', '', ''],
    ['Delivered', analyticsData.overview.delivered, `${analyticsData.overview.deliveryRate}%`, '', ''],
    ['Opened', analyticsData.overview.opened, `${analyticsData.overview.openRate}%`, '', ''],
    ['Clicked', analyticsData.overview.clicked, `${analyticsData.overview.clickRate}%`, '', ''],
    ['Failed', analyticsData.overview.failed, '', '', ''],
    ['', '', '', '', ''],
    
    // Template performance
    ['TEMPLATE PERFORMANCE', '', '', '', ''],
    ['Template Name', 'Type', 'Sent', 'Opened', 'Open Rate'],
    ...analyticsData.topTemplates.map(template => [
      template.templateName,
      template.templateType,
      template.totalSent,
      template.totalOpened,
      `${template.openRate}%`
    ]),
    ['', '', '', '', ''],
    
    // Daily activity
    ['DAILY ACTIVITY', '', '', '', ''],
    ['Date', 'Emails Sent', '', '', ''],
    ...analyticsData.dailyActivity.filter(day => day.date).map(day => [
      day.date,
      day.emails,
      '',
      '',
      ''
    ]),
    ['', '', '', '', ''],
    
    // Recent emails (limited to 25 for CSV)
    ['RECENT EMAILS (Last 25)', '', '', '', ''],
    ['Subject', 'Recipient', 'Status', 'Template', 'Sent At'],
    ...analyticsData.recentEmails.slice(0, 25).map(email => [
      email.subject,
      `${email.recipientName} (${email.recipientEmail})`,
      email.status,
      email.templateName,
      email.sentAt ? new Date(email.sentAt).toLocaleString() : ''
    ]),
  ];

  // Convert to CSV
  const worksheet = XLSX.utils.aoa_to_sheet(csvData);
  const csv = XLSX.utils.sheet_to_csv(worksheet);

  // Create filename
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const filename = `email-analytics-${analyticsData.timeRange}-${timestamp}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

// Helper function to get readable time range label
function getTimeRangeLabel(timeRange) {
  const labels = {
    '7d': 'Last 7 days',
    '30d': 'Last 30 days', 
    '90d': 'Last 90 days',
    '1y': 'Last year'
  };
  return labels[timeRange] || 'Custom range';
}