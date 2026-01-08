/**
 * Export Button Component
 * Triggers export with format selection
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, Printer, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ExportConfig, ExportSection } from "@/lib/export-utils";
import {
  generatePDF,
  downloadPDF,
  generatePlainTextSummary,
  generatePrintableHTML,
  openPrintWindow,
  copyToClipboard,
} from "@/lib/export-utils";

export interface ExportButtonProps {
  config: ExportConfig;
  sections: ExportSection[];
  filename?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  disabled?: boolean;
  isLoading?: boolean;
  showPDF?: boolean;
  showPrint?: boolean;
  showCopy?: boolean;
  className?: string;
}

export function ExportButton({
  config,
  sections,
  filename = "report",
  variant = "outline",
  size = "default",
  disabled = false,
  isLoading = false,
  showPDF = true,
  showPrint = true,
  showCopy = true,
  className,
}: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handlePDFExport = async () => {
    setExporting(true);
    try {
      const doc = generatePDF(config, sections);
      downloadPDF(doc, filename);
      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = async () => {
    setExporting(true);
    try {
      const html = generatePrintableHTML(config, sections);
      openPrintWindow(html);
      toast.success("Print window opened");
    } catch (error) {
      console.error("Print error:", error);
      toast.error("Failed to open print window");
    } finally {
      setExporting(false);
    }
  };

  const handleCopyText = async () => {
    setExporting(true);
    try {
      const text = generatePlainTextSummary(config, sections);
      await copyToClipboard(text);
      toast.success("Summary copied to clipboard");
    } catch (error) {
      console.error("Copy error:", error);
      toast.error("Failed to copy to clipboard");
    } finally {
      setExporting(false);
    }
  };

  const isDisabled = disabled || isLoading || exporting || sections.length === 0;

  // Single action if only one option
  const actions = [showPDF, showPrint, showCopy].filter(Boolean);
  if (actions.length === 1) {
    const action = showPDF ? handlePDFExport : showPrint ? handlePrint : handleCopyText;
    const label = showPDF ? "Export PDF" : showPrint ? "Print" : "Copy Summary";
    const Icon = showPDF ? FileText : showPrint ? Printer : Copy;

    return (
      <Button
        variant={variant}
        size={size}
        onClick={action}
        disabled={isDisabled}
        className={className}
      >
        {exporting || isLoading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Icon className="h-4 w-4 mr-2" />
        )}
        {label}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={isDisabled} className={className}>
          {exporting || isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {showPDF && (
          <DropdownMenuItem onClick={handlePDFExport}>
            <FileText className="h-4 w-4 mr-2" />
            Download PDF
          </DropdownMenuItem>
        )}
        {showPrint && (
          <DropdownMenuItem onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </DropdownMenuItem>
        )}
        {(showPDF || showPrint) && showCopy && <DropdownMenuSeparator />}
        {showCopy && (
          <DropdownMenuItem onClick={handleCopyText}>
            <Copy className="h-4 w-4 mr-2" />
            Copy for WhatsApp
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
