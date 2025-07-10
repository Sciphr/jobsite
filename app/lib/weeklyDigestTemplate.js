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
