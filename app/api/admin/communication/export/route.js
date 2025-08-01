import { NextResponse } from "next/server";
import { PrismaClient } from "@/app/generated/prisma";
import ExcelJS from "exceljs";

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters for filtering (same as email history)
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

    // Fetch all emails for export (no pagination)
    const emails = await prisma.email.findMany({
      where,
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

    // Get unique template IDs from emails
    const templateIds = [...new Set(emails.map(email => email.template_id).filter(Boolean))];
    const emailTemplates = templateIds.length > 0 ? await prisma.email_templates.findMany({
      where: {
        id: { in: templateIds }
      },
      select: {
        id: true,
        name: true,
        type: true,
      }
    }) : [];

    // Create a map for easy template lookup
    const templateMap = emailTemplates.reduce((acc, template) => {
      acc[template.id] = template;
      return acc;
    }, {});

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "JobSite Communication Hub";
    workbook.created = new Date();

    // Email History Sheet
    const emailSheet = workbook.addWorksheet("Email History");

    // Define columns
    emailSheet.columns = [
      { header: "Email ID", key: "id", width: 15 },
      { header: "Subject", key: "subject", width: 40 },
      { header: "Recipient Name", key: "recipientName", width: 25 },
      { header: "Recipient Email", key: "recipientEmail", width: 30 },
      { header: "Status", key: "status", width: 12 },
      { header: "Template", key: "template", width: 25 },
      { header: "Job Title", key: "jobTitle", width: 30 },
      { header: "Department", key: "department", width: 20 },
      { header: "Sent At", key: "sentAt", width: 20 },
      { header: "Opened At", key: "openedAt", width: 20 },
      { header: "Clicked At", key: "clickedAt", width: 20 },
      { header: "Email Provider", key: "emailProvider", width: 15 },
      { header: "Message ID", key: "messageId", width: 30 },
      { header: "Failure Reason", key: "failureReason", width: 40 },
    ];

    // Style header row
    emailSheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '366092' }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Add data rows
    emails.forEach((email, index) => {
      const row = emailSheet.addRow({
        id: email.id,
        subject: email.subject,
        recipientName: email.recipient_name || "",
        recipientEmail: email.recipient_email,
        status: email.status,
        template: email.template_id && templateMap[email.template_id] ? templateMap[email.template_id].name : "",
        jobTitle: email.jobs?.title || "",
        department: email.jobs?.department || "",
        sentAt: email.sent_at ? new Date(email.sent_at).toLocaleString() : "",
        openedAt: email.opened_at ? new Date(email.opened_at).toLocaleString() : "",
        clickedAt: email.clicked_at ? new Date(email.clicked_at).toLocaleString() : "",
        emailProvider: email.email_provider || "",
        messageId: email.message_id || "",
        failureReason: email.failure_reason || "",
      });

      // Style data rows
      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };

        // Color code status
        if (colNumber === 5) { // Status column
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
            case 'pending':
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8E1' } };
              break;
          }
        }

        // Alternate row colors
        if (index % 2 === 1) {
          if (!cell.fill || !cell.fill.fgColor) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8F9FA' } };
          }
        }
      });
    });

    // Summary Sheet
    const summarySheet = workbook.addWorksheet("Email Summary");

    // Get summary statistics
    const stats = await prisma.email.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
    });

    const statusStats = stats.reduce((acc, stat) => {
      acc[stat.status] = stat._count.id;
      return acc;
    }, {});

    // Summary data
    const summaryData = [
      ["Metric", "Count"],
      ["Total Emails", emails.length],
      ["Sent", statusStats.sent || 0],
      ["Delivered", statusStats.delivered || 0],
      ["Opened", statusStats.opened || 0],
      ["Clicked", statusStats.clicked || 0],
      ["Failed", statusStats.failed || 0],
      ["Pending", statusStats.pending || 0],
    ];

    // Add summary data
    summaryData.forEach((row, index) => {
      const summaryRow = summarySheet.addRow(row);
      
      if (index === 0) {
        // Header row
        summaryRow.eachCell((cell) => {
          cell.font = { bold: true, color: { argb: 'FFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '366092' } };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });
      } else {
        // Data rows
        summaryRow.getCell(1).font = { bold: true };
        summaryRow.getCell(2).alignment = { horizontal: 'center' };
      }
      
      summaryRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // Set column widths
    summarySheet.getColumn(1).width = 20;
    summarySheet.getColumn(2).width = 15;

    // Templates Sheet
    const templates = await prisma.email_templates.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
      include: {
        users: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const templatesSheet = workbook.addWorksheet("Email Templates");

    templatesSheet.columns = [
      { header: "Template ID", key: "id", width: 15 },
      { header: "Name", key: "name", width: 30 },
      { header: "Type", key: "type", width: 20 },
      { header: "Subject", key: "subject", width: 40 },
      { header: "Is Default", key: "isDefault", width: 12 },
      { header: "Created By", key: "createdBy", width: 25 },
      { header: "Created At", key: "createdAt", width: 20 },
    ];

    // Style template header
    templatesSheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '366092' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Add template data
    templates.forEach((template, index) => {
      const row = templatesSheet.addRow({
        id: template.id,
        name: template.name,
        type: template.type,
        subject: template.subject,
        isDefault: template.is_default ? "Yes" : "No",
        createdBy: template.users ? `${template.users.firstName || ''} ${template.users.lastName || ''}`.trim() : "",
        createdAt: template.created_at ? new Date(template.created_at).toLocaleString() : "",
      });

      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };

        if (index % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8F9FA' } };
        }
      });
    });

    // Generate Excel buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Create filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `email-history-${timestamp}.xlsx`;

    // Return Excel file
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });

  } catch (error) {
    console.error("Error generating Excel export:", error);
    return NextResponse.json(
      { error: "Failed to generate Excel export", details: error.message },
      { status: 500 }
    );
  }
}