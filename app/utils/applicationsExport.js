import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export const exportApplicationsToExcel = (applications, filters = {}) => {
  const workbook = XLSX.utils.book_new();
  
  // Get current date for filename
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  
  // Format application data for export
  const applicationData = applications.map(app => ({
    'Name': app.name || 'Anonymous',
    'Email': app.email,
    'Phone': app.phone || 'Not provided',
    'Job Title': app.job?.title || 'Unknown',
    'Department': app.job?.department || 'Unknown',
    'Status': app.status,
    'Applied Date': new Date(app.appliedAt).toLocaleDateString(),
    'Applied Time': new Date(app.appliedAt).toLocaleTimeString(),
    'Cover Letter': app.coverLetter ? 'Yes' : 'No',
    'Resume': app.resumeUrl ? 'Yes' : 'No',
    'Notes': app.notes || ''
  }));

  // Create main applications sheet
  const applicationsSheet = XLSX.utils.json_to_sheet(applicationData);
  
  // Set column widths
  applicationsSheet['!cols'] = [
    { width: 20 }, // Name
    { width: 30 }, // Email
    { width: 15 }, // Phone
    { width: 25 }, // Job Title
    { width: 20 }, // Department
    { width: 12 }, // Status
    { width: 12 }, // Applied Date
    { width: 12 }, // Applied Time
    { width: 12 }, // Cover Letter
    { width: 10 }, // Resume
    { width: 40 }  // Notes
  ];

  XLSX.utils.book_append_sheet(workbook, applicationsSheet, 'Applications');

  // Create summary sheet
  const statusCounts = applications.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {});

  const jobCounts = applications.reduce((acc, app) => {
    const jobTitle = app.job?.title || 'Unknown';
    acc[jobTitle] = (acc[jobTitle] || 0) + 1;
    return acc;
  }, {});

  const summaryData = [
    ['Applications Export Summary', '', ''],
    ['Generated:', `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, ''],
    ['Total Applications:', applications.length, ''],
    ['', '', ''],
    ['FILTERS APPLIED:', '', ''],
    ['Search Term:', filters.searchTerm || 'None', ''],
    ['Status Filter:', filters.statusFilter || 'All', ''],
    ['Job Filter:', filters.jobFilter || 'All', ''],
    ['', '', ''],
    ['STATUS BREAKDOWN:', '', ''],
    ['Status', 'Count', 'Percentage'],
    ...Object.entries(statusCounts).map(([status, count]) => [
      status,
      count,
      `${((count / applications.length) * 100).toFixed(1)}%`
    ]),
    ['', '', ''],
    ['TOP JOBS:', '', ''],
    ['Job Title', 'Applications', 'Percentage'],
    ...Object.entries(jobCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([job, count]) => [
        job,
        count,
        `${((count / applications.length) * 100).toFixed(1)}%`
      ])
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  
  summarySheet['!cols'] = [
    { width: 25 },
    { width: 20 },
    { width: 15 }
  ];

  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Generate filename
  const filterSuffix = filters.statusFilter && filters.statusFilter !== 'all' 
    ? `_${filters.statusFilter.toLowerCase()}`
    : '';
  const filename = `applications_export_${dateStr}_${timeStr}${filterSuffix}.xlsx`;

  // Export the file
  XLSX.writeFile(workbook, filename);
};

export const exportApplicationsToCSV = (applications, filters = {}) => {
  // Format application data for CSV export
  const applicationData = applications.map(app => ({
    'Name': app.name || 'Anonymous',
    'Email': app.email,
    'Phone': app.phone || 'Not provided',
    'Job Title': app.job?.title || 'Unknown',
    'Department': app.job?.department || 'Unknown',
    'Status': app.status,
    'Applied Date': new Date(app.appliedAt).toLocaleDateString(),
    'Applied Time': new Date(app.appliedAt).toLocaleTimeString(),
    'Cover Letter': app.coverLetter ? 'Yes' : 'No',
    'Resume': app.resumeUrl ? 'Yes' : 'No',
    'Notes': app.notes ? app.notes.replace(/[\r\n]+/g, ' ') : '' // Remove line breaks for CSV
  }));

  // Convert to CSV
  const worksheet = XLSX.utils.json_to_sheet(applicationData);
  const csv = XLSX.utils.sheet_to_csv(worksheet);

  // Create and download file
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  const filterSuffix = filters.statusFilter && filters.statusFilter !== 'all' 
    ? `_${filters.statusFilter.toLowerCase()}`
    : '';
  const filename = `applications_export_${dateStr}_${timeStr}${filterSuffix}.csv`;

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, filename);
};