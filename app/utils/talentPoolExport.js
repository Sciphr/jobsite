// app/utils/talentPoolExport.js
import * as XLSX from "xlsx";

/**
 * Export talent pool candidates to Excel
 */
export const exportTalentPoolToExcel = (candidates, filters = {}) => {
  // Prepare data for export
  const exportData = candidates.map((candidate) => ({
    "Name": candidate.name || `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim(),
    "Email": candidate.email,
    "Current Title": candidate.current_title || candidate.currentTitle || "-",
    "Current Company": candidate.current_company || candidate.currentCompany || "-",
    "Location": candidate.location || "-",
    "Years Experience": candidate.years_experience || candidate.yearsExperience || 0,
    "Available": candidate.available_for_opportunities || candidate.availableForOpportunities ? "Yes" : "No",
    "Skills": Array.isArray(candidate.skills) ? candidate.skills.join(", ") : "-",
    "Bio": candidate.bio || "-",
    "LinkedIn": candidate.linkedin_url || candidate.linkedinUrl || "-",
    "Portfolio": candidate.portfolio_url || candidate.portfolioUrl || "-",
    "Total Applications": candidate.applicationCount || 0,
    "Total Interactions": candidate.interactionCount || 0,
    "Active Invitations": candidate.activeInvitationCount || 0,
    "Last Profile Update": candidate.last_profile_update || candidate.lastProfileUpdate
      ? new Date(candidate.last_profile_update || candidate.lastProfileUpdate).toLocaleDateString()
      : "-",
  }));

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(exportData);

  // Set column widths
  const colWidths = [
    { wch: 25 }, // Name
    { wch: 30 }, // Email
    { wch: 25 }, // Current Title
    { wch: 25 }, // Current Company
    { wch: 20 }, // Location
    { wch: 15 }, // Years Experience
    { wch: 10 }, // Available
    { wch: 50 }, // Skills
    { wch: 50 }, // Bio
    { wch: 30 }, // LinkedIn
    { wch: 30 }, // Portfolio
    { wch: 18 }, // Total Applications
    { wch: 18 }, // Total Interactions
    { wch: 18 }, // Active Invitations
    { wch: 20 }, // Last Profile Update
  ];
  ws["!cols"] = colWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, "Talent Pool");

  // Add metadata sheet with filter info
  const metadata = [
    ["Export Date", new Date().toLocaleString()],
    ["Total Candidates", candidates.length],
    ["Filters Applied", ""],
  ];

  if (filters.search) metadata.push(["Search Term", filters.search]);
  if (filters.skills) metadata.push(["Skills Filter", filters.skills]);
  if (filters.location) metadata.push(["Location Filter", filters.location]);
  if (filters.available === true) metadata.push(["Available Only", "Yes"]);

  const metaWs = XLSX.utils.aoa_to_sheet(metadata);
  metaWs["!cols"] = [{ wch: 20 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, metaWs, "Export Info");

  // Generate filename with timestamp
  const date = new Date();
  const timestamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}_${String(date.getHours()).padStart(2, "0")}${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
  const filename = `talent-pool_${timestamp}.xlsx`;

  // Write and download
  XLSX.writeFile(wb, filename);
};

/**
 * Export talent pool candidates to CSV
 */
export const exportTalentPoolToCSV = (candidates, filters = {}) => {
  // Prepare CSV headers
  const headers = [
    "Name",
    "Email",
    "Current Title",
    "Current Company",
    "Location",
    "Years Experience",
    "Available",
    "Skills",
    "Bio",
    "LinkedIn",
    "Portfolio",
    "Total Applications",
    "Total Interactions",
    "Active Invitations",
    "Last Profile Update",
  ];

  // Prepare data rows
  const rows = candidates.map((candidate) => [
    candidate.name || `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim(),
    candidate.email,
    candidate.current_title || candidate.currentTitle || "",
    candidate.current_company || candidate.currentCompany || "",
    candidate.location || "",
    candidate.years_experience || candidate.yearsExperience || 0,
    candidate.available_for_opportunities || candidate.availableForOpportunities ? "Yes" : "No",
    Array.isArray(candidate.skills) ? candidate.skills.join("; ") : "",
    (candidate.bio || "").replace(/[\n\r,]/g, " "), // Clean bio for CSV
    candidate.linkedin_url || candidate.linkedinUrl || "",
    candidate.portfolio_url || candidate.portfolioUrl || "",
    candidate.applicationCount || 0,
    candidate.interactionCount || 0,
    candidate.activeInvitationCount || 0,
    candidate.last_profile_update || candidate.lastProfileUpdate
      ? new Date(candidate.last_profile_update || candidate.lastProfileUpdate).toLocaleDateString()
      : "",
  ]);

  // Convert to CSV format
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row
        .map((cell) => {
          // Escape quotes and wrap in quotes if contains comma or quote
          const cellStr = String(cell);
          if (cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n")) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        })
        .join(",")
    ),
  ].join("\n");

  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  // Generate filename with timestamp
  const date = new Date();
  const timestamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}_${String(date.getHours()).padStart(2, "0")}${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
  const filename = `talent-pool_${timestamp}.csv`;

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export selected candidates with additional details
 */
export const exportSelectedCandidates = (candidates, format = "excel") => {
  if (!candidates || candidates.length === 0) {
    alert("No candidates selected for export");
    return;
  }

  if (format === "excel") {
    exportTalentPoolToExcel(candidates, { selectedOnly: true });
  } else if (format === "csv") {
    exportTalentPoolToCSV(candidates, { selectedOnly: true });
  }
};