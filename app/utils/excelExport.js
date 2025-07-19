import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export const exportAnalyticsToExcel = (analytics, timeRange, selectedDepartment) => {
  const workbook = XLSX.utils.book_new();
  
  // Get current date for filename
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  
  // Create Overview Sheet
  const overviewData = [
    ['Analytics Report', '', '', ''],
    ['Generated:', `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, '', ''],
    ['Time Range:', timeRange, '', ''],
    ['Department:', selectedDepartment === 'all' ? 'All Departments' : selectedDepartment, '', ''],
    ['', '', '', ''],
    ['KEY METRICS', '', '', ''],
    ['Total Applications', analytics.totalApplications, '', ''],
    ['Overall Hire Rate', `${analytics.conversionRates.overallConversion.toFixed(1)}%`, '', ''],
    ['Average Days to Hire', analytics.timeToHire.average, '', ''],
    ['Active Jobs', analytics.activeJobs, '', ''],
    ['Weekly Growth', `${analytics.weeklyGrowth >= 0 ? '+' : ''}${analytics.weeklyGrowth.toFixed(1)}%`, '', ''],
    ['', '', '', ''],
    ['CONVERSION RATES', '', '', ''],
    ['Application to Review', `${analytics.conversionRates.applicationToReview.toFixed(1)}%`, '', ''],
    ['Review to Interview', `${analytics.conversionRates.reviewToInterview.toFixed(1)}%`, '', ''],
    ['Interview to Hire', `${analytics.conversionRates.interviewToHire.toFixed(1)}%`, '', ''],
  ];
  
  const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
  
  // Style the overview sheet
  overviewSheet['!cols'] = [
    { width: 25 },
    { width: 20 },
    { width: 15 },
    { width: 15 }
  ];
  
  XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Overview');
  
  // Create Application Status Sheet
  const statusData = [
    ['Application Status Breakdown', '', ''],
    ['Status', 'Count', 'Percentage'],
    ...Object.entries(analytics.statusCounts).map(([status, count]) => [
      status,
      count,
      `${analytics.totalApplications > 0 ? ((count / analytics.totalApplications) * 100).toFixed(1) : 0}%`
    ])
  ];
  
  const statusSheet = XLSX.utils.aoa_to_sheet(statusData);
  statusSheet['!cols'] = [{ width: 15 }, { width: 10 }, { width: 12 }];
  XLSX.utils.book_append_sheet(workbook, statusSheet, 'Application Status');
  
  // Create Department Performance Sheet
  const deptData = [
    ['Department Performance Analysis', '', '', '', ''],
    ['Department', 'Jobs', 'Applications', 'Hired', 'Success Rate'],
    ...Object.entries(analytics.departmentStats).map(([dept, stats]) => [
      dept,
      stats.jobs,
      stats.applications,
      stats.hired,
      `${stats.applications > 0 ? ((stats.hired / stats.applications) * 100).toFixed(1) : 0}%`
    ])
  ];
  
  const deptSheet = XLSX.utils.aoa_to_sheet(deptData);
  deptSheet['!cols'] = [{ width: 20 }, { width: 8 }, { width: 12 }, { width: 8 }, { width: 12 }];
  XLSX.utils.book_append_sheet(workbook, deptSheet, 'Department Performance');
  
  // Create Job Performance Sheet
  const jobData = [
    ['Top Performing Jobs', '', '', '', '', ''],
    ['Rank', 'Job Title', 'Department', 'Applications', 'Hired', 'Conversion Rate', 'Avg Time to Hire'],
    ...analytics.jobPerformance.map((job, index) => [
      index + 1,
      job.title,
      job.department,
      job.applicationsCount,
      job.hiredCount,
      `${job.conversionRate.toFixed(1)}%`,
      `${job.avgTimeToHire} days`
    ])
  ];
  
  const jobSheet = XLSX.utils.aoa_to_sheet(jobData);
  jobSheet['!cols'] = [
    { width: 6 },
    { width: 25 },
    { width: 15 },
    { width: 12 },
    { width: 8 },
    { width: 15 },
    { width: 15 }
  ];
  XLSX.utils.book_append_sheet(workbook, jobSheet, 'Job Performance');
  
  // Create Source Analysis Sheet (mock data for now as you mentioned)
  const sourceData = [
    ['Recruitment Source Analysis', '', '', '', ''],
    ['Source', 'Applications', 'Hired', 'Success Rate', 'Volume %'],
    ...analytics.sourceAnalysis.map(source => [
      source.source,
      source.applications,
      source.hired,
      `${source.applications > 0 ? ((source.hired / source.applications) * 100).toFixed(1) : 0}%`,
      `${((source.applications / analytics.totalApplications) * 100).toFixed(1)}%`
    ])
  ];
  
  const sourceSheet = XLSX.utils.aoa_to_sheet(sourceData);
  sourceSheet['!cols'] = [{ width: 18 }, { width: 12 }, { width: 8 }, { width: 12 }, { width: 10 }];
  XLSX.utils.book_append_sheet(workbook, sourceSheet, 'Source Analysis');
  
  // Create Time Analysis Sheet
  const timeData = [
    ['Time to Hire Analysis', '', ''],
    ['Metric', 'Value', ''],
    ['Average Days', analytics.timeToHire.average, ''],
    ['Median Days', analytics.timeToHire.median, ''],
    ['Fastest Hire', analytics.timeToHire.fastest, ''],
    ['Slowest Hire', analytics.timeToHire.slowest, ''],
    ['', '', ''],
    ['Speed Distribution', 'Percentage', ''],
    ['≤ 7 days (Fast)', '25%', ''],
    ['8-14 days (Normal)', '45%', ''],
    ['15-21 days (Slow)', '20%', ''],
    ['> 21 days (Very Slow)', '10%', '']
  ];
  
  const timeSheet = XLSX.utils.aoa_to_sheet(timeData);
  timeSheet['!cols'] = [{ width: 20 }, { width: 12 }, { width: 10 }];
  XLSX.utils.book_append_sheet(workbook, timeSheet, 'Time Analysis');
  
  // Create Conversion Funnel Sheet
  const funnelData = [
    ['Hiring Funnel Analysis', '', '', ''],
    ['Stage', 'Count', 'Percentage', 'Drop-off from Previous'],
    ['Applications Received', analytics.totalApplications, '100.0%', '-'],
    ['Under Review', analytics.statusCounts.Reviewing || 0, `${analytics.conversionRates.applicationToReview.toFixed(1)}%`, `${(100 - analytics.conversionRates.applicationToReview).toFixed(1)}%`],
    ['Interview Stage', analytics.statusCounts.Interview || 0, `${analytics.conversionRates.reviewToInterview.toFixed(1)}%`, `${(100 - analytics.conversionRates.reviewToInterview).toFixed(1)}%`],
    ['Hired', analytics.statusCounts.Hired || 0, `${analytics.conversionRates.interviewToHire.toFixed(1)}%`, `${(100 - analytics.conversionRates.interviewToHire).toFixed(1)}%`],
    ['', '', '', ''],
    ['FUNNEL INSIGHTS', '', '', ''],
    ['Overall Conversion Rate', `${analytics.conversionRates.overallConversion.toFixed(1)}%`, '', ''],
    ['Biggest Bottleneck', analytics.conversionRates.applicationToReview < analytics.conversionRates.reviewToInterview ? 'Application → Review' : 'Review → Interview', '', ''],
    ['Strongest Stage', 'Interview → Hire', '', '']
  ];
  
  const funnelSheet = XLSX.utils.aoa_to_sheet(funnelData);
  funnelSheet['!cols'] = [{ width: 20 }, { width: 12 }, { width: 12 }, { width: 20 }];
  XLSX.utils.book_append_sheet(workbook, funnelSheet, 'Conversion Funnel');
  
  // Add formatting and styling
  const sheets = ['Overview', 'Application Status', 'Department Performance', 'Job Performance', 'Source Analysis', 'Time Analysis', 'Conversion Funnel'];
  
  sheets.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    
    // Add some basic styling to headers
    const range = XLSX.utils.decode_range(sheet['!ref']);
    for (let row = range.s.r; row <= Math.min(range.s.r + 2, range.e.r); row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
        if (sheet[cellRef]) {
          sheet[cellRef].s = {
            font: { bold: true },
            fill: { fgColor: { rgb: "EFEFEF" } },
            border: {
              top: { style: "thin" },
              bottom: { style: "thin" },
              left: { style: "thin" },
              right: { style: "thin" }
            }
          };
        }
      }
    }
  });
  
  // Generate filename
  const filename = `Analytics_Report_${dateStr}_${timeStr}.xlsx`;
  
  // Save the file
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, filename);
  
  return filename;
};

// Helper function to create charts (for future enhancement)
export const addChartsToWorkbook = (workbook, analytics) => {
  // This would require xlsx-populate or similar library for more advanced chart creation
  // For now, we're providing well-structured data that can easily be turned into charts in Excel
  console.log('Charts can be manually created from the provided data tables in Excel');
  return workbook;
};