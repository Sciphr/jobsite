import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const exportAnalyticsWithEmbeddedCharts = async (analytics, timeRange, selectedDepartment) => {
  const workbook = new ExcelJS.Workbook();
  
  // Get current date for filename
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  
  // Create Overview Dashboard Sheet
  const dashboardSheet = workbook.addWorksheet('Analytics Dashboard', {
    pageSetup: { fitToPage: true, orientation: 'landscape' }
  });
  
  // Add title
  dashboardSheet.mergeCells('A1:H1');
  dashboardSheet.getCell('A1').value = 'Analytics Dashboard Report';
  dashboardSheet.getCell('A1').font = { size: 20, bold: true, color: { argb: 'FF2563EB' } };
  dashboardSheet.getCell('A1').alignment = { horizontal: 'center' };
  dashboardSheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
  
  // Add metadata
  dashboardSheet.addRow([]);
  dashboardSheet.addRow(['Generated:', `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, '', 'Time Range:', timeRange, '', 'Department:', selectedDepartment === 'all' ? 'All Departments' : selectedDepartment]);
  dashboardSheet.addRow([]);
  
  // Key Metrics Section
  dashboardSheet.addRow(['KEY METRICS', '', '', '', '', '', '', '']);
  const metricsHeaderRow = dashboardSheet.getRow(5);
  metricsHeaderRow.getCell(1).font = { bold: true, size: 16, color: { argb: 'FF1F2937' } };
  metricsHeaderRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEF4444' } };
  
  // Create metrics in a grid layout
  const metricsData = [
    ['Total Applications', analytics.totalApplications, 'Overall Hire Rate', `${analytics.conversionRates.overallConversion.toFixed(1)}%`],
    ['Active Jobs', analytics.activeJobs, 'Avg Days to Hire', analytics.timeToHire.average],
    ['Weekly Growth', `${analytics.weeklyGrowth >= 0 ? '+' : ''}${analytics.weeklyGrowth.toFixed(1)}%`, 'Interview Success Rate', `${analytics.conversionRates.interviewToHire.toFixed(1)}%`]
  ];
  
  metricsData.forEach(rowData => {
    const row = dashboardSheet.addRow(rowData);
    row.getCell(1).font = { bold: true };
    row.getCell(3).font = { bold: true };
    row.getCell(2).font = { size: 14, color: { argb: 'FF059669' } };
    row.getCell(4).font = { size: 14, color: { argb: 'FF059669' } };
  });
  
  dashboardSheet.addRow([]);
  
  // Create Status Distribution Data and Chart
  dashboardSheet.addRow(['APPLICATION STATUS DISTRIBUTION', '', '', '', '', '', '', '']);
  const statusHeaderRow = dashboardSheet.getRow(10);
  statusHeaderRow.getCell(1).font = { bold: true, size: 14 };
  statusHeaderRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
  
  dashboardSheet.addRow(['Status', 'Count', 'Percentage', '', '', '', '', '']);
  const statusSubHeaderRow = dashboardSheet.getRow(11);
  statusSubHeaderRow.getCell(1).font = { bold: true };
  statusSubHeaderRow.getCell(2).font = { bold: true };
  statusSubHeaderRow.getCell(3).font = { bold: true };
  
  const statusStartRow = 12;
  const statusData = Object.entries(analytics.statusCounts);
  
  statusData.forEach(([status, count], index) => {
    const percentage = analytics.totalApplications > 0 ? ((count / analytics.totalApplications) * 100).toFixed(1) : 0;
    const row = dashboardSheet.addRow([status, count, `${percentage}%`]);
    
    // Color code the status
    const statusColors = {
      'Applied': 'FF3B82F6',
      'Reviewing': 'FFEAB308', 
      'Interview': 'FF10B981',
      'Hired': 'FF059669',
      'Rejected': 'FFEF4444'
    };
    
    row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusColors[status] || 'FFE5E7EB' } };
    row.getCell(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };
  });
  
  const statusEndRow = statusStartRow + statusData.length - 1;
  
  // Add pie chart for status distribution
  try {
    const statusChart = dashboardSheet.addChart('pie', {
      title: { name: 'Application Status Distribution' },
      position: { x: 250, y: 200, width: 400, height: 300 }
    });
    
    statusChart.addSeries({
      name: 'Status Distribution',
      categories: [`A${statusStartRow}:A${statusEndRow}`],
      values: [`B${statusStartRow}:B${statusEndRow}`],
      dataLabels: { showValue: true, showPercent: true }
    });
  } catch (error) {
    console.log('Chart creation not supported in this environment, data tables provided instead');
  }
  
  // Move to next section
  dashboardSheet.addRow([]);
  dashboardSheet.addRow([]);
  
  // Conversion Funnel Section
  const funnelStartRow = statusEndRow + 3;
  dashboardSheet.addRow(['HIRING FUNNEL ANALYSIS', '', '', '', '', '', '', '']);
  const funnelHeaderRow = dashboardSheet.getRow(funnelStartRow);
  funnelHeaderRow.getCell(1).font = { bold: true, size: 14 };
  funnelHeaderRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
  
  dashboardSheet.addRow(['Stage', 'Count', 'Conversion %', 'Drop-off %', '', '', '', '']);
  const funnelSubHeaderRow = dashboardSheet.getRow(funnelStartRow + 1);
  funnelSubHeaderRow.eachCell((cell, colNumber) => {
    if (colNumber <= 4) {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
    }
  });
  
  const funnelData = [
    ['Applications Received', analytics.totalApplications, '100.0%', '-'],
    ['Under Review', analytics.statusCounts.Reviewing || 0, `${analytics.conversionRates.applicationToReview.toFixed(1)}%`, `${(100 - analytics.conversionRates.applicationToReview).toFixed(1)}%`],
    ['Interview Stage', analytics.statusCounts.Interview || 0, `${analytics.conversionRates.reviewToInterview.toFixed(1)}%`, `${(100 - analytics.conversionRates.reviewToInterview).toFixed(1)}%`],
    ['Hired', analytics.statusCounts.Hired || 0, `${analytics.conversionRates.interviewToHire.toFixed(1)}%`, `${(100 - analytics.conversionRates.interviewToHire).toFixed(1)}%`]
  ];
  
  const funnelDataStartRow = funnelStartRow + 2;
  funnelData.forEach((rowData, index) => {
    const row = dashboardSheet.addRow(rowData);
    
    // Gradient colors for funnel
    const funnelColors = ['FF3B82F6', 'FFEAB308', 'FF10B981', 'FF059669'];
    row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: funnelColors[index] } };
    row.getCell(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };
    
    // Highlight the count
    row.getCell(2).font = { bold: true, size: 12 };
  });
  
  const funnelDataEndRow = funnelDataStartRow + funnelData.length - 1;
  
  // Add column chart for funnel
  try {
    const funnelChart = dashboardSheet.addChart('column', {
      title: { name: 'Hiring Funnel' },
      position: { x: 250, y: 550, width: 400, height: 300 }
    });
    
    funnelChart.addSeries({
      name: 'Applications',
      categories: [`A${funnelDataStartRow}:A${funnelDataEndRow}`],
      values: [`B${funnelDataStartRow}:B${funnelDataEndRow}`]
    });
  } catch (error) {
    console.log('Chart creation not supported in this environment, data tables provided instead');
  }
  
  // Department Performance Sheet
  const deptSheet = workbook.addWorksheet('Department Performance');
  
  deptSheet.mergeCells('A1:F1');
  deptSheet.getCell('A1').value = 'Department Performance Analysis';
  deptSheet.getCell('A1').font = { size: 18, bold: true };
  deptSheet.getCell('A1').alignment = { horizontal: 'center' };
  deptSheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
  
  deptSheet.addRow([]);
  const deptHeaderRow = deptSheet.addRow(['Department', 'Jobs', 'Applications', 'Hired', 'Success Rate', '']);
  
  deptHeaderRow.eachCell((cell, colNumber) => {
    if (colNumber <= 5) {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
  });
  
  const deptDataStartRow = 4;
  const deptEntries = Object.entries(analytics.departmentStats);
  
  deptEntries.forEach(([dept, stats], index) => {
    const successRate = stats.applications > 0 ? ((stats.hired / stats.applications) * 100).toFixed(1) : 0;
    const row = deptSheet.addRow([dept, stats.jobs, stats.applications, stats.hired, `${successRate}%`]);
    
    // Alternate row colors
    const bgColor = index % 2 === 0 ? 'FFF9FAFB' : 'FFFFFFFF';
    row.eachCell((cell, colNumber) => {
      if (colNumber <= 5) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      }
    });
    
    // Highlight high success rates
    if (parseFloat(successRate) > 50) {
      row.getCell(5).font = { bold: true, color: { argb: 'FF059669' } };
    }
  });
  
  const deptDataEndRow = deptDataStartRow + deptEntries.length - 1;
  
  // Add chart for department performance
  try {
    const deptChart = deptSheet.addChart('column', {
      title: { name: 'Department Applications & Success Rate' },
      position: { x: 100, y: 300, width: 500, height: 350 }
    });
    
    deptChart.addSeries({
      name: 'Applications',
      categories: [`A${deptDataStartRow}:A${deptDataEndRow}`],
      values: [`C${deptDataStartRow}:C${deptDataEndRow}`]
    });
    
    deptChart.addSeries({
      name: 'Hired',
      categories: [`A${deptDataStartRow}:A${deptDataEndRow}`],
      values: [`D${deptDataStartRow}:D${deptDataEndRow}`]
    });
  } catch (error) {
    console.log('Chart creation not supported in this environment, data tables provided instead');
  }
  
  // Job Performance Sheet
  const jobSheet = workbook.addWorksheet('Job Performance');
  
  jobSheet.mergeCells('A1:G1');
  jobSheet.getCell('A1').value = 'Top Performing Jobs';
  jobSheet.getCell('A1').font = { size: 18, bold: true };
  jobSheet.getCell('A1').alignment = { horizontal: 'center' };
  jobSheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
  
  jobSheet.addRow([]);
  const jobHeaderRow = jobSheet.addRow(['Rank', 'Job Title', 'Department', 'Applications', 'Hired', 'Conversion Rate', 'Avg Time']);
  
  jobHeaderRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });
  
  analytics.jobPerformance.forEach((job, index) => {
    const row = jobSheet.addRow([
      index + 1,
      job.title,
      job.department,
      job.applicationsCount,
      job.hiredCount,
      `${job.conversionRate.toFixed(1)}%`,
      `${job.avgTimeToHire} days`
    ]);
    
    // Color code by rank
    const rankColors = ['FFFEF3C7', 'FFE0E7FF', 'FFECFCCB', 'FFF3F4F6', 'FFF9FAFB'];
    const bgColor = rankColors[Math.min(index, 4)];
    
    row.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    
    // Highlight rank 1
    if (index === 0) {
      row.getCell(1).font = { bold: true, color: { argb: 'FFDC2626' } };
    }
  });
  
  // Set column widths for better display
  dashboardSheet.columns = [
    { width: 25 }, { width: 15 }, { width: 15 }, { width: 20 },
    { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }
  ];
  
  deptSheet.columns = [
    { width: 20 }, { width: 8 }, { width: 12 }, { width: 8 }, { width: 15 }, { width: 5 }
  ];
  
  jobSheet.columns = [
    { width: 6 }, { width: 25 }, { width: 15 }, { width: 12 },
    { width: 8 }, { width: 15 }, { width: 12 }
  ];
  
  // Generate filename and save
  const filename = `Analytics_Dashboard_${dateStr}_${timeStr}.xlsx`;
  
  // Write workbook to buffer
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, filename);
  
  return filename;
};