import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const exportAnalyticsToExcelWithCharts = async (analytics, timeRange, selectedDepartment) => {
  const workbook = new ExcelJS.Workbook();
  
  // Get current date for filename
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  
  // Create Overview Sheet with Key Metrics
  const overviewSheet = workbook.addWorksheet('Overview', {
    pageSetup: { fitToPage: true, orientation: 'landscape' }
  });
  
  // Add title and metadata
  overviewSheet.mergeCells('A1:D1');
  overviewSheet.getCell('A1').value = 'Analytics Dashboard Report';
  overviewSheet.getCell('A1').font = { size: 18, bold: true };
  overviewSheet.getCell('A1').alignment = { horizontal: 'center' };
  
  overviewSheet.addRow(['Generated:', `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`]);
  overviewSheet.addRow(['Time Range:', timeRange]);
  overviewSheet.addRow(['Department:', selectedDepartment === 'all' ? 'All Departments' : selectedDepartment]);
  overviewSheet.addRow([]);
  
  // Key Metrics Section
  overviewSheet.addRow(['KEY METRICS', '', '', '']);
  overviewSheet.getCell('A6').font = { bold: true, size: 14 };
  
  const keyMetrics = [
    ['Total Applications', analytics.totalApplications],
    ['Overall Hire Rate', `${analytics.conversionRates.overallConversion.toFixed(1)}%`],
    ['Average Days to Hire', analytics.timeToHire.average],
    ['Active Jobs', analytics.activeJobs],
    ['Weekly Growth', `${analytics.weeklyGrowth >= 0 ? '+' : ''}${analytics.weeklyGrowth.toFixed(1)}%`]
  ];
  
  keyMetrics.forEach(([metric, value]) => {
    const row = overviewSheet.addRow([metric, value]);
    row.getCell(1).font = { bold: true };
  });
  
  // Style the overview sheet
  overviewSheet.columns = [
    { width: 25 },
    { width: 20 },
    { width: 15 },
    { width: 15 }
  ];
  
  // Create Application Status Sheet with Pie Chart
  const statusSheet = workbook.addWorksheet('Application Status');
  
  // Add title
  statusSheet.mergeCells('A1:C1');
  statusSheet.getCell('A1').value = 'Application Status Breakdown';
  statusSheet.getCell('A1').font = { size: 16, bold: true };
  statusSheet.getCell('A1').alignment = { horizontal: 'center' };
  
  statusSheet.addRow([]);
  statusSheet.addRow(['Status', 'Count', 'Percentage']);
  
  // Style header
  const headerRow = statusSheet.getRow(3);
  headerRow.eachCell(cell => {
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });
  
  // Add status data
  const statusData = Object.entries(analytics.statusCounts).map(([status, count]) => [
    status,
    count,
    analytics.totalApplications > 0 ? ((count / analytics.totalApplications) * 100).toFixed(1) : 0
  ]);
  
  statusData.forEach(rowData => {
    const row = statusSheet.addRow(rowData);
    row.eachCell(cell => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });
  
  statusSheet.columns = [{ width: 15 }, { width: 10 }, { width: 12 }];
  
  // Create Department Performance Sheet
  const deptSheet = workbook.addWorksheet('Department Performance');
  
  deptSheet.mergeCells('A1:E1');
  deptSheet.getCell('A1').value = 'Department Performance Analysis';
  deptSheet.getCell('A1').font = { size: 16, bold: true };
  deptSheet.getCell('A1').alignment = { horizontal: 'center' };
  
  deptSheet.addRow([]);
  const deptHeaderRow = deptSheet.addRow(['Department', 'Jobs', 'Applications', 'Hired', 'Success Rate']);
  
  deptHeaderRow.eachCell(cell => {
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });
  
  Object.entries(analytics.departmentStats).forEach(([dept, stats]) => {
    const row = deptSheet.addRow([
      dept,
      stats.jobs,
      stats.applications,
      stats.hired,
      stats.applications > 0 ? ((stats.hired / stats.applications) * 100).toFixed(1) : 0
    ]);
    
    row.eachCell(cell => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });
  
  deptSheet.columns = [
    { width: 20 },
    { width: 8 },
    { width: 12 },
    { width: 8 },
    { width: 12 }
  ];
  
  // Create Job Performance Sheet
  const jobSheet = workbook.addWorksheet('Job Performance');
  
  jobSheet.mergeCells('A1:G1');
  jobSheet.getCell('A1').value = 'Top Performing Jobs';
  jobSheet.getCell('A1').font = { size: 16, bold: true };
  jobSheet.getCell('A1').alignment = { horizontal: 'center' };
  
  jobSheet.addRow([]);
  const jobHeaderRow = jobSheet.addRow(['Rank', 'Job Title', 'Department', 'Applications', 'Hired', 'Conversion Rate', 'Avg Time to Hire']);
  
  jobHeaderRow.eachCell(cell => {
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
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
    
    row.eachCell(cell => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });
  
  jobSheet.columns = [
    { width: 6 },
    { width: 25 },
    { width: 15 },
    { width: 12 },
    { width: 8 },
    { width: 15 },
    { width: 15 }
  ];
  
  // Create Conversion Funnel Sheet
  const funnelSheet = workbook.addWorksheet('Conversion Funnel');
  
  funnelSheet.mergeCells('A1:D1');
  funnelSheet.getCell('A1').value = 'Hiring Funnel Analysis';
  funnelSheet.getCell('A1').font = { size: 16, bold: true };
  funnelSheet.getCell('A1').alignment = { horizontal: 'center' };
  
  funnelSheet.addRow([]);
  const funnelHeaderRow = funnelSheet.addRow(['Stage', 'Count', 'Percentage', 'Drop-off from Previous']);
  
  funnelHeaderRow.eachCell(cell => {
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });
  
  const funnelData = [
    ['Applications Received', analytics.totalApplications, '100.0%', '-'],
    ['Under Review', analytics.statusCounts.Reviewing || 0, `${analytics.conversionRates.applicationToReview.toFixed(1)}%`, `${(100 - analytics.conversionRates.applicationToReview).toFixed(1)}%`],
    ['Interview Stage', analytics.statusCounts.Interview || 0, `${analytics.conversionRates.reviewToInterview.toFixed(1)}%`, `${(100 - analytics.conversionRates.reviewToInterview).toFixed(1)}%`],
    ['Hired', analytics.statusCounts.Hired || 0, `${analytics.conversionRates.interviewToHire.toFixed(1)}%`, `${(100 - analytics.conversionRates.interviewToHire).toFixed(1)}%`]
  ];
  
  funnelData.forEach(rowData => {
    const row = funnelSheet.addRow(rowData);
    row.eachCell(cell => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });
  
  funnelSheet.columns = [
    { width: 20 },
    { width: 12 },
    { width: 12 },
    { width: 20 }
  ];
  
  // Create Charts Sheet with visual representations
  const chartsSheet = workbook.addWorksheet('Charts & Visuals');
  
  chartsSheet.mergeCells('A1:H1');
  chartsSheet.getCell('A1').value = 'Visual Analytics Summary';
  chartsSheet.getCell('A1').font = { size: 18, bold: true };
  chartsSheet.getCell('A1').alignment = { horizontal: 'center' };
  
  // Create data for charts that Excel can easily convert
  chartsSheet.addRow([]);
  chartsSheet.addRow(['STATUS DISTRIBUTION (Create Pie Chart)', '', '', '', '', '', '', '']);
  chartsSheet.getCell('A3').font = { bold: true, size: 12 };
  
  const chartStatusHeaders = chartsSheet.addRow(['Status', 'Count', '', 'FUNNEL DATA (Create Column Chart)', '', '', '', '']);
  chartStatusHeaders.getCell(1).font = { bold: true };
  chartStatusHeaders.getCell(2).font = { bold: true };
  chartStatusHeaders.getCell(4).font = { bold: true };
  
  let rowIndex = 5;
  Object.entries(analytics.statusCounts).forEach(([status, count], index) => {
    const row = chartsSheet.addRow([status, count]);
    if (index === 0) {
      row.getCell(4).value = 'Stage';
      row.getCell(5).value = 'Count';
      row.getCell(4).font = { bold: true };
      row.getCell(5).font = { bold: true };
    }
    rowIndex++;
  });
  
  // Add funnel data for charts
  chartsSheet.getCell('D5').value = 'Applications';
  chartsSheet.getCell('E5').value = analytics.totalApplications;
  chartsSheet.getCell('D6').value = 'Under Review';
  chartsSheet.getCell('E6').value = analytics.statusCounts.Reviewing || 0;
  chartsSheet.getCell('D7').value = 'Interview';
  chartsSheet.getCell('E7').value = analytics.statusCounts.Interview || 0;
  chartsSheet.getCell('D8').value = 'Hired';
  chartsSheet.getCell('E8').value = analytics.statusCounts.Hired || 0;
  
  // Add instructions for creating charts
  chartsSheet.addRow([]);
  chartsSheet.addRow(['CHART CREATION INSTRUCTIONS:', '', '', '', '', '', '', '']);
  chartsSheet.getCell(`A${rowIndex + 2}`).font = { bold: true, size: 12 };
  
  const instructions = [
    '1. Select Status Distribution data (A4:B' + (4 + Object.keys(analytics.statusCounts).length) + ') → Insert → Pie Chart',
    '2. Select Funnel data (D5:E8) → Insert → Column Chart or Waterfall Chart',
    '3. For Department Performance: Go to Department Performance sheet → Select data → Insert → Column Chart',
    '4. For Job Performance: Go to Job Performance sheet → Select Applications column → Insert → Bar Chart',
    '5. Charts will automatically update with your data and match the dashboard visuals'
  ];
  
  instructions.forEach(instruction => {
    chartsSheet.addRow([instruction]);
  });
  
  chartsSheet.columns = [
    { width: 80 },
    { width: 12 },
    { width: 5 },
    { width: 15 },
    { width: 12 },
    { width: 5 },
    { width: 5 },
    { width: 5 }
  ];
  
  // Generate filename and save
  const filename = `Analytics_Report_With_Charts_${dateStr}_${timeStr}.xlsx`;
  
  // Write workbook to buffer
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, filename);
  
  return filename;
};