/**
 * Term Report Export Utilities
 * Handles PDF and CSV export of term reports
 * Ensures no student/teacher names are included
 */

import { TermReport, FEATURE_LABELS } from "@/hooks/useTermReports";
import { format } from "date-fns";

// Generate CSV content from report
export function generateReportCSV(report: TermReport): string {
  const lines: string[] = [];
  
  // Header
  lines.push("School Term Report - Aggregated Data Only");
  lines.push(`Report: ${report.term_name}`);
  lines.push(`Academic Year: ${report.academic_year}`);
  lines.push(`Period: ${format(new Date(report.start_date), "MMM d, yyyy")} - ${format(new Date(report.end_date), "MMM d, yyyy")}`);
  lines.push(`Status: ${report.status}`);
  lines.push(`Generated: ${report.generated_at ? format(new Date(report.generated_at), "PPp") : "N/A"}`);
  lines.push("");
  
  // Section A: System Adoption
  lines.push("SECTION A: SYSTEM ACTIVITY OVERVIEW");
  lines.push("Metric,Count");
  lines.push(`Teachers Using Platform,${report.active_teachers_count}`);
  lines.push(`Active Classes,${report.active_classes_count}`);
  lines.push(`Uploads Analyzed,${report.uploads_analyzed_count}`);
  lines.push(`AI Suggestions Viewed,${report.ai_suggestions_used_count}`);
  lines.push(`Family Updates Prepared,${report.parent_insights_count}`);
  lines.push(`Support Plans Created,${report.support_plans_count}`);
  lines.push("");
  
  // Section B: Learning Support Activity
  lines.push("SECTION B: LEARNING SUPPORT ACTIVITY");
  lines.push("Metric,Count");
  lines.push(`Adaptive Plans Generated,${report.adaptive_plans_generated}`);
  lines.push(`Family Updates Approved,${report.parent_insights_approved}`);
  lines.push("");
  
  if (report.common_subjects_engaged.length > 0) {
    lines.push("Subject Areas Engaged");
    report.common_subjects_engaged.forEach(subject => {
      lines.push(subject);
    });
    lines.push("");
  }
  
  // Section C: Feature Engagement
  lines.push("SECTION C: FEATURE ENGAGEMENT");
  
  if (report.most_used_features.length > 0) {
    lines.push("Most Used Features");
    lines.push("Feature,Usage Count");
    report.most_used_features.forEach(f => {
      lines.push(`${FEATURE_LABELS[f.feature] || f.label},${f.count}`);
    });
    lines.push("");
  }
  
  if (report.least_used_features.length > 0) {
    lines.push("Emerging Opportunities");
    lines.push("Feature,Usage Count");
    report.least_used_features.forEach(f => {
      lines.push(`${FEATURE_LABELS[f.feature] || f.label},${f.count}`);
    });
    lines.push("");
  }
  
  // Footer
  lines.push("");
  lines.push("NOTE: This report contains aggregated data only.");
  lines.push("No individual teacher or student information is included.");
  
  return lines.join("\n");
}

// Download CSV file
export function downloadReportCSV(report: TermReport) {
  const csv = generateReportCSV(report);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `term-report-${report.term_name.replace(/\s+/g, "-").toLowerCase()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Generate printable HTML for PDF export
export function generateReportHTML(report: TermReport, schoolName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${report.term_name} - System Activity Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
      color: #1a1a1a;
    }
    h1 { font-size: 24px; margin-bottom: 8px; }
    h2 { font-size: 18px; margin-top: 32px; margin-bottom: 16px; border-bottom: 1px solid #e5e5e5; padding-bottom: 8px; }
    h3 { font-size: 14px; color: #666; margin-bottom: 12px; }
    .header { margin-bottom: 32px; }
    .meta { color: #666; font-size: 14px; }
    .metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
    .metric-card { padding: 16px; background: #f9f9f9; border-radius: 8px; }
    .metric-label { font-size: 12px; color: #666; margin-bottom: 4px; }
    .metric-value { font-size: 24px; font-weight: 600; }
    .badge { display: inline-block; padding: 4px 12px; background: #e5e5e5; border-radius: 4px; font-size: 12px; margin-right: 8px; }
    .feature-row { display: flex; justify-content: space-between; padding: 12px 16px; background: #f9f9f9; border-radius: 6px; margin-bottom: 8px; }
    .note { padding: 16px; background: #f0f7ff; border-radius: 8px; margin-top: 32px; font-size: 14px; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #666; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${schoolName}</h1>
    <p class="meta">${report.term_name} • Academic Year ${report.academic_year}</p>
    <p class="meta">${format(new Date(report.start_date), "MMMM d, yyyy")} – ${format(new Date(report.end_date), "MMMM d, yyyy")}</p>
  </div>
  
  <h2>System Activity Overview</h2>
  <p style="color: #666; font-size: 14px; margin-bottom: 16px;">Observed usage patterns for this term</p>
  <div class="metrics-grid">
    <div class="metric-card">
      <div class="metric-label">Teachers Using Platform</div>
      <div class="metric-value">${report.active_teachers_count}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Active Classes</div>
      <div class="metric-value">${report.active_classes_count}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Uploads Analyzed</div>
      <div class="metric-value">${report.uploads_analyzed_count}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">AI Suggestions Viewed</div>
      <div class="metric-value">${report.ai_suggestions_used_count}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Family Updates Prepared</div>
      <div class="metric-value">${report.parent_insights_count}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Support Plans Created</div>
      <div class="metric-value">${report.support_plans_count}</div>
    </div>
  </div>
  
  <h2>Learning Support Activity</h2>
  <div class="metrics-grid" style="grid-template-columns: repeat(2, 1fr);">
    <div class="metric-card">
      <div class="metric-label">Adaptive Support Plans Generated</div>
      <div class="metric-value">${report.adaptive_plans_generated}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Family Updates Approved</div>
      <div class="metric-value">${report.parent_insights_approved}</div>
    </div>
  </div>
  
  ${report.common_subjects_engaged.length > 0 ? `
  <h3>Subject Areas Engaged</h3>
  <div style="margin-bottom: 24px;">
    ${report.common_subjects_engaged.map(s => `<span class="badge">${s}</span>`).join("")}
  </div>
  ` : ""}
  
  ${report.most_used_features.length > 0 ? `
  <h2>Feature Engagement</h2>
  <h3>Most Used Features</h3>
  ${report.most_used_features.map(f => `
    <div class="feature-row">
      <span>${FEATURE_LABELS[f.feature] || f.label}</span>
      <span>${f.count} uses</span>
    </div>
  `).join("")}
  ` : ""}
  
  ${report.least_used_features.length > 0 ? `
  <h3 style="margin-top: 24px;">Emerging Opportunities</h3>
  <p style="color: #666; font-size: 13px; margin-bottom: 12px;">These features may benefit from additional awareness or training support.</p>
  ${report.least_used_features.map(f => `
    <div class="feature-row">
      <span>${FEATURE_LABELS[f.feature] || f.label}</span>
      <span>${f.count} uses</span>
    </div>
  `).join("")}
  ` : ""}
  
  <div class="note">
    <strong>Note:</strong> This report contains aggregated system activity data only. 
    No individual teacher or student information is included. 
    Data is intended for planning purposes, not evaluation.
  </div>
  
  <div class="footer">
    <p>Generated: ${report.generated_at ? format(new Date(report.generated_at), "PPp") : "N/A"}</p>
    <p>Status: ${report.status === "finalized" ? "Finalized" : "Draft"}</p>
  </div>
</body>
</html>
  `;
}

// Print/Export as PDF
export function printReportAsPDF(report: TermReport, schoolName: string) {
  const html = generateReportHTML(report, schoolName);
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
}
