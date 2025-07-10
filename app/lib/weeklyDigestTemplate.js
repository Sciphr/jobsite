import { getSystemSetting } from "./settings";

export async function generateWeeklyDigestHTML(admin, digestData) {
  const siteName = await getSystemSetting("site_name", "Job Board");
  const adminUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  const { configuration } = digestData;
  const selectedTheme = configuration?.emailTheme || "professional";

  // Theme configurations
  const themes = {
    professional: {
      headerGradient:
        "background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%);",
      primaryColor: "#1e40af",
      accentColor: "#3b82f6",
      backgroundColor: "#f8fafc",
      cardBackground: "#ffffff",
      textColor: "#1f2937",
      borderRadius: "8px",
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      spacing: "standard",
    },
    minimalist: {
      headerGradient:
        "background: linear-gradient(135deg, #374151 0%, #1f2937 100%);",
      primaryColor: "#374151",
      accentColor: "#6b7280",
      backgroundColor: "#ffffff",
      cardBackground: "#f9fafb",
      textColor: "#111827",
      borderRadius: "4px",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      spacing: "compact",
    },
    modern: {
      headerGradient:
        "background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%);",
      primaryColor: "#7c3aed",
      accentColor: "#a855f7",
      backgroundColor: "#faf5ff",
      cardBackground: "#ffffff",
      textColor: "#1f2937",
      borderRadius: "12px",
      fontFamily: "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif",
      spacing: "spacious",
    },
  };

  const currentTheme = themes[selectedTheme];

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

  // Helper function to check if a section/customization is enabled
  const isEnabled = (section, customization = null) => {
    if (!configuration.sections[section]) return false;
    if (customization && configuration.sectionCustomizations[section]) {
      return configuration.sectionCustomizations[section][customization];
    }
    return true;
  };

  // Build metrics grid based on enabled customizations
  const buildMetricsGrid = () => {
    const metrics = [];

    // Job metrics
    if (isEnabled("jobMetrics", "newJobs") && summary.jobs) {
      metrics.push(`
        <div class="metric-card">
          <div class="metric-number">${summary.jobs.thisWeek.total}</div>
          <div class="metric-label">New Jobs Posted</div>
          <div class="metric-change">
            ${formatNumberChange(summary.jobs.change.total)} from last week
            (${formatChange(summary.jobs.change.totalPercent)})
          </div>
        </div>
      `);
    }

    if (
      isEnabled("jobMetrics", "jobViews") &&
      summary.jobs?.thisWeek.totalViews
    ) {
      metrics.push(`
        <div class="metric-card">
          <div class="metric-number">${summary.jobs.thisWeek.totalViews}</div>
          <div class="metric-label">Total Job Views</div>
          <div class="metric-change">📊 This week</div>
        </div>
      `);
    }

    // Application metrics
    if (isEnabled("applicationData", "totalApps") && summary.applications) {
      metrics.push(`
        <div class="metric-card">
          <div class="metric-number">${summary.applications.thisWeek.total}</div>
          <div class="metric-label">Applications Received</div>
          <div class="metric-change">
            ${formatNumberChange(summary.applications.change.total)} from last week
            (${formatChange(summary.applications.change.totalPercent)})
          </div>
        </div>
      `);
    }

    if (isEnabled("applicationData", "hired") && summary.applications) {
      metrics.push(`
        <div class="metric-card">
          <div class="metric-number">${summary.applications.thisWeek.hired}</div>
          <div class="metric-label">New Hires</div>
          <div class="metric-change">🎉 Congratulations!</div>
        </div>
      `);
    }

    // User metrics
    if (isEnabled("userMetrics", "newUsers") && summary.users) {
      metrics.push(`
        <div class="metric-card">
          <div class="metric-number">${summary.users.thisWeek.total}</div>
          <div class="metric-label">New Users</div>
          <div class="metric-change">
            ${formatNumberChange(summary.users.change.total)} from last week
            (${formatChange(summary.users.change.totalPercent)})
          </div>
        </div>
      `);
    }

    return metrics.join("");
  };

  // Build application status breakdown
  const buildApplicationStatusBreakdown = () => {
    if (!isEnabled("applicationData") || !summary.applications) return "";

    const statusCards = [];
    const customs = configuration.sectionCustomizations.applicationData || {};

    if (customs.applied) {
      statusCards.push(`
        <div class="metric-card">
          <div class="metric-number" style="color: ${currentTheme.accentColor};">${summary.applications.thisWeek.applied}</div>
          <div class="metric-label">Applied</div>
        </div>
      `);
    }

    if (customs.reviewing) {
      statusCards.push(`
        <div class="metric-card">
          <div class="metric-number" style="color: #f59e0b;">${summary.applications.thisWeek.reviewing}</div>
          <div class="metric-label">Reviewing</div>
        </div>
      `);
    }

    if (customs.interview) {
      statusCards.push(`
        <div class="metric-card">
          <div class="metric-number" style="color: #8b5cf6;">${summary.applications.thisWeek.interview}</div>
          <div class="metric-label">Interview</div>
        </div>
      `);
    }

    if (customs.hired) {
      statusCards.push(`
        <div class="metric-card">
          <div class="metric-number" style="color: #10b981;">${summary.applications.thisWeek.hired}</div>
          <div class="metric-label">Hired</div>
        </div>
      `);
    }

    if (customs.rejected) {
      statusCards.push(`
        <div class="metric-card">
          <div class="metric-number" style="color: #ef4444;">${summary.applications.thisWeek.rejected}</div>
          <div class="metric-label">Rejected</div>
        </div>
      `);
    }

    if (statusCards.length === 0) return "";

    return `
      <div class="section">
        <h2>📋 Application Status Breakdown</h2>
        <div class="metrics-grid" style="grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));">
          ${statusCards.join("")}
        </div>
      </div>
    `;
  };

  // Theme-specific header content
  const getThemeHeader = () => {
    const emoji =
      selectedTheme === "professional"
        ? "📊"
        : selectedTheme === "minimalist"
          ? "📈"
          : "🚀";
    const subtitle =
      selectedTheme === "professional"
        ? "Weekly Performance Summary"
        : selectedTheme === "minimalist"
          ? "Week in Review"
          : "Your Weekly Highlights";

    return `
      <div class="header">
        <h1>${emoji} Weekly Digest</h1>
        <p>Hi ${adminName}! ${subtitle}</p>
        <p style="font-size: 14px; opacity: 0.8;">${dateRange.formatted}</p>
      </div>
    `;
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
            font-family: ${currentTheme.fontFamily};
            background-color: ${currentTheme.backgroundColor};
            color: ${currentTheme.textColor};
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .container {
            background: ${currentTheme.cardBackground};
            border-radius: ${currentTheme.borderRadius};
            overflow: hidden;
            ${selectedTheme === "modern" ? "box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);" : "box-shadow: 0 2px 4px rgba(0,0,0,0.1);"}
        }
        .header {
            ${currentTheme.headerGradient}
            color: white;
            padding: ${currentTheme.spacing === "compact" ? "20px" : currentTheme.spacing === "spacious" ? "40px" : "30px"};
            text-align: center;
            border-radius: ${currentTheme.borderRadius} ${currentTheme.borderRadius} 0 0;
        }
        .header h1 {
            margin: 0;
            font-size: ${selectedTheme === "modern" ? "32px" : "28px"};
            font-weight: ${selectedTheme === "minimalist" ? "500" : "600"};
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 16px;
        }
        .content {
            padding: ${currentTheme.spacing === "compact" ? "20px" : currentTheme.spacing === "spacious" ? "40px" : "30px"};
            background: ${currentTheme.cardBackground};
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: ${currentTheme.spacing === "compact" ? "15px" : currentTheme.spacing === "spacious" ? "25px" : "20px"};
            margin: 30px 0;
        }
        .metric-card {
            background: ${selectedTheme === "minimalist" ? "#ffffff" : currentTheme.cardBackground};
            border: ${selectedTheme === "minimalist" ? "1px solid #e5e7eb" : "none"};
            border-radius: ${currentTheme.borderRadius};
            padding: ${currentTheme.spacing === "compact" ? "15px" : currentTheme.spacing === "spacious" ? "25px" : "20px"};
            text-align: center;
            transition: all 0.2s;
            ${selectedTheme === "modern" ? "box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);" : ""}
            ${selectedTheme === "professional" ? "border: 2px solid #e2e8f0;" : ""}
        }
        .metric-number {
            font-size: ${selectedTheme === "modern" ? "36px" : "32px"};
            font-weight: ${selectedTheme === "minimalist" ? "600" : "700"};
            color: ${currentTheme.primaryColor};
            margin-bottom: 5px;
        }
        .metric-label {
            font-size: 14px;
            color: ${currentTheme.textColor};
            opacity: 0.7;
            font-weight: 500;
            margin-bottom: 5px;
        }
        .metric-change {
            font-size: 12px;
            font-weight: 600;
        }
        .section {
            margin: ${currentTheme.spacing === "compact" ? "30px 0" : "40px 0"};
        }
        .section h2 {
            color: ${currentTheme.primaryColor};
            font-size: ${selectedTheme === "modern" ? "24px" : "22px"};
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid ${currentTheme.accentColor};
            font-weight: ${selectedTheme === "minimalist" ? "500" : "600"};
        }
        .chart-container {
            background: ${selectedTheme === "minimalist" ? "#f9fafb" : "#f8fafc"};
            border-radius: ${currentTheme.borderRadius};
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
            background: ${currentTheme.headerGradient.replace("background: ", "")};
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
            color: ${currentTheme.textColor};
            font-weight: 600;
            margin-bottom: 2px;
        }
        .table {
            width: 100%;
            border-collapse: collapse;
            background: ${currentTheme.cardBackground};
            border-radius: ${currentTheme.borderRadius};
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .table th {
            background: ${selectedTheme === "minimalist" ? "#f9fafb" : "#f7fafc"};
            color: ${currentTheme.textColor};
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
        .department-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .dept-card {
            background: ${selectedTheme === "minimalist" ? "#ffffff" : "#f8fafc"};
            border-radius: ${currentTheme.borderRadius};
            padding: 15px;
            text-align: center;
            border: 1px solid #e2e8f0;
        }
        .dept-name {
            font-weight: 600;
            color: ${currentTheme.textColor};
            font-size: 14px;
            margin-bottom: 5px;
        }
        .dept-count {
            font-size: 20px;
            font-weight: 700;
            color: ${currentTheme.accentColor};
        }
        .alert-box {
            border-radius: ${currentTheme.borderRadius};
            padding: 15px;
            margin: 20px 0;
        }
        .alert-box.warning {
            background: #fffbeb;
            border: 1px solid #fed7aa;
        }
        .alert-box.info {
            background: #eff6ff;
            border: 1px solid #bfdbfe;
        }
        .alert-title {
            font-weight: 600;
            margin-bottom: 8px;
        }
        .alert-box.warning .alert-title {
            color: #92400e;
        }
        .alert-box.info .alert-title {
            color: #1e40af;
        }
        .button {
            display: inline-block;
            background: ${currentTheme.primaryColor};
            color: white;
            padding: ${selectedTheme === "modern" ? "14px 28px" : "12px 24px"};
            border-radius: ${currentTheme.borderRadius};
            text-decoration: none;
            font-weight: 600;
            margin: 10px 5px;
        }
        .footer {
            background: ${selectedTheme === "minimalist" ? "#f9fafb" : "#f7fafc"};
            padding: 30px;
            text-align: center;
            color: #718096;
            font-size: 14px;
        }
        .footer a {
            color: ${currentTheme.accentColor};
            text-decoration: none;
            font-weight: 600;
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
        ${getThemeHeader()}
        
        <div class="content">
            <!-- Key Metrics -->
            ${
              buildMetricsGrid()
                ? `
            <div class="metrics-grid">
                ${buildMetricsGrid()}
            </div>
            `
                : ""
            }

            <!-- Daily Applications Chart -->
            ${
              isEnabled("applicationData", "dailyBreakdown") &&
              insights.dailyApplications
                ? `
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
            `
                : ""
            }

            <!-- Application Status Breakdown -->
            ${buildApplicationStatusBreakdown()}

            <!-- User Growth -->
            ${
              isEnabled("userMetrics", "userGrowth") && summary.users
                ? `
            <div class="section">
                <h2>👥 User Growth</h2>
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-number" style="color: #10b981;">${summary.users.thisWeek.total}</div>
                        <div class="metric-label">New Registrations</div>
                        <div class="metric-change">This week</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-number" style="color: ${currentTheme.accentColor};">${formatChange(summary.users.change.totalPercent)}</div>
                        <div class="metric-label">Growth Rate</div>
                        <div class="metric-change">vs. last week</div>
                    </div>
                </div>
            </div>
            `
                : ""
            }

            <!-- Department Performance -->
            ${
              isEnabled("jobMetrics", "jobsByDepartment") &&
              insights.departmentStats?.length > 0
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
              isEnabled("jobMetrics", "topJobs") && insights.topJobs?.length > 0
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
              isEnabled("jobMetrics", "lowJobs") &&
              insights.lowPerformingJobs?.length > 0
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

            <!-- Average Time to Hire -->
            ${
              isEnabled("applicationData", "avgTimeToHire")
                ? `
            <div class="section">
                <h2>⏱️ Hiring Process Performance</h2>
                <div class="alert-box info">
                    <div class="alert-title">Time to Hire Metrics</div>
                    <p>Monitor your hiring process efficiency and candidate experience.</p>
                </div>
            </div>
            `
                : ""
            }

            <!-- System Health -->
            ${
              isEnabled("systemHealth") && systemHealth
                ? `
            <div class="section">
                <h2>🔧 System Overview</h2>
                <div class="alert-box info">
                    <div class="alert-title">System Status: ${systemHealth.systemStatus.toUpperCase()}</div>
                    <p>
                        ${isEnabled("systemHealth", "systemStatus") ? `<strong>${systemHealth.activeJobs}</strong> active jobs • ` : ""}
                        <strong>${systemHealth.totalUsers}</strong> total users • 
                        <strong>${systemHealth.totalApplications}</strong> total applications
                    </p>
                    ${
                      isEnabled("systemHealth", "alerts")
                        ? `
                    <p style="margin-top: 10px; color: #10b981; font-weight: 600;">✅ No system alerts</p>
                    `
                        : ""
                    }
                </div>
            </div>
            `
                : ""
            }

            <!-- Action Items -->
            <div class="section">
                <h2>🎯 Recommended Actions</h2>
                <div class="alert-box">
                    <div class="alert-title">This Week's Focus:</div>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                        ${
                          insights.lowPerformingJobs?.length > 0
                            ? `<li>Review ${insights.lowPerformingJobs.length} jobs with low application rates</li>`
                            : "<li>✅ All jobs are performing well!</li>"
                        }
                        ${
                          summary.applications &&
                          summary.applications.thisWeek.applied >
                            summary.applications.thisWeek.reviewing
                            ? '<li>Process pending applications in "Applied" status</li>'
                            : "<li>✅ Application processing is on track</li>"
                        }
                        ${
                          summary.applications &&
                          summary.applications.thisWeek.interview > 0
                            ? `<li>Follow up on ${summary.applications.thisWeek.interview} candidates in interview stage</li>`
                            : ""
                        }
                        ${
                          summary.jobs && summary.jobs.thisWeek.total === 0
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
                <a href="${adminUrl}/admin/weekly-digest">Update digest preferences</a> • 
                <a href="${adminUrl}/admin/analytics">View detailed analytics</a>
            </p>
            <p style="font-size: 12px; margin-top: 15px; color: #a0aec0;">
                ${siteName} Weekly Digest • ${selectedTheme.charAt(0).toUpperCase() + selectedTheme.slice(1)} Theme
            </p>
        </div>
    </div>
</body>
</html>
  `;
}
