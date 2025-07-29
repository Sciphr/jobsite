import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export const exportJobsToExcel = (jobs, filters = {}, categories = []) => {
  const workbook = XLSX.utils.book_new();
  
  // Get current date for filename
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  
  // Format job data for export
  const jobData = jobs.map(job => {
    // Find category name
    const category = categories.find(cat => cat.id === job.categoryId);
    
    return {
      'Title': job.title,
      'Department': job.department,
      'Location': job.location,
      'Status': job.status,
      'Employment Type': job.employmentType,
      'Experience Level': job.experienceLevel,
      'Category': category?.name || 'Uncategorized',
      'Featured': job.featured ? 'Yes' : 'No',
      'Salary Min': job.salaryMin || 'Not specified',
      'Salary Max': job.salaryMax || 'Not specified',
      'Salary Currency': job.salaryCurrency || 'USD',
      'Show Salary': job.showSalary ? 'Yes' : 'No',
      'Applications': job.applicationCount || 0,
      'Application Deadline': job.applicationDeadline ? new Date(job.applicationDeadline).toLocaleDateString() : 'No deadline',
      'Created Date': new Date(job.createdAt).toLocaleDateString(),
      'Created Time': new Date(job.createdAt).toLocaleTimeString(),
      'Last Updated': job.updatedAt ? new Date(job.updatedAt).toLocaleDateString() : 'N/A',
      'Slug': job.slug,
      'Remote Work': job.remoteWork || 'Not specified',
      'Benefits': job.benefits || 'Not specified',
      'Requirements Summary': job.requirements ? job.requirements.substring(0, 200) + '...' : 'Not specified',
      'Description Summary': job.description ? job.description.substring(0, 200) + '...' : 'Not specified'
    };
  });

  // Create main jobs sheet
  const jobsSheet = XLSX.utils.json_to_sheet(jobData);
  
  // Set column widths
  jobsSheet['!cols'] = [
    { width: 30 }, // Title
    { width: 20 }, // Department
    { width: 25 }, // Location
    { width: 12 }, // Status
    { width: 15 }, // Employment Type
    { width: 15 }, // Experience Level
    { width: 20 }, // Category
    { width: 10 }, // Featured
    { width: 12 }, // Salary Min
    { width: 12 }, // Salary Max
    { width: 10 }, // Currency
    { width: 12 }, // Show Salary
    { width: 12 }, // Applications
    { width: 15 }, // Deadline
    { width: 12 }, // Created Date
    { width: 12 }, // Created Time
    { width: 12 }, // Last Updated
    { width: 20 }, // Slug
    { width: 15 }, // Remote Work
    { width: 30 }, // Benefits
    { width: 50 }, // Requirements
    { width: 50 }  // Description
  ];

  XLSX.utils.book_append_sheet(workbook, jobsSheet, 'Jobs');

  // Create summary sheet
  const statusCounts = jobs.reduce((acc, job) => {
    acc[job.status] = (acc[job.status] || 0) + 1;
    return acc;
  }, {});

  const departmentCounts = jobs.reduce((acc, job) => {
    acc[job.department] = (acc[job.department] || 0) + 1;
    return acc;
  }, {});

  const employmentTypeCounts = jobs.reduce((acc, job) => {
    acc[job.employmentType] = (acc[job.employmentType] || 0) + 1;
    return acc;
  }, {});

  const totalApplications = jobs.reduce((sum, job) => sum + (job.applicationCount || 0), 0);
  const featuredCount = jobs.filter(job => job.featured).length;
  const avgApplicationsPerJob = jobs.length > 0 ? (totalApplications / jobs.length).toFixed(1) : 0;

  const summaryData = [
    ['Jobs Export Summary', '', ''],
    ['Generated:', `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, ''],
    ['Total Jobs:', jobs.length, ''],
    ['', '', ''],
    ['FILTERS APPLIED:', '', ''],
    ['Search Term:', filters.searchTerm || 'None', ''],
    ['Status Filter:', filters.statusFilter || 'All', ''],
    ['Department Filter:', filters.departmentFilter || 'All', ''],
    ['Category Filter:', filters.categoryFilter || 'All', ''],
    ['', '', ''],
    ['OVERVIEW METRICS:', '', ''],
    ['Total Applications:', totalApplications, ''],
    ['Featured Jobs:', featuredCount, ''],
    ['Avg Applications/Job:', avgApplicationsPerJob, ''],
    ['', '', ''],
    ['STATUS BREAKDOWN:', '', ''],
    ['Status', 'Count', 'Percentage'],
    ...Object.entries(statusCounts).map(([status, count]) => [
      status,
      count,
      `${((count / jobs.length) * 100).toFixed(1)}%`
    ]),
    ['', '', ''],
    ['DEPARTMENT BREAKDOWN:', '', ''],
    ['Department', 'Jobs', 'Percentage'],
    ...Object.entries(departmentCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([dept, count]) => [
        dept,
        count,
        `${((count / jobs.length) * 100).toFixed(1)}%`
      ]),
    ['', '', ''],
    ['EMPLOYMENT TYPE BREAKDOWN:', '', ''],
    ['Type', 'Count', 'Percentage'],
    ...Object.entries(employmentTypeCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([type, count]) => [
        type,
        count,
        `${((count / jobs.length) * 100).toFixed(1)}%`
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
  const filename = `jobs_export_${dateStr}_${timeStr}${filterSuffix}.xlsx`;

  // Export the file
  XLSX.writeFile(workbook, filename);
};

export const exportJobsToCSV = (jobs, filters = {}, categories = []) => {
  // Format job data for CSV export
  const jobData = jobs.map(job => {
    // Find category name
    const category = categories.find(cat => cat.id === job.categoryId);
    
    return {
      'Title': job.title,
      'Department': job.department,
      'Location': job.location,
      'Status': job.status,
      'Employment Type': job.employmentType,
      'Experience Level': job.experienceLevel,
      'Category': category?.name || 'Uncategorized',
      'Featured': job.featured ? 'Yes' : 'No',
      'Salary Min': job.salaryMin || 'Not specified',
      'Salary Max': job.salaryMax || 'Not specified',
      'Salary Currency': job.salaryCurrency || 'USD',
      'Show Salary': job.showSalary ? 'Yes' : 'No',
      'Applications': job.applicationCount || 0,
      'Application Deadline': job.applicationDeadline ? new Date(job.applicationDeadline).toLocaleDateString() : 'No deadline',
      'Created Date': new Date(job.createdAt).toLocaleDateString(),
      'Created Time': new Date(job.createdAt).toLocaleTimeString(),
      'Last Updated': job.updatedAt ? new Date(job.updatedAt).toLocaleDateString() : 'N/A',
      'Slug': job.slug,
      'Remote Work': job.remoteWork || 'Not specified',
      'Benefits': job.benefits ? job.benefits.replace(/[\r\n]+/g, ' ') : 'Not specified', // Remove line breaks for CSV
      'Requirements Summary': job.requirements ? job.requirements.replace(/[\r\n]+/g, ' ').substring(0, 200) + '...' : 'Not specified',
      'Description Summary': job.description ? job.description.replace(/[\r\n]+/g, ' ').substring(0, 200) + '...' : 'Not specified'
    };
  });

  // Convert to CSV
  const worksheet = XLSX.utils.json_to_sheet(jobData);
  const csv = XLSX.utils.sheet_to_csv(worksheet);

  // Create and download file
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  const filterSuffix = filters.statusFilter && filters.statusFilter !== 'all' 
    ? `_${filters.statusFilter.toLowerCase()}`
    : '';
  const filename = `jobs_export_${dateStr}_${timeStr}${filterSuffix}.csv`;

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, filename);
};