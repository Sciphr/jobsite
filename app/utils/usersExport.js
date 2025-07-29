import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export const exportUsersToExcel = (users, filters = {}) => {
  const workbook = XLSX.utils.book_new();
  
  // Get current date for filename
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  
  // Format user data for export
  const userData = users.map(user => {
    return {
      'Name': `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A',
      'Email': user.email,
      'Role': getRoleDisplayName(user.privilegeLevel),
      'Status': user.emailVerified ? 'Verified' : 'Unverified',
      'Phone': user.phone || 'Not provided',
      'Company': user.company || 'Not provided',
      'LinkedIn': user.linkedInUrl || 'Not provided',
      'Joined Date': user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A',
      'Joined Time': user.createdAt ? new Date(user.createdAt).toLocaleTimeString() : 'N/A',
      'Last Updated': user.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : 'N/A',
      'Email Verified At': user.emailVerified ? new Date(user.emailVerified).toLocaleDateString() : 'Not verified',
      'Applications Count': user.applications?.length || 0,
      'User ID': user.id,
    };
  });

  // Create main users sheet
  const usersSheet = XLSX.utils.json_to_sheet(userData);
  
  // Set column widths
  usersSheet['!cols'] = [
    { width: 25 }, // Name
    { width: 30 }, // Email
    { width: 15 }, // Role
    { width: 12 }, // Status
    { width: 15 }, // Phone
    { width: 20 }, // Company
    { width: 30 }, // LinkedIn
    { width: 12 }, // Joined Date
    { width: 12 }, // Joined Time
    { width: 12 }, // Last Updated
    { width: 15 }, // Email Verified At
    { width: 12 }, // Applications Count
    { width: 36 }  // User ID
  ];

  XLSX.utils.book_append_sheet(workbook, usersSheet, 'Users');

  // Create summary sheet
  const roleCounts = users.reduce((acc, user) => {
    const role = getRoleDisplayName(user.privilegeLevel);
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});

  const statusCounts = users.reduce((acc, user) => {
    const status = user.emailVerified ? 'Verified' : 'Unverified';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const totalApplications = users.reduce((sum, user) => sum + (user.applications?.length || 0), 0);
  const verifiedCount = users.filter(user => user.emailVerified).length;
  const avgApplicationsPerUser = users.length > 0 ? (totalApplications / users.length).toFixed(1) : 0;

  const summaryData = [
    ['Users Export Summary', '', ''],
    ['Generated:', `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, ''],
    ['Total Users:', users.length, ''],
    ['', '', ''],
    ['FILTERS APPLIED:', '', ''],
    ['Search Term:', filters.searchTerm || 'None', ''],
    ['Role Filter:', filters.roleFilter || 'All', ''],
    ['Status Filter:', filters.statusFilter || 'All', ''],
    ['', '', ''],
    ['OVERVIEW METRICS:', '', ''],
    ['Total Applications:', totalApplications, ''],
    ['Verified Users:', verifiedCount, ''],
    ['Avg Applications/User:', avgApplicationsPerUser, ''],
    ['', '', ''],
    ['ROLE BREAKDOWN:', '', ''],
    ['Role', 'Count', 'Percentage'],
    ...Object.entries(roleCounts).map(([role, count]) => [
      role,
      count,
      `${((count / users.length) * 100).toFixed(1)}%`
    ]),
    ['', '', ''],
    ['STATUS BREAKDOWN:', '', ''],
    ['Status', 'Count', 'Percentage'],
    ...Object.entries(statusCounts).map(([status, count]) => [
      status,
      count,
      `${((count / users.length) * 100).toFixed(1)}%`
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
  const filterSuffix = filters.roleFilter && filters.roleFilter !== 'all' 
    ? `_${filters.roleFilter.toLowerCase()}`
    : '';
  const filename = `users_export_${dateStr}_${timeStr}${filterSuffix}.xlsx`;

  // Export the file
  XLSX.writeFile(workbook, filename);
};

export const exportUsersToCSV = (users, filters = {}) => {
  // Format user data for CSV export
  const userData = users.map(user => {
    return {
      'Name': `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A',
      'Email': user.email,
      'Role': getRoleDisplayName(user.privilegeLevel),
      'Status': user.emailVerified ? 'Verified' : 'Unverified',
      'Phone': user.phone || 'Not provided',
      'Company': user.company || 'Not provided',
      'LinkedIn': user.linkedInUrl ? user.linkedInUrl.replace(/[\r\n]+/g, ' ') : 'Not provided', // Remove line breaks for CSV
      'Joined Date': user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A',
      'Joined Time': user.createdAt ? new Date(user.createdAt).toLocaleTimeString() : 'N/A',
      'Last Updated': user.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : 'N/A',
      'Email Verified At': user.emailVerified ? new Date(user.emailVerified).toLocaleDateString() : 'Not verified',
      'Applications Count': user.applications?.length || 0,
      'User ID': user.id,
    };
  });

  // Convert to CSV
  const worksheet = XLSX.utils.json_to_sheet(userData);
  const csv = XLSX.utils.sheet_to_csv(worksheet);

  // Create and download file
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  const filterSuffix = filters.roleFilter && filters.roleFilter !== 'all' 
    ? `_${filters.roleFilter.toLowerCase()}`
    : '';
  const filename = `users_export_${dateStr}_${timeStr}${filterSuffix}.csv`;

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, filename);
};

// Helper function to get display name for privilege levels
function getRoleDisplayName(privilegeLevel) {
  switch (privilegeLevel) {
    case 0:
      return 'User';
    case 1:
      return 'Moderator';
    case 2:
      return 'Admin';
    case 3:
      return 'Super Admin';
    default:
      return 'Unknown';
  }
}