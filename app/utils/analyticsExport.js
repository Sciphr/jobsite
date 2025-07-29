import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export const exportAnalyticsToExcel = (analytics, timeRange) => {
  const workbook = XLSX.utils.book_new();
  
  // Get current date for filename
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  
  // Overview metrics sheet
  const overviewData = [
    ['Analytics Overview', '', ''],
    ['Generated:', `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, ''],
    ['Time Range:', getTimeRangeLabel(timeRange), ''],
    ['', '', ''],
    ['CORE METRICS:', '', ''],
    ['Total Jobs:', analytics.overview.totalJobs, ''],
    ['Total Applications:', analytics.overview.totalApplications, ''],
    ['Total Users:', analytics.overview.totalUsers, ''],
    ['Total Job Views:', analytics.overview.totalViews, ''],
    ['Active Jobs:', analytics.overview.activeJobs, ''],
    ['Expired Jobs:', analytics.overview.expiredJobs, ''],
    ['Featured Jobs:', analytics.overview.featuredJobs, ''],
    ['', '', ''],
    ['ENGAGEMENT METRICS:', '', ''],
    ['Total Emails Sent:', analytics.overview.totalEmails, ''],
    ['Total Interviews:', analytics.overview.totalInterviews, ''],
    ['Saved Jobs:', analytics.overview.totalSavedJobs, ''],
    ['Resumes Uploaded:', analytics.overview.totalResumes, ''],
    ['Email Campaigns:', analytics.overview.emailCampaigns, ''],
    ['', '', ''],
    ['PERFORMANCE METRICS:', '', ''],
    ['Avg Time to Hire (days):', analytics.additionalMetrics.avgTimeToHire, ''],
    ['Success Rate:', `${analytics.additionalMetrics.successRate}%`, ''],
    ['Avg Applications per Job:', analytics.additionalMetrics.avgApplicationsPerJob, ''],
    ['Interview Rate:', `${analytics.additionalMetrics.interviewRate}%`, ''],
    ['Save Rate:', `${analytics.additionalMetrics.saveRate}%`, ''],
    ['', '', ''],
    ['PERIOD CHANGES:', '', ''],
    ['Jobs Change:', `${analytics.overview.jobsChange > 0 ? '+' : ''}${analytics.overview.jobsChange.toFixed(2)}%`, ''],
    ['Applications Change:', `${analytics.overview.applicationsChange > 0 ? '+' : ''}${analytics.overview.applicationsChange.toFixed(2)}%`, ''],
    ['Users Change:', `${analytics.overview.usersChange > 0 ? '+' : ''}${analytics.overview.usersChange.toFixed(2)}%`, ''],
  ];

  const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
  overviewSheet['!cols'] = [
    { width: 25 },
    { width: 20 },
    { width: 15 }
  ];
  XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Overview');

  // Daily data sheet
  const dailyData = analytics.applicationsByDay.map(day => ({
    'Date': day.date,
    'Applications': day.applications,
    'Jobs Posted': day.jobs,
    'New Users': day.users,
  }));

  const dailySheet = XLSX.utils.json_to_sheet(dailyData);
  dailySheet['!cols'] = [
    { width: 12 },
    { width: 15 },
    { width: 15 },
    { width: 15 }
  ];
  XLSX.utils.book_append_sheet(workbook, dailySheet, 'Daily Activity');

  // Jobs by department sheet
  const departmentData = analytics.jobsByDepartment.map(dept => ({
    'Department': dept.name,
    'Job Count': dept.value,
    'Percentage': `${((dept.value / analytics.overview.totalJobs) * 100).toFixed(2)}%`
  }));

  const departmentSheet = XLSX.utils.json_to_sheet(departmentData);
  departmentSheet['!cols'] = [
    { width: 20 },
    { width: 12 },
    { width: 15 }
  ];
  XLSX.utils.book_append_sheet(workbook, departmentSheet, 'Jobs by Department');

  // Application status sheet
  const statusData = analytics.applicationStatus.map(status => ({
    'Status': status.name,
    'Count': status.value,
    'Percentage': `${((status.value / analytics.overview.totalApplications) * 100).toFixed(2)}%`
  }));

  const statusSheet = XLSX.utils.json_to_sheet(statusData);
  statusSheet['!cols'] = [
    { width: 15 },
    { width: 12 },
    { width: 15 }
  ];
  XLSX.utils.book_append_sheet(workbook, statusSheet, 'Application Status');

  // Top performing jobs sheet
  const topJobsData = analytics.topJobs.map((job, index) => ({
    'Rank': index + 1,
    'Job Title': job.title,
    'Applications': job.applications,
    'Views': job.views,
    'Conversion Rate': `${job.conversionRate}%`
  }));

  const topJobsSheet = XLSX.utils.json_to_sheet(topJobsData);
  topJobsSheet['!cols'] = [
    { width: 8 },
    { width: 30 },
    { width: 15 },
    { width: 12 },
    { width: 18 }
  ];
  XLSX.utils.book_append_sheet(workbook, topJobsSheet, 'Top Performing Jobs');

  // Conversion funnel sheet
  const funnelData = analytics.conversionFunnel.map(stage => ({
    'Stage': stage.stage,
    'Count': stage.count,
    'Percentage': `${stage.percentage.toFixed(2)}%`
  }));

  const funnelSheet = XLSX.utils.json_to_sheet(funnelData);
  funnelSheet['!cols'] = [
    { width: 25 },
    { width: 15 },
    { width: 15 }
  ];
  XLSX.utils.book_append_sheet(workbook, funnelSheet, 'Conversion Funnel');

  // Generate filename
  const filename = `analytics_export_${dateStr}_${timeStr}_${timeRange}.xlsx`;

  // Export the file
  XLSX.writeFile(workbook, filename);
};

export const exportAnalyticsToCSV = (analytics, timeRange) => {
  // Create a comprehensive CSV with all analytics data
  const csvData = [
    // Header
    [`Analytics Export - ${getTimeRangeLabel(timeRange)}`, '', '', '', ''],
    [`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, '', '', '', ''],
    ['', '', '', '', ''],
    
    // Overview metrics
    ['OVERVIEW METRICS', '', '', '', ''],
    ['Metric', 'Value', 'Change', '', ''],
    ['Total Jobs', analytics.overview.totalJobs, `${analytics.overview.jobsChange > 0 ? '+' : ''}${analytics.overview.jobsChange.toFixed(2)}%`, '', ''],
    ['Total Applications', analytics.overview.totalApplications, `${analytics.overview.applicationsChange > 0 ? '+' : ''}${analytics.overview.applicationsChange.toFixed(2)}%`, '', ''],
    ['Total Users', analytics.overview.totalUsers, `${analytics.overview.usersChange > 0 ? '+' : ''}${analytics.overview.usersChange.toFixed(2)}%`, '', ''],
    ['Total Views', analytics.overview.totalViews, `${analytics.overview.viewsChange > 0 ? '+' : ''}${analytics.overview.viewsChange.toFixed(2)}%`, '', ''],
    ['Active Jobs', analytics.overview.activeJobs, '', '', ''],
    ['Featured Jobs', analytics.overview.featuredJobs, '', '', ''],
    ['Total Emails', analytics.overview.totalEmails, '', '', ''],
    ['Total Interviews', analytics.overview.totalInterviews, '', '', ''],
    ['', '', '', '', ''],
    
    // Performance metrics
    ['PERFORMANCE METRICS', '', '', '', ''],
    ['Avg Time to Hire (days)', analytics.additionalMetrics.avgTimeToHire, '', '', ''],
    ['Success Rate', `${analytics.additionalMetrics.successRate}%`, '', '', ''],
    ['Avg Applications per Job', analytics.additionalMetrics.avgApplicationsPerJob, '', '', ''],
    ['Interview Rate', `${analytics.additionalMetrics.interviewRate}%`, '', '', ''],
    ['Save Rate', `${analytics.additionalMetrics.saveRate}%`, '', '', ''],
    ['', '', '', '', ''],
    
    // Daily activity
    ['DAILY ACTIVITY', '', '', '', ''],
    ['Date', 'Applications', 'Jobs Posted', 'New Users', ''],
    ...analytics.applicationsByDay.map(day => [
      day.date,
      day.applications,
      day.jobs,
      day.users,
      ''
    ]),
    ['', '', '', '', ''],
    
    // Department breakdown
    ['JOBS BY DEPARTMENT', '', '', '', ''],
    ['Department', 'Count', 'Percentage', '', ''],
    ...analytics.jobsByDepartment.map(dept => [
      dept.name,
      dept.value,
      `${((dept.value / analytics.overview.totalJobs) * 100).toFixed(2)}%`,
      '',
      ''
    ]),
    ['', '', '', '', ''],
    
    // Application status
    ['APPLICATION STATUS', '', '', '', ''],
    ['Status', 'Count', 'Percentage', '', ''],
    ...analytics.applicationStatus.map(status => [
      status.name,
      status.value,
      `${((status.value / analytics.overview.totalApplications) * 100).toFixed(2)}%`,
      '',
      ''
    ]),
    ['', '', '', '', ''],
    
    // Top jobs
    ['TOP PERFORMING JOBS', '', '', '', ''],
    ['Job Title', 'Applications', 'Views', 'Conversion Rate', ''],
    ...analytics.topJobs.map(job => [
      job.title,
      job.applications,
      job.views,
      `${job.conversionRate}%`,
      ''
    ]),
    ['', '', '', '', ''],
    
    // Conversion funnel
    ['CONVERSION FUNNEL', '', '', '', ''],
    ['Stage', 'Count', 'Percentage', '', ''],
    ...analytics.conversionFunnel.map(stage => [
      stage.stage,
      stage.count,
      `${stage.percentage.toFixed(2)}%`,
      '',
      ''
    ]),
  ];

  // Convert to CSV
  const worksheet = XLSX.utils.aoa_to_sheet(csvData);
  const csv = XLSX.utils.sheet_to_csv(worksheet);

  // Create and download file
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  const filename = `analytics_export_${dateStr}_${timeStr}_${timeRange}.csv`;

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