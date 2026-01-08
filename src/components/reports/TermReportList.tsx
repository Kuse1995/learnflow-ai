/**
 * Term Report List
 * Shows all term reports for a school with neutral, informational design
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TermReport } from "@/hooks/useTermReports";
import { format } from "date-fns";
import { FileText, Calendar, Plus, ChevronRight } from "lucide-react";

interface TermReportListProps {
  reports: TermReport[];
  onSelectReport: (report: TermReport) => void;
  onCreateReport: () => void;
  isLoading?: boolean;
}

export function TermReportList({
  reports,
  onSelectReport,
  onCreateReport,
  isLoading,
}: TermReportListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Loading reports...</p>
        </CardContent>
      </Card>
    );
  }

  if (reports.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="font-medium mb-2">No Term Reports Yet</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Generate your first term report to see system activity overview.
          </p>
          <Button onClick={onCreateReport}>
            <Plus className="h-4 w-4 mr-2" />
            Generate Term Report
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Group reports by academic year
  const reportsByYear = reports.reduce((acc, report) => {
    if (!acc[report.academic_year]) {
      acc[report.academic_year] = [];
    }
    acc[report.academic_year].push(report);
    return acc;
  }, {} as Record<string, TermReport[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Term Reports</h3>
          <p className="text-sm text-muted-foreground">
            System activity overviews by academic term
          </p>
        </div>
        <Button onClick={onCreateReport}>
          <Plus className="h-4 w-4 mr-2" />
          New Report
        </Button>
      </div>

      {Object.entries(reportsByYear)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([year, yearReports]) => (
          <div key={year}>
            <h4 className="text-sm font-medium text-muted-foreground mb-3">
              Academic Year {year}
            </h4>
            <div className="space-y-2">
              {yearReports.map((report) => (
                <Card
                  key={report.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => onSelectReport(report)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{report.term_name}</span>
                            <Badge variant={report.status === "finalized" ? "default" : "secondary"}>
                              {report.status === "finalized" ? "Finalized" : "Draft"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(report.start_date), "MMM d")} – {format(new Date(report.end_date), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                          <p className="text-sm text-muted-foreground">Teachers</p>
                          <p className="font-medium">{report.active_teachers_count}</p>
                        </div>
                        <div className="text-right hidden sm:block">
                          <p className="text-sm text-muted-foreground">Classes</p>
                          <p className="font-medium">{report.active_classes_count}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
