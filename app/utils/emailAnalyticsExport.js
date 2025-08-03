import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export const exportEmailAnalyticsToExcel = (analyticsData, timeRange) => {
  const workbook = XLSX.utils.book_new();
  
  // Get current date for filename
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  
  // Overview metrics sheet
  const overviewData = [
    ['Email Analytics Overview', '', ''],
    ['Generated:', `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, ''],
    ['Time Range:', getTimeRangeLabel(timeRange), ''],
    ['', '', ''],
    ['CORE METRICS:', '', ''],
    ['Total Emails Sent:', analyticsData.totalSent || 0, ''],
    ['Successfully Delivered:', analyticsData.delivered || 0, ''],
    ['Emails Opened:', analyticsData.opened || 0, ''],
    ['Links Clicked:', analyticsData.clicked || 0, ''],
    ['Failed Emails:', analyticsData.failed || 0, ''],
    ['Bounced Emails:', analyticsData.bounced || 0, ''],
    ['', '', ''],
    ['PERFORMANCE RATES:', '', ''],
    ['Delivery Rate:', `${analyticsData.deliveryRate || 0}%`, ''],
    ['Open Rate:', `${analyticsData.openRate || 0}%`, ''],
    ['Click Rate:', `${analyticsData.clickRate || 0}%`, ''],
    ['Bounce Rate:', `${analyticsData.bounceRate || 0}%`, ''],
  ];

  const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
  overviewSheet['!cols'] = [
    { width: 25 },
    { width: 20 },
    { width: 15 }
  ];
  XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Overview');

  // Template performance sheet (if available)
  if (analyticsData.templatePerformance && analyticsData.templatePerformance.length > 0) {
    const templateData = analyticsData.templatePerformance.map(template => ({
      'Template Name': template.name,
      'Type': template.type,
      'Emails Sent': template.sent,
      'Emails Opened': template.opened,
      'Open Rate': `${template.openRate}%`,
      'Click Rate': `${template.clickRate}%`
    }));

    const templateSheet = XLSX.utils.json_to_sheet(templateData);
    templateSheet['!cols'] = [
      { width: 30 },
      { width: 15 },
      { width: 12 },
      { width: 12 },
      { width: 12 },
      { width: 12 }
    ];
    XLSX.utils.book_append_sheet(workbook, templateSheet, 'Template Performance');
  }

  // Daily email activity sheet (if available)
  if (analyticsData.dailyActivity && analyticsData.dailyActivity.length > 0) {
    const dailyData = analyticsData.dailyActivity.map(day => ({
      'Date': day.date,
      'Emails Sent': day.emails,
      'Emails Opened': day.opened || 0,
      'Emails Clicked': day.clicked || 0,
    }));

    const dailySheet = XLSX.utils.json_to_sheet(dailyData);
    dailySheet['!cols'] = [
      { width: 12 },
      { width: 15 },
      { width: 15 },
      { width: 15 }
    ];
    XLSX.utils.book_append_sheet(workbook, dailySheet, 'Daily Activity');
  }

  // Job performance sheet (if available)
  if (analyticsData.jobPerformance && analyticsData.jobPerformance.length > 0) {
    const jobData = analyticsData.jobPerformance.map(job => ({
      'Job Title': job.title,
      'Department': job.department,
      'Emails Sent': job.emails,
      'Response Rate': `${job.responseRate || 0}%`
    }));

    const jobSheet = XLSX.utils.json_to_sheet(jobData);
    jobSheet['!cols'] = [
      { width: 30 },
      { width: 20 },
      { width: 15 },
      { width: 15 }
    ];
    XLSX.utils.book_append_sheet(workbook, jobSheet, 'Job Performance');
  }

  // Engagement trends sheet (if available)
  if (analyticsData.engagementTrends && analyticsData.engagementTrends.length > 0) {
    const trendsData = analyticsData.engagementTrends.map(trend => ({
      'Period': trend.period,
      'Total Sent': trend.sent,
      'Open Rate': `${trend.openRate}%`,
      'Click Rate': `${trend.clickRate}%`,
      'Response Rate': `${trend.responseRate}%`
    }));

    const trendsSheet = XLSX.utils.json_to_sheet(trendsData);
    trendsSheet['!cols'] = [
      { width: 15 },
      { width: 12 },
      { width: 12 },
      { width: 12 },
      { width: 15 }
    ];
    XLSX.utils.book_append_sheet(workbook, trendsSheet, 'Engagement Trends');
  }

  // Generate filename
  const filename = `email_analytics_${dateStr}_${timeStr}_${timeRange}.xlsx`;

  // Export the file
  XLSX.writeFile(workbook, filename);
};

export const exportEmailAnalyticsToCSV = (analyticsData, timeRange) => {
  // Create a comprehensive CSV with all analytics data
  const csvData = [
    // Header
    [`Email Analytics Export - ${getTimeRangeLabel(timeRange)}`, '', '', '', ''],
    [`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, '', '', '', ''],
    ['', '', '', '', ''],
    
    // Overview metrics
    ['OVERVIEW METRICS', '', '', '', ''],
    ['Metric', 'Value', 'Rate/Percentage', '', ''],
    ['Total Emails Sent', analyticsData.totalSent || 0, '', '', ''],
    ['Successfully Delivered', analyticsData.delivered || 0, `${analyticsData.deliveryRate || 0}%`, '', ''],
    ['Emails Opened', analyticsData.opened || 0, `${analyticsData.openRate || 0}%`, '', ''],
    ['Links Clicked', analyticsData.clicked || 0, `${analyticsData.clickRate || 0}%`, '', ''],
    ['Failed Emails', analyticsData.failed || 0, '', '', ''],
    ['Bounced Emails', analyticsData.bounced || 0, `${analyticsData.bounceRate || 0}%`, '', ''],
    ['', '', '', '', ''],
    
    // Template performance (if available)
    ['TEMPLATE PERFORMANCE', '', '', '', ''],
    ['Template Name', 'Type', 'Emails Sent', 'Open Rate', 'Click Rate'],
    ...(analyticsData.templatePerformance || []).map(template => [
      template.name,
      template.type,
      template.sent,
      `${template.openRate}%`,
      `${template.clickRate}%`
    ]),
    ['', '', '', '', ''],
    
    // Daily activity (if available)
    ['DAILY ACTIVITY', '', '', '', ''],
    ['Date', 'Emails Sent', 'Emails Opened', 'Emails Clicked', ''],
    ...(analyticsData.dailyActivity || []).map(day => [
      day.date,
      day.emails,
      day.opened || 0,
      day.clicked || 0,
      ''
    ]),
    ['', '', '', '', ''],
    
    // Job performance (if available)
    ['JOB PERFORMANCE', '', '', '', ''],
    ['Job Title', 'Department', 'Emails Sent', 'Response Rate', ''],
    ...(analyticsData.jobPerformance || []).map(job => [
      job.title,
      job.department,
      job.emails,
      `${job.responseRate || 0}%`,
      ''
    ]),
    ['', '', '', '', ''],
  ];

  // Convert to CSV
  const worksheet = XLSX.utils.aoa_to_sheet(csvData);
  const csv = XLSX.utils.sheet_to_csv(worksheet);

  // Create and download file
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  const filename = `email_analytics_${dateStr}_${timeStr}_${timeRange}.csv`;

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, filename);
};

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

// Function to trigger client-side export with format choice
export const triggerAnalyticsExport = async (analyticsData, timeRange, format = 'xlsx') => {
  try {
    const params = new URLSearchParams({
      timeRange: timeRange || '30d',
      format: format,
    });

    const response = await fetch(`/api/admin/communication/analytics/export?${params}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to export analytics");
    }

    // Get filename from response headers
    const contentDisposition = response.headers.get("content-disposition");
    const filename = contentDisposition
      ? contentDisposition.split("filename=")[1]?.replace(/"/g, "")
      : `email-analytics-${timeRange}-${new Date().toISOString().slice(0, 10)}.${format}`;

    // Create blob and download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    return true;
  } catch (error) {
    console.error("Error exporting analytics:", error);
    throw error;
  }
};