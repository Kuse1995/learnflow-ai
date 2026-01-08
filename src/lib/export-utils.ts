/**
 * Export Utilities
 * Client-side PDF generation and export formatting
 * Clean, black & white friendly, professional language
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

export interface ExportConfig {
  title: string;
  schoolName: string;
  term?: string;
  dateRange?: { from: Date; to: Date };
  sections?: string[];
  includeHeader?: boolean;
  includeFooter?: boolean;
}

export interface ExportSection {
  title: string;
  type: "text" | "table" | "list" | "metrics";
  content: string | string[] | TableData | MetricData[];
}

export interface TableData {
  headers: string[];
  rows: string[][];
}

export interface MetricData {
  label: string;
  value: string | number;
  description?: string;
}

// Neutral language replacements
const LANGUAGE_NEUTRALIZATIONS: Record<string, string> = {
  "struggling": "developing",
  "failed": "in progress",
  "poor": "emerging",
  "weak": "developing",
  "below average": "approaching expectations",
  "at risk": "needs support",
  "behind": "developing",
  "deficit": "growth area",
  "problem": "focus area",
  "issue": "observation",
};

export function neutralizeLanguage(text: string): string {
  let result = text;
  Object.entries(LANGUAGE_NEUTRALIZATIONS).forEach(([from, to]) => {
    const regex = new RegExp(from, "gi");
    result = result.replace(regex, to);
  });
  return result;
}

export function formatDateForExport(date: Date): string {
  return format(date, "dd MMM yyyy");
}

export function generatePDF(config: ExportConfig, sections: ExportSection[]): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPosition = margin;

  // Header
  if (config.includeHeader !== false) {
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(config.schoolName, margin, yPosition);
    yPosition += 8;

    doc.setFontSize(14);
    doc.text(config.title, margin, yPosition);
    yPosition += 6;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    const dateText = config.dateRange
      ? `${formatDateForExport(config.dateRange.from)} - ${formatDateForExport(config.dateRange.to)}`
      : formatDateForExport(new Date());

    if (config.term) {
      doc.text(`${config.term} | ${dateText}`, margin, yPosition);
    } else {
      doc.text(dateText, margin, yPosition);
    }
    yPosition += 4;

    // Divider line
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;
  }

  // Sections
  sections.forEach((section, sectionIndex) => {
    // Check if we need a new page
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = margin;
    }

    // Section title
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(neutralizeLanguage(section.title), margin, yPosition);
    yPosition += 6;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    switch (section.type) {
      case "text":
        const textContent = neutralizeLanguage(section.content as string);
        const textLines = doc.splitTextToSize(textContent, pageWidth - margin * 2);
        doc.text(textLines, margin, yPosition);
        yPosition += textLines.length * 5 + 4;
        break;

      case "list":
        const listItems = section.content as string[];
        listItems.forEach((item) => {
          if (yPosition > pageHeight - 20) {
            doc.addPage();
            yPosition = margin;
          }
          doc.text(`• ${neutralizeLanguage(item)}`, margin + 2, yPosition);
          yPosition += 5;
        });
        yPosition += 4;
        break;

      case "metrics":
        const metrics = section.content as MetricData[];
        autoTable(doc, {
          startY: yPosition,
          head: [["Metric", "Value", "Notes"]],
          body: metrics.map((m) => [
            m.label,
            String(m.value),
            m.description || "-",
          ]),
          theme: "plain",
          styles: { fontSize: 9, cellPadding: 2 },
          headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
          margin: { left: margin, right: margin },
        });
        yPosition = (doc as any).lastAutoTable.finalY + 8;
        break;

      case "table":
        const tableData = section.content as TableData;
        autoTable(doc, {
          startY: yPosition,
          head: [tableData.headers],
          body: tableData.rows.map((row) => row.map(neutralizeLanguage)),
          theme: "grid",
          styles: { fontSize: 9, cellPadding: 2 },
          headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
          margin: { left: margin, right: margin },
        });
        yPosition = (doc as any).lastAutoTable.finalY + 8;
        break;
    }

    // Add spacing between sections
    if (sectionIndex < sections.length - 1) {
      yPosition += 4;
    }
  });

  // Footer on each page
  if (config.includeFooter !== false) {
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Generated from School System | Page ${i} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
      doc.setTextColor(0, 0, 0);
    }
  }

  return doc;
}

export function downloadPDF(doc: jsPDF, filename: string): void {
  doc.save(`${filename}.pdf`);
}

export function generatePlainTextSummary(config: ExportConfig, sections: ExportSection[]): string {
  const lines: string[] = [];

  // Header
  lines.push(`📋 ${config.schoolName}`);
  lines.push(`${config.title}`);
  if (config.term) lines.push(`${config.term}`);
  
  const dateText = config.dateRange
    ? `${formatDateForExport(config.dateRange.from)} - ${formatDateForExport(config.dateRange.to)}`
    : formatDateForExport(new Date());
  lines.push(dateText);
  lines.push("");
  lines.push("─".repeat(30));
  lines.push("");

  // Sections
  sections.forEach((section) => {
    lines.push(`📌 ${neutralizeLanguage(section.title)}`);
    lines.push("");

    switch (section.type) {
      case "text":
        lines.push(neutralizeLanguage(section.content as string));
        break;

      case "list":
        (section.content as string[]).forEach((item) => {
          lines.push(`  • ${neutralizeLanguage(item)}`);
        });
        break;

      case "metrics":
        (section.content as MetricData[]).forEach((m) => {
          lines.push(`  ${m.label}: ${m.value}`);
        });
        break;

      case "table":
        const tableData = section.content as TableData;
        tableData.rows.forEach((row) => {
          lines.push(`  ${row.map(neutralizeLanguage).join(" | ")}`);
        });
        break;
    }

    lines.push("");
  });

  lines.push("─".repeat(30));
  lines.push("Generated from School System");

  return lines.join("\n");
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

export function generatePrintableHTML(config: ExportConfig, sections: ExportSection[]): string {
  const dateText = config.dateRange
    ? `${formatDateForExport(config.dateRange.from)} - ${formatDateForExport(config.dateRange.to)}`
    : formatDateForExport(new Date());

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${config.title}</title>
      <style>
        @media print {
          body { font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.4; color: #000; }
          .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
          .header h1 { margin: 0 0 5px 0; font-size: 18pt; }
          .header h2 { margin: 0 0 5px 0; font-size: 14pt; font-weight: normal; }
          .header .meta { font-size: 10pt; color: #666; }
          .section { margin-bottom: 20px; page-break-inside: avoid; }
          .section h3 { font-size: 12pt; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; font-size: 10pt; }
          th { background: #f5f5f5; font-weight: bold; }
          ul { margin: 5px 0; padding-left: 20px; }
          li { margin: 3px 0; }
          .footer { position: fixed; bottom: 0; width: 100%; text-align: center; font-size: 9pt; color: #999; border-top: 1px solid #ccc; padding-top: 5px; }
          @page { margin: 15mm; }
        }
        body { font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.4; max-width: 800px; margin: 20px auto; padding: 20px; }
        .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
        .header h1 { margin: 0 0 5px 0; font-size: 18pt; }
        .header h2 { margin: 0 0 5px 0; font-size: 14pt; font-weight: normal; }
        .header .meta { font-size: 10pt; color: #666; }
        .section { margin-bottom: 20px; }
        .section h3 { font-size: 12pt; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; font-size: 10pt; }
        th { background: #f5f5f5; font-weight: bold; }
        ul { margin: 5px 0; padding-left: 20px; }
        li { margin: 3px 0; }
        .footer { text-align: center; font-size: 9pt; color: #999; border-top: 1px solid #ccc; padding-top: 10px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${config.schoolName}</h1>
        <h2>${config.title}</h2>
        <div class="meta">${config.term ? `${config.term} | ` : ""}${dateText}</div>
      </div>
  `;

  sections.forEach((section) => {
    html += `<div class="section"><h3>${neutralizeLanguage(section.title)}</h3>`;

    switch (section.type) {
      case "text":
        html += `<p>${neutralizeLanguage(section.content as string)}</p>`;
        break;

      case "list":
        html += "<ul>";
        (section.content as string[]).forEach((item) => {
          html += `<li>${neutralizeLanguage(item)}</li>`;
        });
        html += "</ul>";
        break;

      case "metrics":
        html += "<table><thead><tr><th>Metric</th><th>Value</th><th>Notes</th></tr></thead><tbody>";
        (section.content as MetricData[]).forEach((m) => {
          html += `<tr><td>${m.label}</td><td>${m.value}</td><td>${m.description || "-"}</td></tr>`;
        });
        html += "</tbody></table>";
        break;

      case "table":
        const tableData = section.content as TableData;
        html += "<table><thead><tr>";
        tableData.headers.forEach((h) => {
          html += `<th>${h}</th>`;
        });
        html += "</tr></thead><tbody>";
        tableData.rows.forEach((row) => {
          html += "<tr>";
          row.forEach((cell) => {
            html += `<td>${neutralizeLanguage(cell)}</td>`;
          });
          html += "</tr>";
        });
        html += "</tbody></table>";
        break;
    }

    html += "</div>";
  });

  html += `
      <div class="footer">Generated from School System</div>
    </body>
    </html>
  `;

  return html;
}

export function openPrintWindow(html: string): void {
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
