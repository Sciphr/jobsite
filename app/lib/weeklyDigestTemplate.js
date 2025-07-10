// app/lib/weeklyDigestTemplate.js
import { getSystemSetting } from "./settings";

/**
 * Generate HTML email template for weekly digest
 */
export async function generateWeeklyDigestHTML(admin, digestData) {
  const siteName = await getSystemSetting("site_name", "Job Board");
  const adminUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  const adminName = admin.firstName
    ? `${admin.firstName} ${admin.lastName || ""}`.trim()
    : admin.email.split("@")[0];

  const { summary, insights, systemHealth, dateRange } = digestData;

  // Helper function to format percentage change
  const formatChange = (change) => {
    if (change > 0) return `<span style="color: #10b981;">+${change}%</span>`;
    if (change < 0) return `<span style="color: #ef4444;">${change}%</span>`;
    return '<span style="color: #6b7280;">0%</span>';
  };

  // Helper function to format number change
  const formatNumberChange = (change) => {
    if (change > 0) return `<span style="color: #10b981;">+${change}</span>`;
    if (change < 0) return `<span style="color: #ef4444;">${change}</span>`;
    return '<span style="color: #6b7280;">±0</span>';
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Weekly Digest - ${dateRange.formatted}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
        }
        .container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 16px;
        }
        .content {
            padding: 30px;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .metric-card {
            background: #f8fafc;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            transition: all 0.2s;
        }
        .metric-card:hover {
            border-color: #cbd5e0;
            transform: translateY(-2px);
        }
        .metric-number {
            font-size: 32px;
            font-weight: 700;
            color: #2d3748;
            margin-bottom: 5px;
        }
        .metric-label {
            font-size: 14px;
            color: #718096;
            font-weight: 500;
            margin-bottom: 5px;
        }
        .metric-change {
            font-size: 12px;
            font-weight: 600;
        }
        .section {
            margin: 40px 0;
        }
        .section h2 {
            color: #2d3748;
            font-size: 22px;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e2e8f0;
        }
        .chart-container {
            background: #f8fafc;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
        }
        .daily-chart {
            display: flex;
            justify-content: space-between;
            align-items: end;
            height: 100px;
            margin: 20px 0;
            padding: 0 10px;
            border-bottom: 1px solid #e2e8f0;
        }
        .day-bar {
            flex: 1;
            margin: 0 2px;
            text-align: center;
        }
        .bar {
            background: linear-gradient(to top, #667eea, #764ba2);
            border-radius: 2px;
            margin-bottom: 5px;
            min-height: 4px;
        }
        .day-label {
            font-size: 11px;
            color: #718096;
            font-weight: 500;
        }
        .day-count {
            font-size: 12px;
            color: #2d3748;
            font-weight: 600;
            margin-bottom: 2px;
        }
        .table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .table th {
            background: #f7fafc;
            color: #2d3748;
            font-weight: 600;
            padding: 12px;
            text-align: left;
            font-size: 14px;
        }
        .table td {
            padding: 12px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 14px;
        }
        .table tr:last-child td {
            border-bottom: none;
        }
        .table tr:hover {
            background: #f8fafc;
        }
        .department-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .dept-card {
            background: #f8fafc;
            border-radius: 6px;
            padding: 15px;
            text-align: center;
            border: 1px solid #e2e8f0;
        }
        .dept-name {
            font-weight: 600;
            color: #2d3748;
            font-size: 14px;
            margin-bottom: 5px;
        }
        .dept-count {
            font-size: 20px;
            font-weight: 700;
            color: #667eea;
        }
        .alert-box {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
        }
        .alert-box.warning {
            background: #fffbeb;
            border-color: #fed7aa;
        }
        .alert-box.info {
            background: #eff6ff;
            border-color: #bfdbfe;
        }
        .alert-title {
            font-weight: 600;
            color: #991b1b;
            margin-bottom: 8px;
        }
        .alert-box.warning .alert-title {
            color: #92400e;
        }
        .alert-box.info .alert-title {
            color: #1e40af;
        }
        .footer {
            background: #f7fafc;
            padding: 30px;
            text-align: center;
            color: #718096;
            font-size: 14px;
        }
        .footer a {
            color: #667eea;
            text-decoration: none;
            font-weight: 600;
        }
        .button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 12px 24px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 600;
            margin: 10px 5px;
        }
        .button:hover {
            background: #5a67d8;
        }
        @media (max-width: 600px) {
            .metrics-grid {
                grid-template-columns: repeat(2, 1fr);
            }
            .department-stats {
                grid-template-columns: repeat(2, 1fr);
            }
            .content {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>📊 Weekly Digest</h1>
            <p>Hi ${adminName}! Here's your weekly ${siteName} summary</p>
            <p style="font-size: 14px; opacity: 0.8;">${dateRange.formatted}</p>
        </div>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Weekly Digest - ${dateRange.formatted}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
        }
        .container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 16px;
        }
        .content {
            padding: 30px;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .metric-card {
            background: #f8fafc;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            transition: all 0.2s;
        }
        .metric-card:hover {
            border-color: #cbd5e0;
            transform: translateY(-2px);
        }
        .metric-number {
            font-size: 32px;
            font-weight: 700;
            color: #2d3748;
            margin-bottom: 5px;
        }
        .metric-label {
            font-size: 14px;
            color: #718096;
            font-weight: 500;
            margin-bottom: 5px;
        }
        .metric-change {
            font-size: 12px;
            font-weight: 600;
        }
        .section {
            margin: 40px 0;
        }
        .section h2 {
            color: #2d3748;
            font-size: 22px;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e2e8f0;
        }
        .chart-container {
            background: #f8fafc;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
        }
        .daily-chart {
            display: flex;
            justify-content: space-between;
            align-items: end;
            height: 100px;
            margin: 20px 0;
            padding: 0 10px;
            border-bottom: 1px solid #e2e8f0;
        }
        .day-bar {
            flex: 1;
            margin: 0 2px;
            text-align: center;
        }
        .bar {
            background: linear-gradient(to top, #667eea, #764ba2);
            border-radius: 2px;
            margin-bottom: 5px;
            min-height: 4px;
        }
        .day-label {
            font-size: 11px;
            color: #718096;
            font-weight: 500;
        }
        .day-count {
            font-size: 12px;
            color: #2d3748;
            font-weight: 600;
            margin-bottom: 2px;
        }
        .table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .table th {
            background: #f7fafc;
            color: #2d3748;
            font-weight: 600;
            padding: 12px;
            text-align: left;
            font-size: 14px;
        }
        .table td {
            padding: 12px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 14px;
        }
        .table tr:last-child td {
            border-bottom: none;
        }
        .table tr:hover {
            background: #f8fafc;
        }
        .department-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .dept-card {
            background: #f8fafc;
            border-radius: 6px;
            padding: 15px;
            text-align: center;
            border: 1px solid #e2e8f0;
        }
        .dept-name {
            font-weight: 600;
            color: #2d3748;
            font-size: 14px;
            margin-bottom: 5px;
        }
        .dept-count {
            font-size: 20px;
            font-weight: 700;
            color: #667eea;
        }
        .alert-box {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
        }
        .alert-box.warning {
            background: #fffbeb;
            border-color: #fed7aa;
        }
        .alert-box.info {
            background: #eff6ff;
            border-color: #bfdbfe;
        }
        .alert-title {
            font-weight: 600;
            color: #991b1b;
            margin-bottom: 8px;
        }
        .alert-box.warning .alert-title {
            color: #92400e;
        }
        .alert-box.info .alert-title {
            color: #1e40af;
        }
        .footer {
            background: #f7fafc;
            padding: 30px;
            text-align: center;
            color: #718096;
            font-size: 14px;
        }
        .footer a {
            color: #667eea;
            text-decoration: none;
            font-weight: 600;
        }
        .button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 12px 24px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 600;
            margin: 10px 5px;
        }
        .button:hover {
            background: #5a67d8;
        }
        @media (max-width: 600px) {
            .metrics-grid {
                grid-template-columns: repeat(2, 1fr);
            }
            .department-stats {
                grid-template-columns: repeat(2, 1fr);
            }
            .content {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="content">
            <!-- Key Metrics -->
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-number">${summary.jobs.thisWeek.total}</div>
                    <div class="metric-label">New Jobs Posted</div>
                    <div class="metric-change">
                        ${formatNumberChange(summary.jobs.change.total)} from last week
                        (${formatChange(summary.jobs.change.totalPercent)})
                    </div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-number">${summary.applications.thisWeek.total}</div>
                    <div class="metric-label">Applications Received</div>
                    <div class="metric-change">
                        ${formatNumberChange(summary.applications.change.total)} from last week
                        (${formatChange(summary.applications.change.totalPercent)})
                    </div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-number">${summary.applications.thisWeek.hired}</div>
                    <div class="metric-label">New Hires</div>
                    <div class="metric-change">🎉 Congratulations!</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-number">${summary.users.thisWeek.total}</div>
                    <div class="metric-label">New Users</div>
                    <div class="metric-change">
                        ${formatNumberChange(summary.users.change.total)} from last week
                        (${formatChange(summary.users.change.totalPercent)})
                    </div>
                </div>
            </div>

            <!-- Daily Applications Chart -->
            <div class="section">
                <h2>📈 Daily Application Activity</h2>
                <div class="chart-container">
                    <div class="daily-chart">
                        ${insights.dailyApplications
                          .map((day) => {
                            const maxApplications = Math.max(
                              ...insights.dailyApplications.map(
                                (d) => d.applications
                              )
                            );
                            const height =
                              maxApplications > 0
                                ? Math.max(
                                    4,
                                    (day.applications / maxApplications) * 80
                                  )
                                : 4;
                            return `
                                <div class="day-bar">
                                    <div class="day-count">${day.applications}</div>
                                    <div class="bar" style="height: ${height}px;"></div>
                                    <div class="day-label">${day.date}</div>
                                </div>
                            `;
                          })
                          .join("")}
                    </div>
                    <p style="margin: 10px 0 0 0; color: #718096; font-size: 12px;">
                        Total: ${insights.dailyApplications.reduce((sum, day) => sum + day.applications, 0)} applications this week
                    </p>
                </div>
            </div>

            <!-- Application Status Breakdown -->
            <div class="section">
                <h2>📋 Application Status Breakdown</h2>
                <div class="metrics-grid" style="grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));">
                    <div class="metric-card">
                        <div class="metric-number" style="color: #3b82f6;">${summary.applications.thisWeek.applied}</div>
                        <div class="metric-label">Applied</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-number" style="color: #f59e0b;">${summary.applications.thisWeek.reviewing}</div>
                        <div class="metric-label">Reviewing</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-number" style="color: #8b5cf6;">${summary.applications.thisWeek.interview}</div>
                        <div class="metric-label">Interview</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-number" style="color: #10b981;">${summary.applications.thisWeek.hired}</div>
                        <div class="metric-label">Hired</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-number" style="color: #ef4444;">${summary.applications.thisWeek.rejected}</div>
                        <div class="metric-label">Rejected</div>
                    </div>
                </div>
            </div>

            <!-- Department Performance -->
            ${
              insights.departmentStats.length > 0
                ? `
            <div class="section">
                <h2>🏢 Applications by Department</h2>
                <div class="department-stats">
                    ${insights.departmentStats
                      .slice(0, 6)
                      .map(
                        (dept) => `
                        <div class="dept-card">
                            <div class="dept-name">${dept.department}</div>
                            <div class="dept-count">${dept.applications}</div>
                        </div>
                    `
                      )
                      .join("")}
                </div>
            </div>
            `
                : ""
            }

            <!-- Top Performing Jobs -->
            ${
              insights.topJobs.length > 0
                ? `
            <div class="section">
                <h2>🚀 Top Performing Jobs This Week</h2>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Job Title</th>
                            <th>Department</th>
                            <th>Weekly Apps</th>
                            <th>Total Apps</th>
                            <th>Conversion</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${insights.topJobs
                          .slice(0, 5)
                          .map(
                            (job) => `
                            <tr>
                                <td><strong>${job.title}</strong></td>
                                <td>${job.department}</td>
                                <td style="color: #10b981; font-weight: 600;">${job.weeklyApplications}</td>
                                <td>${job.totalApplications}</td>
                                <td>${job.conversionRate}%</td>
                            </tr>
                        `
                          )
                          .join("")}
                    </tbody>
                </table>
            </div>
            `
                : ""
            }

            <!-- Jobs Needing Attention -->
            ${
              insights.lowPerformingJobs.length > 0
                ? `
            <div class="section">
                <h2>⚠️ Jobs Needing Attention</h2>
                <div class="alert-box warning">
                    <div class="alert-title">Low Application Alert</div>
                    <p>These jobs may need review - consider updating descriptions, salary ranges, or requirements.</p>
                </div>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Job Title</th>
                            <th>Department</th>
                            <th>Days Live</th>
                            <th>Applications</th>
                            <th>Views</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${insights.lowPerformingJobs
                          .slice(0, 5)
                          .map(
                            (job) => `
                            <tr>
                                <td><strong>${job.title}</strong></td>
                                <td>${job.department}</td>
                                <td>${job.daysLive} days</td>
                                <td style="color: #ef4444; font-weight: 600;">${job.applications}</td>
                                <td>${job.views}</td>
                            </tr>
                        `
                          )
                          .join("")}
                    </tbody>
                </table>
            </div>
            `
                : ""
            }

            <!-- System Health -->
            <div class="section">
                <h2>🔧 System Overview</h2>
                <div class="alert-box info">
                    <div class="alert-title">System Status: ${systemHealth.systemStatus.toUpperCase()}</div>
                    <p>
                        <strong>${systemHealth.activeJobs}</strong> active jobs • 
                        <strong>${systemHealth.totalUsers}</strong> total users • 
                        <strong>${systemHealth.totalApplications}</strong> total applications
                    </p>
                </div>
            </div>

            <!-- Action Items -->
            <div class="section">
                <h2>🎯 Recommended Actions</h2>
                <div class="alert-box">
                    <div class="alert-title">This Week's Focus:</div>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                        ${
                          insights.lowPerformingJobs.length > 0
                            ? `<li>Review ${insights.lowPerformingJobs.length} jobs with low application rates</li>`
                            : "<li>✅ All jobs are performing well!</li>"
                        }
                        ${
                          summary.applications.thisWeek.applied >
                          summary.applications.thisWeek.reviewing
                            ? '<li>Process pending applications in "Applied" status</li>'
                            : "<li>✅ Application processing is on track</li>"
                        }
                        ${
                          summary.applications.thisWeek.interview > 0
                            ? `<li>Follow up on ${summary.applications.thisWeek.interview} candidates in interview stage</li>`
                            : ""
                        }
                        ${
                          summary.jobs.thisWeek.total === 0
                            ? "<li>Consider posting new jobs to maintain hiring momentum</li>"
                            : "<li>✅ Job posting activity looks healthy</li>"
                        }
                    </ul>
                </div>
            </div>

            <!-- Quick Actions -->
            <div style="text-align: center; margin: 40px 0;">
                <a href="${adminUrl}/admin/dashboard" class="button">
                    📊 View Full Dashboard
                </a>
                <a href="${adminUrl}/admin/applications" class="button">
                    📋 Review Applications
                </a>
                <a href="${adminUrl}/admin/jobs" class="button">
                    💼 Manage Jobs
                </a>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p>
                This digest was generated on ${digestData.generatedAt.toLocaleString()}<br>
                <a href="${adminUrl}/admin/settings">Update notification preferences</a> • 
                <a href="${adminUrl}/admin/analytics">View detailed analytics</a>
            </p>
            <p style="font-size: 12px; margin-top: 15px; color: #a0aec0;">
                ${siteName} Weekly Digest • Powered by your job board platform
            </p>
        </div>
    </div>
</body>
</html>
  `;
}
