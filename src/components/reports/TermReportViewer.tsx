/**
 * Term Report Viewer
 * Displays aggregated, anonymized term-based reports
 * Non-punitive, trust-preserving design
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { 
  FileText, 
  Download, 
  Calendar, 
  Users, 
  FileUp, 
  BookOpen, 
  Heart, 
  Lightbulb,
  TrendingUp,
  Lock,
  Edit3,
  Check
} from "lucide-react";
import { TermReport, FEATURE_LABELS } from "@/hooks/useTermReports";
import { format } from "date-fns";
import { useState } from "react";

interface TermReportViewerProps {
  report: TermReport;
  onUpdateNotes?: (notes: string) => void;
  onFinalize?: () => void;
  onExportPDF?: () => void;
  onExportCSV?: () => void;
  isUpdating?: boolean;
}

export function TermReportViewer({
  report,
  onUpdateNotes,
  onFinalize,
  onExportPDF,
  onExportCSV,
  isUpdating,
}: TermReportViewerProps) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(report.admin_notes || "");

  const isFinalized = report.status === "finalized";

  const handleSaveNotes = () => {
    onUpdateNotes?.(notes);
    setEditingNotes(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-semibold">{report.term_name}</h2>
            <Badge variant={isFinalized ? "default" : "secondary"}>
              {isFinalized ? "Finalized" : "Draft"}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {format(new Date(report.start_date), "MMM d, yyyy")} – {format(new Date(report.end_date), "MMM d, yyyy")}
          </p>
        </div>
        
        <div className="flex gap-2">
          {!isFinalized && onFinalize && (
            <Button variant="outline" onClick={onFinalize} disabled={isUpdating}>
              <Lock className="h-4 w-4 mr-2" />
              Finalize Report
            </Button>
          )}
          {onExportPDF && (
            <Button variant="outline" onClick={onExportPDF}>
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
          )}
          {onExportCSV && (
            <Button variant="outline" onClick={onExportCSV}>
              <FileText className="h-4 w-4 mr-2" />
              CSV
            </Button>
          )}
        </div>
      </div>

      {/* Section A: System Adoption */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            System Activity Overview
          </CardTitle>
          <CardDescription>
            Observed usage patterns for this term
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              icon={<Users className="h-5 w-5" />}
              label="Teachers Using Platform"
              value={report.active_teachers_count}
            />
            <MetricCard
              icon={<BookOpen className="h-5 w-5" />}
              label="Active Classes"
              value={report.active_classes_count}
            />
            <MetricCard
              icon={<FileUp className="h-5 w-5" />}
              label="Uploads Analyzed"
              value={report.uploads_analyzed_count}
            />
            <MetricCard
              icon={<Lightbulb className="h-5 w-5" />}
              label="AI Suggestions Viewed"
              value={report.ai_suggestions_used_count}
            />
            <MetricCard
              icon={<Heart className="h-5 w-5" />}
              label="Family Updates Prepared"
              value={report.parent_insights_count}
            />
            <MetricCard
              icon={<FileText className="h-5 w-5" />}
              label="Support Plans Created"
              value={report.support_plans_count}
            />
          </div>
        </CardContent>
      </Card>

      {/* Section B: Learning Support Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Learning Support Activity</CardTitle>
          <CardDescription>
            Aggregated support features engagement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Adaptive Support Plans Generated</p>
              <p className="text-2xl font-semibold mt-1">{report.adaptive_plans_generated}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Family Updates Approved</p>
              <p className="text-2xl font-semibold mt-1">{report.parent_insights_approved}</p>
            </div>
          </div>

          {report.common_subjects_engaged.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Subject Areas Engaged</p>
              <div className="flex flex-wrap gap-2">
                {report.common_subjects_engaged.map((subject, i) => (
                  <Badge key={i} variant="outline">{subject}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section C: Engagement Patterns */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Feature Engagement</CardTitle>
          <CardDescription>
            Adoption trends across platform features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {report.most_used_features.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-3">Most Used Features</p>
              <div className="space-y-2">
                {report.most_used_features.map((feature, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span>{FEATURE_LABELS[feature.feature] || feature.label}</span>
                    <Badge variant="secondary">{feature.count} uses</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.least_used_features.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-3">Emerging Opportunities</p>
              <p className="text-sm text-muted-foreground mb-2">
                These features may benefit from additional awareness or training support.
              </p>
              <div className="space-y-2">
                {report.least_used_features.map((feature, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span>{FEATURE_LABELS[feature.feature] || feature.label}</span>
                    <Badge variant="outline">{feature.count} uses</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.emerging_adoption_areas.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-3">Emerging Adoption Areas</p>
              <div className="flex flex-wrap gap-2">
                {report.emerging_adoption_areas.map((area, i) => (
                  <Badge key={i} variant="outline" className="bg-primary/5">
                    {area}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section D: Administrative Notes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Administrative Notes</CardTitle>
              <CardDescription>
                Internal notes – not visible to teachers
              </CardDescription>
            </div>
            {!isFinalized && !editingNotes && onUpdateNotes && (
              <Button variant="ghost" size="sm" onClick={() => setEditingNotes(true)}>
                <Edit3 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editingNotes ? (
            <div className="space-y-3">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add internal notes about this term..."
                rows={4}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveNotes} disabled={isUpdating}>
                  <Check className="h-4 w-4 mr-2" />
                  Save Notes
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingNotes(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">
              {report.admin_notes || "No notes added yet."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Footer Info */}
      <Separator />
      <div className="text-sm text-muted-foreground flex flex-wrap gap-x-6 gap-y-2">
        {report.generated_at && (
          <span>Generated: {format(new Date(report.generated_at), "PPp")}</span>
        )}
        {report.finalized_at && (
          <span>Finalized: {format(new Date(report.finalized_at), "PPp")}</span>
        )}
      </div>
    </div>
  );
}

// Simple metric card component
function MetricCard({ 
  icon, 
  label, 
  value 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: number;
}) {
  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <p className="text-2xl font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}
