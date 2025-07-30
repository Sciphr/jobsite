import { getSystemSetting } from "./settings";

export async function generateWeeklyDigestHTML(admin, digestData) {
  const siteName = await getSystemSetting("site_name", "Job Board");
  const adminUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  const { configuration } = digestData;
  const selectedTheme = configuration?.emailTheme || "professional";

  // Dramatically different theme configurations
  const themes = {
    professional: {
      // Corporate, blocky, traditional
      headerGradient:
        "background: linear-gradient(90deg, #1e3a8a 0%, #1e40af 100%);",
      primaryColor: "#1e40af",
      accentColor: "#3b82f6",
      backgroundColor: "#f8fafc",
      cardBackground: "#ffffff",
      textColor: "#1f2937",
      borderRadius: "0px", // Sharp, blocky corners
      fontFamily: "'Times New Roman', Times, serif", // Traditional serif font
      spacing: "tight",
      headerStyle: "corporate",
      cardStyle: "bordered-blocks",
    },
    minimalist: {
      // Clean, spacious, minimal
      headerGradient:
        "background: linear-gradient(180deg, #6b7280 0%, #374151 100%);",
      primaryColor: "#374151",
      accentColor: "#6b7280",
      backgroundColor: "#ffffff",
      cardBackground: "#fafafa",
      textColor: "#111827",
      borderRadius: "2px", // Minimal rounding
      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
      spacing: "spacious",
      headerStyle: "minimal",
      cardStyle: "subtle-shadows",
    },
    modern: {
      // Bold, curved, gradients, vibrant
      headerGradient:
        "background: linear-gradient(135deg, #7c3aed 0%, #ec4899 20%, #f59e0b 40%, #10b981 60%, #3b82f6 80%, #8b5cf6 100%);",
      primaryColor: "#7c3aed",
      accentColor: "#ec4899",
      backgroundColor: "#faf5ff",
      cardBackground: "linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)",
      textColor: "#1f2937",
      borderRadius: "16px", // Very rounded
      fontFamily: "'Poppins', 'Inter', sans-serif",
      spacing: "dynamic",
      headerStyle: "animated",
      cardStyle: "glass-morphism",
    },
  };

  const currentTheme = themes[selectedTheme];

  const adminName = admin.firstName
    ? `${admin.firstName} ${admin.lastName || ""}`.trim()
    : admin.email.split("@")[0];

  const { summary, insights, systemHealth, dateRange } = digestData;

  // Helper functions remain the same
  const formatChange = (change) => {
    if (change > 0) return `<span style="color: #10b981;">+${change}%</span>`;
    if (change < 0) return `<span style="color: #ef4444;">${change}%</span>`;
    return '<span style="color: #6b7280;">0%</span>';
  };

  const formatNumberChange = (change) => {
    if (change > 0) return `<span style="color: #10b981;">+${change}</span>`;
    if (change < 0) return `<span style="color: #ef4444;">${change}</span>`;
    return '<span style="color: #6b7280;">±0</span>';
  };

  const isEnabled = (section, customization = null) => {
    if (!configuration.sections[section]) return false;
    if (customization && configuration.sectionCustomizations[section]) {
      return configuration.sectionCustomizations[section][customization];
    }
    return true;
  };

  // Theme-specific metric card styles
  const getMetricCardClass = () => {
    switch (selectedTheme) {
      case "professional":
        return "metric-card-professional";
      case "minimalist":
        return "metric-card-minimalist";
      case "modern":
        return "metric-card-modern";
      default:
        return "metric-card-professional";
    }
  };

  // Build metrics grid with theme-specific styling
  const buildMetricsGrid = () => {
    const metrics = [];
    const cardClass = getMetricCardClass();

    // Job metrics
    if (isEnabled("jobMetrics", "newJobs") && summary.jobs) {
      metrics.push(`
        <div class="${cardClass}">
          <div class="metric-number">${summary.jobs.thisWeek.total}</div>
          <div class="metric-label">NEW JOBS POSTED</div>
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
        <div class="${cardClass}">
          <div class="metric-number">${summary.jobs.thisWeek.totalViews}</div>
          <div class="metric-label">TOTAL JOB VIEWS</div>
          <div class="metric-change">${selectedTheme === "modern" ? "🔥" : "📊"} This week</div>
        </div>
      `);
    }

    if (isEnabled("applicationData", "totalApps") && summary.applications) {
      metrics.push(`
        <div class="${cardClass}">
          <div class="metric-number">${summary.applications.thisWeek.total}</div>
          <div class="metric-label">APPLICATIONS RECEIVED</div>
          <div class="metric-change">
            ${formatNumberChange(summary.applications.change.total)} from last week
            (${formatChange(summary.applications.change.totalPercent)})
          </div>
        </div>
      `);
    }

    if (isEnabled("applicationData", "hired") && summary.applications) {
      metrics.push(`
        <div class="${cardClass}">
          <div class="metric-number">${summary.applications.thisWeek.hired}</div>
          <div class="metric-label">NEW HIRES</div>
          <div class="metric-change">${selectedTheme === "modern" ? "🎉✨" : selectedTheme === "professional" ? "Success" : "🎉"} Congratulations!</div>
        </div>
      `);
    }

    if (isEnabled("applicationData", "applied") && summary.applications) {
      metrics.push(`
        <div class="${cardClass}">
          <div class="metric-number">${summary.applications.thisWeek.applied}</div>
          <div class="metric-label">AWAITING REVIEW</div>
          <div class="metric-change">${selectedTheme === "modern" ? "📝✨" : "📝"} New submissions</div>
        </div>
      `);
    }

    if (isEnabled("applicationData", "reviewing") && summary.applications) {
      metrics.push(`
        <div class="${cardClass}">
          <div class="metric-number">${summary.applications.thisWeek.reviewing}</div>
          <div class="metric-label">UNDER REVIEW</div>
          <div class="metric-change">${selectedTheme === "modern" ? "👀✨" : "👀"} Being evaluated</div>
        </div>
      `);
    }

    if (isEnabled("applicationData", "interview") && summary.applications) {
      metrics.push(`
        <div class="${cardClass}">
          <div class="metric-number">${summary.applications.thisWeek.interview}</div>
          <div class="metric-label">IN INTERVIEWS</div>
          <div class="metric-change">${selectedTheme === "modern" ? "🤝✨" : "🤝"} Progressing well</div>
        </div>
      `);
    }

    if (isEnabled("applicationData", "rejected") && summary.applications) {
      metrics.push(`
        <div class="${cardClass}">
          <div class="metric-number">${summary.applications.thisWeek.rejected}</div>
          <div class="metric-label">NOT SELECTED</div>
          <div class="metric-change">${selectedTheme === "modern" ? "📋✨" : "📋"} Process complete</div>
        </div>
      `);
    }

    if (isEnabled("userMetrics", "newUsers") && summary.users) {
      metrics.push(`
        <div class="${cardClass}">
          <div class="metric-number">${summary.users.thisWeek.total}</div>
          <div class="metric-label">NEW USERS</div>
          <div class="metric-change">
            ${formatNumberChange(summary.users.change.total)} from last week
            (${formatChange(summary.users.change.totalPercent)})
          </div>
        </div>
      `);
    }

    if (isEnabled("userMetrics", "activeUsers") && summary.users?.thisWeek.active !== undefined) {
      metrics.push(`
        <div class="${cardClass}">
          <div class="metric-number">${summary.users.thisWeek.active}</div>
          <div class="metric-label">ACTIVE USERS</div>
          <div class="metric-change">${selectedTheme === "modern" ? "🔥" : "📊"} This week</div>
        </div>
      `);
    }

    return metrics.join("");
  };

  // Theme-specific headers
  const getThemeHeader = () => {
    switch (selectedTheme) {
      case "professional":
        return `
          <div class="header-professional">
            <div class="header-content">
              <h1>📊 WEEKLY BUSINESS DIGEST</h1>
              <div class="header-divider"></div>
              <p>Executive Summary for ${adminName}</p>
              <p class="header-date">REPORTING PERIOD: ${dateRange.formatted}</p>
            </div>
          </div>
        `;
      case "minimalist":
        return `
          <div class="header-minimalist">
            <h1>Weekly Review</h1>
            <p>Hello ${adminName}</p>
            <p class="header-date">${dateRange.formatted}</p>
          </div>
        `;
      case "modern":
        return `
          <div class="header-modern">
            <div class="header-glow"></div>
            <h1>🚀 Weekly Highlights</h1>
            <p class="header-subtitle">Hey ${adminName}! Your week in data ✨</p>
            <div class="header-badge">${dateRange.formatted}</div>
          </div>
        `;
      default:
        return `<div class="header"><h1>Weekly Digest</h1></div>`;
    }
  };

  // Enhanced CSS with dramatic theme differences
  const getThemeCSS = () => {
    const baseCSS = `
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
        border-radius: ${currentTheme.borderRadius};
        overflow: hidden;
        background: ${currentTheme.cardBackground.includes("gradient") ? currentTheme.cardBackground : currentTheme.cardBackground};
      }
    `;

    const professionalCSS = `
      /* PROFESSIONAL THEME - Corporate, Blocky, Traditional */
      .header-professional {
        ${currentTheme.headerGradient}
        color: white;
        padding: 40px 30px;
        text-align: center;
        position: relative;
        border-top: 5px solid #1e3a8a;
        border-bottom: 3px solid #3b82f6;
      }
      .header-professional h1 {
        margin: 0;
        font-size: 24px;
        font-weight: bold;
        letter-spacing: 2px;
        text-transform: uppercase;
      }
      .header-divider {
        width: 100px;
        height: 3px;
        background: white;
        margin: 15px auto;
      }
      .header-date {
        font-size: 12px;
        letter-spacing: 1px;
        margin-top: 10px;
        opacity: 0.9;
      }
      .metric-card-professional {
        background: white;
        border: 3px solid #e5e7eb;
        border-radius: 0px;
        padding: 25px;
        text-align: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        position: relative;
      }
      .metric-card-professional::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, #1e40af, #3b82f6);
      }
      .metric-card-professional .metric-number {
        font-size: 36px;
        font-weight: bold;
        color: #1e40af;
        font-family: 'Georgia', serif;
      }
      .metric-card-professional .metric-label {
        font-size: 11px;
        font-weight: bold;
        color: #374151;
        letter-spacing: 1px;
        margin: 10px 0;
      }
      .section h2 {
        color: #1e40af;
        font-size: 20px;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 1px;
        border-bottom: 3px solid #1e40af;
        padding-bottom: 10px;
        margin-bottom: 25px;
      }
    `;

    const minimalistCSS = `
      /* MINIMALIST THEME - Clean, Spacious, Subtle */
      .header-minimalist {
        ${currentTheme.headerGradient}
        color: white;
        padding: 50px 40px;
        text-align: left;
      }
      .header-minimalist h1 {
        margin: 0 0 20px 0;
        font-size: 28px;
        font-weight: 300;
        letter-spacing: -0.5px;
      }
      .header-minimalist p {
        margin: 5px 0;
        font-weight: 300;
        opacity: 0.9;
      }
      .header-date {
        font-size: 14px;
        margin-top: 15px;
        opacity: 0.7;
      }
      .metric-card-minimalist {
        background: white;
        border: 1px solid #f3f4f6;
        border-radius: 2px;
        padding: 30px 20px;
        text-align: center;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        transition: all 0.3s ease;
      }
      .metric-card-minimalist:hover {
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        transform: translateY(-2px);
      }
      .metric-card-minimalist .metric-number {
        font-size: 32px;
        font-weight: 600;
        color: #374151;
        margin-bottom: 15px;
      }
      .metric-card-minimalist .metric-label {
        font-size: 12px;
        font-weight: 500;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 10px;
      }
      .section h2 {
        color: #374151;
        font-size: 22px;
        font-weight: 400;
        border-bottom: 1px solid #e5e7eb;
        padding-bottom: 15px;
        margin-bottom: 30px;
      }
    `;

    const modernCSS = `
      /* MODERN THEME - Bold, Animated, Vibrant */
      .header-modern {
        ${currentTheme.headerGradient}
        color: white;
        padding: 50px 30px;
        text-align: center;
        position: relative;
        overflow: hidden;
        border-radius: 16px 16px 0 0;
      }
      .header-glow {
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
        animation: pulse 4s ease-in-out infinite;
      }
      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 0.5; }
        50% { transform: scale(1.1); opacity: 0.8; }
      }
      .header-modern h1 {
        margin: 0;
        font-size: 32px;
        font-weight: 700;
        background: linear-gradient(45deg, #ffffff, #f0f9ff);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        position: relative;
        z-index: 2;
      }
      .header-subtitle {
        font-size: 18px;
        margin: 15px 0;
        font-weight: 400;
        position: relative;
        z-index: 2;
      }
      .header-badge {
        display: inline-block;
        background: rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 25px;
        padding: 8px 20px;
        font-size: 14px;
        font-weight: 500;
        margin-top: 10px;
        position: relative;
        z-index: 2;
      }
      .metric-card-modern {
        background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
        border: 1px solid rgba(139, 92, 246, 0.1);
        border-radius: 16px;
        padding: 25px;
        text-align: center;
        box-shadow: 0 8px 32px rgba(139, 92, 246, 0.1);
        position: relative;
        overflow: hidden;
        transition: all 0.3s ease;
      }
      .metric-card-modern::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.1), transparent);
        transition: left 0.5s ease;
      }
      .metric-card-modern:hover::before {
        left: 100%;
      }
      .metric-card-modern:hover {
        transform: translateY(-5px);
        box-shadow: 0 12px 40px rgba(139, 92, 246, 0.2);
      }
      .metric-card-modern .metric-number {
        font-size: 38px;
        font-weight: 800;
        background: linear-gradient(135deg, #7c3aed, #ec4899);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 10px;
        position: relative;
        z-index: 2;
      }
      .metric-card-modern .metric-label {
        font-size: 12px;
        font-weight: 600;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 8px;
        position: relative;
        z-index: 2;
      }
      .section h2 {
        color: #7c3aed;
        font-size: 24px;
        font-weight: 700;
        background: linear-gradient(135deg, #7c3aed, #ec4899);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        border-bottom: 2px solid transparent;
        border-image: linear-gradient(135deg, #7c3aed, #ec4899) 1;
        padding-bottom: 12px;
        margin-bottom: 25px;
      }
    `;

    // Combine all CSS
    return `
      ${baseCSS}
      ${selectedTheme === "professional" ? professionalCSS : ""}
      ${selectedTheme === "minimalist" ? minimalistCSS : ""}
      ${selectedTheme === "modern" ? modernCSS : ""}
      
      /* Common styles */
      .content {
        padding: ${currentTheme.spacing === "tight" ? "25px" : currentTheme.spacing === "spacious" ? "40px" : "30px"};
        background: ${currentTheme.cardBackground.includes("gradient") ? "transparent" : currentTheme.cardBackground};
      }
      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: ${currentTheme.spacing === "tight" ? "15px" : currentTheme.spacing === "spacious" ? "30px" : "20px"};
        margin: 30px 0;
      }
      .section {
        margin: 40px 0;
      }
      .button {
        display: inline-block;
        background: ${currentTheme.primaryColor};
        color: white;
        padding: 12px 24px;
        border-radius: ${currentTheme.borderRadius};
        text-decoration: none;
        font-weight: 600;
        margin: 10px 5px;
        ${selectedTheme === "modern" ? "box-shadow: 0 4px 16px rgba(124, 58, 237, 0.3); transition: all 0.3s ease;" : ""}
      }
      ${selectedTheme === "modern" ? ".button:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(124, 58, 237, 0.4); }" : ""}
      .footer {
        background: ${selectedTheme === "minimalist" ? "#f9fafb" : selectedTheme === "modern" ? "linear-gradient(135deg, #f3f4f6, #e5e7eb)" : "#f7fafc"};
        padding: 30px;
        text-align: center;
        color: #718096;
        font-size: 14px;
        ${selectedTheme === "modern" ? "border-radius: 0 0 16px 16px;" : ""}
      }
      @media (max-width: 600px) {
        .metrics-grid { grid-template-columns: repeat(2, 1fr); }
        .content { padding: 20px; }
      }
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
        ${getThemeCSS()}
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

            <!-- Top Performing Jobs Section -->
            ${
              isEnabled("jobMetrics", "topJobs") && insights.topJobs && insights.topJobs.length > 0
                ? `
            <div class="section">
                <h2>${selectedTheme === "modern" ? "🏆✨" : "🏆"} Top Performing Jobs</h2>
                <div style="background: ${selectedTheme === "minimalist" ? "#f9fafb" : selectedTheme === "modern" ? "linear-gradient(145deg, #ffffff, #f8fafc)" : "#f8fafc"}; border-radius: ${currentTheme.borderRadius}; padding: 20px; margin: 20px 0; ${selectedTheme === "modern" ? "box-shadow: 0 4px 16px rgba(0,0,0,0.1);" : ""}">
                    ${insights.topJobs.slice(0, 5).map((job, index) => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: ${index < 4 ? '1px solid #e2e8f0' : 'none'};">
                            <div style="flex: 1;">
                                <div style="font-weight: 600; color: ${currentTheme.textColor}; font-size: 14px;">${job.title}</div>
                                <div style="color: #718096; font-size: 12px; margin-top: 2px;">${job.department}</div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-weight: 600; color: ${currentTheme.primaryColor}; font-size: 16px;">${job.weeklyApplications}</div>
                                <div style="color: #718096; font-size: 11px;">applications</div>
                                <div style="color: #10b981; font-size: 11px;">${job.conversionRate}% conversion</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            `
                : ""
            }

            <!-- Low Performing Jobs Section -->
            ${
              isEnabled("jobMetrics", "lowJobs") && insights.lowPerformingJobs && insights.lowPerformingJobs.length > 0
                ? `
            <div class="section">
                <h2>${selectedTheme === "modern" ? "⚠️✨" : "⚠️"} Jobs Needing Attention</h2>
                <div style="background: ${selectedTheme === "minimalist" ? "#fef2f2" : selectedTheme === "modern" ? "linear-gradient(145deg, #fef2f2, #fecaca)" : "#fef2f2"}; border-radius: ${currentTheme.borderRadius}; padding: 20px; margin: 20px 0; border-left: 4px solid #ef4444; ${selectedTheme === "modern" ? "box-shadow: 0 4px 16px rgba(239,68,68,0.1);" : ""}">
                    <p style="color: #991b1b; font-size: 14px; margin-bottom: 15px; font-weight: 500;">These jobs have received fewer than expected applications and may need promotion or review:</p>
                    ${insights.lowPerformingJobs.slice(0, 5).map((job, index) => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: ${index < 4 ? '1px solid #fecaca' : 'none'};">
                            <div style="flex: 1;">
                                <div style="font-weight: 600; color: #991b1b; font-size: 14px;">${job.title}</div>
                                <div style="color: #dc2626; font-size: 12px; margin-top: 2px;">${job.department} • ${job.daysLive} days live</div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-weight: 600; color: #ef4444; font-size: 16px;">${job.applications}</div>
                                <div style="color: #dc2626; font-size: 11px;">${job.views} views</div>
                                <div style="color: #dc2626; font-size: 11px;">${job.conversionRate}% conversion</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            `
                : ""
            }

            <!-- Jobs by Department Section -->
            ${
              isEnabled("jobMetrics", "jobsByDepartment") && insights.departmentStats && insights.departmentStats.length > 0
                ? `
            <div class="section">
                <h2>${selectedTheme === "modern" ? "🏢✨" : "🏢"} Applications by Department</h2>
                <div style="background: ${selectedTheme === "minimalist" ? "#f9fafb" : selectedTheme === "modern" ? "linear-gradient(145deg, #ffffff, #f8fafc)" : "#f8fafc"}; border-radius: ${currentTheme.borderRadius}; padding: 20px; margin: 20px 0; ${selectedTheme === "modern" ? "box-shadow: 0 4px 16px rgba(0,0,0,0.1);" : ""}">
                    ${insights.departmentStats.map((dept, index) => {
                        const maxApps = Math.max(...insights.departmentStats.map(d => d.applications));
                        const percentage = maxApps > 0 ? (dept.applications / maxApps) * 100 : 0;
                        return `
                        <div style="margin: 15px 0;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                <span style="font-weight: 600; color: ${currentTheme.textColor}; font-size: 14px;">${dept.department}</span>
                                <span style="font-weight: 600; color: ${currentTheme.primaryColor}; font-size: 16px;">${dept.applications}</span>
                            </div>
                            <div style="background: #e2e8f0; border-radius: ${selectedTheme === "professional" ? "0px" : "4px"}; height: 8px; overflow: hidden;">
                                <div style="background: ${selectedTheme === "modern" ? "linear-gradient(90deg, #7c3aed, #ec4899)" : currentTheme.primaryColor}; height: 100%; width: ${percentage}%; border-radius: ${selectedTheme === "professional" ? "0px" : "4px"};"></div>
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
            </div>
            `
                : ""
            }

            <!-- Featured Jobs Performance Section -->
            ${
              isEnabled("jobMetrics", "featuredJobs") && summary.jobs && summary.jobs.thisWeek.featured > 0
                ? `
            <div class="section">
                <h2>${selectedTheme === "modern" ? "⭐✨" : "⭐"} Featured Jobs Performance</h2>
                <div style="background: ${selectedTheme === "minimalist" ? "#fefbf3" : selectedTheme === "modern" ? "linear-gradient(145deg, #fefbf3, #fde68a)" : "#fefbf3"}; border-radius: ${currentTheme.borderRadius}; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b; ${selectedTheme === "modern" ? "box-shadow: 0 4px 16px rgba(245,158,11,0.1);" : ""}">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-size: 24px; font-weight: bold; color: #d97706; margin-bottom: 5px;">${summary.jobs.thisWeek.featured}</div>
                            <div style="color: #92400e; font-size: 14px; font-weight: 500;">Featured Jobs This Week</div>
                            ${summary.jobs.previousWeek.featured ? `
                                <div style="color: #b45309; font-size: 12px; margin-top: 5px;">
                                    ${summary.jobs.thisWeek.featured - summary.jobs.previousWeek.featured > 0 ? '+' : ''}${summary.jobs.thisWeek.featured - summary.jobs.previousWeek.featured} from last week
                                </div>
                            ` : ''}
                        </div>
                        <div style="text-align: right;">
                            <div style="color: #92400e; font-size: 12px;">Premium visibility boost</div>
                            <div style="color: #b45309; font-size: 11px; margin-top: 2px;">Increased exposure & applications</div>
                        </div>
                    </div>
                </div>
            </div>
            `
                : ""
            }

            <!-- User Growth Chart Section -->
            ${
              isEnabled("userMetrics", "userGrowth") && insights.userGrowthData && insights.userGrowthData.length > 0
                ? `
            <div class="section">
                <h2>${selectedTheme === "modern" ? "📈✨" : "📈"} User Growth Trend</h2>
                <div style="background: ${selectedTheme === "minimalist" ? "#f0fdf4" : selectedTheme === "modern" ? "linear-gradient(145deg, #f0fdf4, #dcfce7)" : "#f0fdf4"}; border-radius: ${currentTheme.borderRadius}; padding: 20px; margin: 20px 0; border-left: 4px solid #22c55e; ${selectedTheme === "modern" ? "box-shadow: 0 4px 16px rgba(34,197,94,0.1);" : ""}">
                    <div style="display: flex; justify-content: space-between; align-items: end; height: 80px; margin: 20px 0; padding: 0 10px; border-bottom: 1px solid #bbf7d0;">
                        ${insights.userGrowthData.map((week, index) => {
                            const maxRegistrations = Math.max(...insights.userGrowthData.map(w => w.registrations));
                            const height = maxRegistrations > 0 ? Math.max(4, (week.registrations / maxRegistrations) * 60) : 4;
                            return `
                            <div style="flex: 1; margin: 0 2px; text-align: center;">
                                <div style="font-size: 12px; color: #166534; font-weight: 600; margin-bottom: 2px;">${week.registrations}</div>
                                <div style="background: ${selectedTheme === "modern" ? "linear-gradient(to top, #22c55e, #10b981)" : "#22c55e"}; border-radius: ${selectedTheme === "professional" ? "0px" : "2px"}; margin-bottom: 5px; min-height: 4px; height: ${height}px;"></div>
                                <div style="font-size: 10px; color: #16a34a; font-weight: 500;">${week.week}</div>
                            </div>
                            `;
                        }).join('')}
                    </div>
                    <p style="margin: 10px 0 0 0; color: #16a34a; font-size: 12px; text-align: center;">
                        4-week user registration trend
                    </p>
                </div>
            </div>
            `
                : ""
            }

            <!-- Users by Role Section -->
            ${
              isEnabled("userMetrics", "usersByRole") && insights.usersByRole && insights.usersByRole.length > 0
                ? `
            <div class="section">
                <h2>${selectedTheme === "modern" ? "👥✨" : "👥"} New Users by Role</h2>
                <div style="background: ${selectedTheme === "minimalist" ? "#f9fafb" : selectedTheme === "modern" ? "linear-gradient(145deg, #ffffff, #f8fafc)" : "#f8fafc"}; border-radius: ${currentTheme.borderRadius}; padding: 20px; margin: 20px 0; ${selectedTheme === "modern" ? "box-shadow: 0 4px 16px rgba(0,0,0,0.1);" : ""}">
                    ${insights.usersByRole.map((roleData, index) => {
                        const maxCount = Math.max(...insights.usersByRole.map(r => r.count));
                        const percentage = maxCount > 0 ? (roleData.count / maxCount) * 100 : 0;
                        const roleNames = {
                            'job_seeker': 'Job Seekers',
                            'employer': 'Employers',
                            'hr': 'HR Personnel',
                            'admin': 'Administrators'
                        };
                        const roleName = roleNames[roleData.role] || roleData.role;
                        return `
                        <div style="margin: 15px 0;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                <span style="font-weight: 600; color: ${currentTheme.textColor}; font-size: 14px;">${roleName}</span>
                                <span style="font-weight: 600; color: ${currentTheme.primaryColor}; font-size: 16px;">${roleData.count}</span>
                            </div>
                            <div style="background: #e2e8f0; border-radius: ${selectedTheme === "professional" ? "0px" : "4px"}; height: 8px; overflow: hidden;">
                                <div style="background: ${selectedTheme === "modern" ? "linear-gradient(90deg, #3b82f6, #06b6d4)" : currentTheme.primaryColor}; height: 100%; width: ${percentage}%; border-radius: ${selectedTheme === "professional" ? "0px" : "4px"};"></div>
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
            </div>
            `
                : ""
            }

            <!-- Daily Registration Trends Section -->
            ${
              isEnabled("userMetrics", "registrationTrends") && insights.dailyRegistrations && insights.dailyRegistrations.length > 0
                ? `
            <div class="section">
                <h2>${selectedTheme === "modern" ? "📊✨" : "📊"} Daily Registration Activity</h2>
                <div style="background: ${selectedTheme === "minimalist" ? "#f0f9ff" : selectedTheme === "modern" ? "linear-gradient(145deg, #f0f9ff, #e0f2fe)" : "#f0f9ff"}; border-radius: ${currentTheme.borderRadius}; padding: 20px; margin: 20px 0; text-align: center; ${selectedTheme === "modern" ? "box-shadow: 0 4px 16px rgba(0,0,0,0.1);" : ""}">
                    <div style="display: flex; justify-content: space-between; align-items: end; height: 100px; margin: 20px 0; padding: 0 10px; border-bottom: 1px solid #bae6fd;">
                        ${insights.dailyRegistrations.map((day) => {
                            const maxRegistrations = Math.max(...insights.dailyRegistrations.map(d => d.registrations));
                            const height = maxRegistrations > 0 ? Math.max(4, (day.registrations / maxRegistrations) * 80) : 4;
                            return `
                            <div style="flex: 1; margin: 0 2px; text-align: center;">
                                <div style="font-size: 12px; color: #0369a1; font-weight: 600; margin-bottom: 2px;">${day.registrations}</div>
                                <div style="background: ${selectedTheme === "modern" ? "linear-gradient(to top, #0369a1, #0284c7)" : "#0369a1"}; border-radius: ${selectedTheme === "professional" ? "0px" : "2px"}; margin-bottom: 5px; min-height: 4px; height: ${height}px;"></div>
                                <div style="font-size: 11px; color: #0284c7; font-weight: 500;">${day.date}</div>
                            </div>
                            `;
                        }).join('')}
                    </div>
                    <p style="margin: 10px 0 0 0; color: #0284c7; font-size: 12px;">
                        Total: ${insights.dailyRegistrations.reduce((sum, day) => sum + day.registrations, 0)} new registrations this week
                    </p>
                </div>
            </div>
            `
                : ""
            }

            <!-- Application Trends Section -->
            ${
              isEnabled("applicationData", "appTrends") && summary.applications
                ? `
            <div class="section">
                <h2>${selectedTheme === "modern" ? "📊✨" : "📊"} Application Trends</h2>
                <div style="background: ${selectedTheme === "minimalist" ? "#f8fafc" : selectedTheme === "modern" ? "linear-gradient(145deg, #ffffff, #f8fafc)" : "#f8fafc"}; border-radius: ${currentTheme.borderRadius}; padding: 20px; margin: 20px 0; ${selectedTheme === "modern" ? "box-shadow: 0 4px 16px rgba(0,0,0,0.1);" : ""}">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <div>
                            <div style="font-size: 28px; font-weight: bold; color: ${currentTheme.primaryColor}; margin-bottom: 5px;">
                                ${summary.applications.thisWeek.total}
                            </div>
                            <div style="color: ${currentTheme.mutedColor}; font-size: 14px;">Applications This Week</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 18px; font-weight: 600; color: ${summary.applications.change.totalPercent >= 0 ? '#059669' : '#dc2626'}; margin-bottom: 5px;">
                                ${summary.applications.change.totalPercent >= 0 ? '↗️' : '↘️'} ${Math.abs(summary.applications.change.totalPercent)}%
                            </div>
                            <div style="color: ${currentTheme.mutedColor}; font-size: 12px;">vs. Last Week</div>
                        </div>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; padding-top: 15px; border-top: 1px solid #e2e8f0;">
                        <div style="text-align: center; flex: 1;">
                            <div style="font-size: 16px; font-weight: bold; color: ${currentTheme.textColor};">Previous Week</div>
                            <div style="font-size: 14px; color: ${currentTheme.mutedColor}; margin-top: 5px;">${summary.applications.previousWeek.total} applications</div>
                        </div>
                        <div style="text-align: center; flex: 1; border-left: 1px solid #e2e8f0; padding-left: 20px;">
                            <div style="font-size: 16px; font-weight: bold; color: ${currentTheme.textColor};">Change</div>
                            <div style="font-size: 14px; color: ${summary.applications.change.total >= 0 ? '#059669' : '#dc2626'}; margin-top: 5px;">
                                ${summary.applications.change.total >= 0 ? '+' : ''}${summary.applications.change.total} applications
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            `
                : ""
            }

            <!-- Rest of sections remain the same but will use theme-specific styling -->
            ${
              isEnabled("applicationData", "dailyBreakdown") &&
              insights.dailyApplications
                ? `
            <div class="section">
                <h2>${selectedTheme === "modern" ? "📈✨" : "📈"} Daily Application Activity</h2>
                <div style="background: ${selectedTheme === "minimalist" ? "#f9fafb" : selectedTheme === "modern" ? "linear-gradient(145deg, #ffffff, #f8fafc)" : "#f8fafc"}; border-radius: ${currentTheme.borderRadius}; padding: 20px; margin: 20px 0; text-align: center; ${selectedTheme === "modern" ? "box-shadow: 0 4px 16px rgba(0,0,0,0.1);" : ""}">
                    <div style="display: flex; justify-content: space-between; align-items: end; height: 100px; margin: 20px 0; padding: 0 10px; border-bottom: 1px solid #e2e8f0;">
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
                            <div style="flex: 1; margin: 0 2px; text-align: center;">
                                <div style="font-size: 12px; color: ${currentTheme.textColor}; font-weight: 600; margin-bottom: 2px;">${day.applications}</div>
                                <div style="background: ${selectedTheme === "modern" ? "linear-gradient(to top, #7c3aed, #ec4899)" : currentTheme.headerGradient.replace("background: ", "")}; border-radius: ${selectedTheme === "professional" ? "0px" : "2px"}; margin-bottom: 5px; min-height: 4px; height: ${height}px;"></div>
                                <div style="font-size: 11px; color: #718096; font-weight: 500;">${day.date}</div>
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

            <!-- System Health Section -->
            ${
              isEnabled("systemHealth", "systemStatus") && systemHealth
                ? `
            <div class="section">
                <h2>${selectedTheme === "modern" ? "🔧✨" : "🔧"} System Status</h2>
                <div style="background: ${
                  systemHealth.systemStatus === 'healthy' 
                    ? selectedTheme === "minimalist" ? "#f0fdf4" : selectedTheme === "modern" ? "linear-gradient(145deg, #f0fdf4, #dcfce7)" : "#f0fdf4"
                    : systemHealth.systemStatus === 'critical'
                    ? selectedTheme === "minimalist" ? "#fef2f2" : selectedTheme === "modern" ? "linear-gradient(145deg, #fef2f2, #fecaca)" : "#fef2f2"
                    : selectedTheme === "minimalist" ? "#fefbf3" : selectedTheme === "modern" ? "linear-gradient(145deg, #fefbf3, #fde68a)" : "#fefbf3"
                }; border-radius: ${currentTheme.borderRadius}; padding: 20px; margin: 20px 0; border-left: 4px solid ${
                  systemHealth.systemStatus === 'healthy' ? '#22c55e' 
                    : systemHealth.systemStatus === 'critical' ? '#ef4444'  
                    : '#f59e0b'
                }; ${selectedTheme === "modern" ? `box-shadow: 0 4px 16px ${
                  systemHealth.systemStatus === 'healthy' ? 'rgba(34,197,94,0.1)' 
                    : systemHealth.systemStatus === 'critical' ? 'rgba(239,68,68,0.1)'
                    : 'rgba(245,158,11,0.1)'
                };` : ""}">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <div>
                            <div style="font-size: 24px; font-weight: bold; color: ${
                              systemHealth.systemStatus === 'healthy' ? '#166534' 
                                : systemHealth.systemStatus === 'critical' ? '#991b1b'
                                : '#92400e'
                            }; text-transform: uppercase; margin-bottom: 5px;">
                                ${systemHealth.systemStatus === 'healthy' ? '✅ HEALTHY' 
                                  : systemHealth.systemStatus === 'critical' ? '🚨 CRITICAL'
                                  : systemHealth.systemStatus === 'degraded' ? '⚠️ DEGRADED'
                                  : '⚡ WARNING'}
                            </div>
                            <div style="color: ${
                              systemHealth.systemStatus === 'healthy' ? '#16a34a' 
                                : systemHealth.systemStatus === 'critical' ? '#dc2626'
                                : '#d97706'
                            }; font-size: 14px; font-weight: 500;">${systemHealth.statusReason}</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 12px; color: #6b7280;">System Overview</div>
                            <div style="font-size: 11px; color: #9ca3af; margin-top: 2px;">${systemHealth.activeJobs} active jobs, ${systemHealth.totalUsers} users</div>
                        </div>
                    </div>
                    
                    ${systemHealth.emailPerformance ? `
                        <div style="border-top: 1px solid ${
                          systemHealth.systemStatus === 'healthy' ? '#bbf7d0' 
                            : systemHealth.systemStatus === 'critical' ? '#fecaca'
                            : '#fde68a'
                        }; padding-top: 15px; margin-top: 15px;">
                            <div style="font-weight: 600; color: ${currentTheme.textColor}; font-size: 14px; margin-bottom: 10px;">📧 Email Performance</div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div style="flex: 1; text-align: center;">
                                    <div style="font-size: 18px; font-weight: bold; color: ${currentTheme.primaryColor};">${systemHealth.emailPerformance.total}</div>
                                    <div style="font-size: 12px; color: #6b7280;">Total Sent</div>
                                </div>
                                <div style="flex: 1; text-align: center;">
                                    <div style="font-size: 18px; font-weight: bold; color: #22c55e;">${systemHealth.emailPerformance.successRate}%</div>
                                    <div style="font-size: 12px; color: #6b7280;">Success Rate</div>
                                </div>
                                <div style="flex: 1; text-align: center;">
                                    <div style="font-size: 18px; font-weight: bold; color: ${systemHealth.emailPerformance.failed > 0 ? '#ef4444' : '#6b7280'};">${systemHealth.emailPerformance.failed}</div>
                                    <div style="font-size: 12px; color: #6b7280;">Failed</div>
                                </div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
            `
                : ""
            }

            <!-- Error Summary Section -->
            ${
              isEnabled("systemHealth", "errorSummary") && systemHealth?.errorSummary && (systemHealth.errorSummary.errors > 0 || systemHealth.errorSummary.warnings > 0)
                ? `
            <div class="section">
                <h2>${selectedTheme === "modern" ? "⚠️✨" : "⚠️"} Error Summary</h2>
                <div style="background: ${selectedTheme === "minimalist" ? "#fef2f2" : selectedTheme === "modern" ? "linear-gradient(145deg, #fef2f2, #fecaca)" : "#fef2f2"}; border-radius: ${currentTheme.borderRadius}; padding: 20px; margin: 20px 0; border-left: 4px solid #ef4444; ${selectedTheme === "modern" ? "box-shadow: 0 4px 16px rgba(239,68,68,0.1);" : ""}">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <div style="font-weight: 600; color: #991b1b; font-size: 16px;">
                            System Issues This Week
                        </div>
                        <div style="font-size: 12px; color: #dc2626;">
                            ${systemHealth.errorSummary.errorRate}% error rate
                        </div>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                        <div style="text-align: center; flex: 1;">
                            <div style="font-size: 20px; font-weight: bold; color: #dc2626;">${systemHealth.errorSummary.critical}</div>
                            <div style="font-size: 12px; color: #991b1b;">Critical</div>
                        </div>
                        <div style="text-align: center; flex: 1;">
                            <div style="font-size: 20px; font-weight: bold; color: #ea580c;">${systemHealth.errorSummary.errors}</div>
                            <div style="font-size: 12px; color: #c2410c;">Errors</div>
                        </div>
                        <div style="text-align: center; flex: 1;">
                            <div style="font-size: 20px; font-weight: bold; color: #d97706;">${systemHealth.errorSummary.warnings}</div>
                            <div style="font-size: 12px; color: #b45309;">Warnings</div>
                        </div>
                    </div>
                    
                    ${systemHealth.errorSummary.recentErrors && systemHealth.errorSummary.recentErrors.length > 0 ? `
                        <div style="border-top: 1px solid #fecaca; padding-top: 15px;">
                            <div style="font-weight: 600; color: #991b1b; font-size: 14px; margin-bottom: 10px;">Recent Issues:</div>
                            ${systemHealth.errorSummary.recentErrors.slice(0, 5).map(error => `
                                <div style="margin-bottom: 8px; padding: 8px; background: rgba(254, 202, 202, 0.5); border-radius: 4px;">
                                    <div style="display: flex; justify-content: between; align-items: center;">
                                        <span style="font-size: 11px; color: #991b1b; font-weight: bold; text-transform: uppercase; margin-right: 8px;">${error.severity}</span>
                                        <span style="font-size: 12px; color: #7f1d1d; flex: 1;">${error.action}</span>
                                        <span style="font-size: 10px; color: #b91c1c;">${error.date}</span>
                                    </div>
                                    ${error.description && error.description !== 'No description' ? `
                                        <div style="font-size: 11px; color: #dc2626; margin-top: 4px; font-style: italic;">${error.description}</div>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
            `
                : ""
            }

            <!-- Quick Actions with theme-specific styling -->
            <div style="text-align: center; margin: 40px 0;">
                <a href="${adminUrl}/admin/dashboard" class="button">
                    ${selectedTheme === "modern" ? "📊✨" : "📊"} View Full Dashboard
                </a>
                <a href="${adminUrl}/admin/applications" class="button">
                    ${selectedTheme === "modern" ? "📋💫" : "📋"} Review Applications
                </a>
                <a href="${adminUrl}/admin/jobs" class="button">
                    ${selectedTheme === "modern" ? "💼🚀" : "💼"} Manage Jobs
                </a>
            </div>
        </div>

        <div class="footer">
            <p>
                This digest was generated on ${digestData.generatedAt.toLocaleString()}<br>
                <a href="${adminUrl}/admin/weekly-digest" style="color: ${currentTheme.accentColor}; text-decoration: none; font-weight: 600;">Update digest preferences</a>
            </p>
            <p style="font-size: 12px; margin-top: 15px; color: #a0aec0;">
                ${siteName} Weekly Digest • ${selectedTheme.charAt(0).toUpperCase() + selectedTheme.slice(1)} Theme ${selectedTheme === "modern" ? "✨" : ""}
            </p>
        </div>
    </div>
</body>
</html>
  `;
}
