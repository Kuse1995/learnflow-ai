import { AlertCircle, BookOpen, Brain, FileText, Languages, Lightbulb, User, Zap } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { UploadAnalysis, StudentDiagnostic } from "@/hooks/useUploadAnalysis";

interface AnalysisViewerProps {
  analysis: UploadAnalysis | null;
  uploadTopic?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AnalysisViewer({ analysis, uploadTopic, open, onOpenChange }: AnalysisViewerProps) {
  if (!analysis || analysis.status !== "completed") {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b bg-background">
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Analysis Results
          </SheetTitle>
          {uploadTopic && (
            <p className="text-sm text-muted-foreground">{uploadTopic}</p>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Class-Level Summary */}
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Class Summary
              </h3>
              
              {analysis.class_summary && (
                <div className="space-y-4">
                  {/* Common Errors */}
                  {analysis.class_summary.common_errors?.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                          Common Error Patterns
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <ul className="space-y-1">
                          {analysis.class_summary.common_errors.map((error, idx) => (
                            <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-muted-foreground/50 mt-0.5">•</span>
                              {error}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* Topic Gaps */}
                  {analysis.class_summary.topic_gaps?.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-blue-500" />
                          Topics Needing Reinforcement
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex flex-wrap gap-2">
                          {analysis.class_summary.topic_gaps.map((topic, idx) => (
                            <Badge key={idx} variant="secondary" className="font-normal">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Overall Observations */}
                  {analysis.class_summary.overall_observations && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Lightbulb className="h-4 w-4 text-primary" />
                          Observations
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground">
                          {analysis.class_summary.overall_observations}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {!analysis.class_summary?.common_errors?.length && 
               !analysis.class_summary?.topic_gaps?.length && 
               !analysis.class_summary?.overall_observations && (
                <p className="text-sm text-muted-foreground italic">
                  No class-level patterns identified in this analysis.
                </p>
              )}
            </section>

            <Separator />

            {/* Student Diagnostics */}
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Student Diagnostics ({analysis.student_diagnostics?.length || 0})
              </h3>

              {analysis.student_diagnostics?.length > 0 ? (
                <div className="space-y-3">
                  {analysis.student_diagnostics.map((student, idx) => (
                    <StudentDiagnosticCard key={student.student_id || idx} diagnostic={student} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No individual diagnostics available.
                </p>
              )}
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

interface StudentDiagnosticCardProps {
  diagnostic: StudentDiagnostic;
}

function StudentDiagnosticCard({ diagnostic }: StudentDiagnosticCardProps) {
  const { error_patterns, weak_topics, notes, student_name } = diagnostic;

  // Determine which patterns are notable (value > 3)
  const notablePatterns = [];
  if (error_patterns?.conceptual > 3) notablePatterns.push({ type: "conceptual", icon: Brain, label: "Conceptual" });
  if (error_patterns?.procedural > 3) notablePatterns.push({ type: "procedural", icon: Zap, label: "Procedural" });
  if (error_patterns?.language > 3) notablePatterns.push({ type: "language", icon: Languages, label: "Language" });
  if (error_patterns?.careless > 3) notablePatterns.push({ type: "careless", icon: AlertCircle, label: "Careless" });

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <p className="font-medium text-sm">{student_name || "Unknown Student"}</p>

            {/* Error Pattern Indicators */}
            {notablePatterns.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {notablePatterns.map(({ type, icon: Icon, label }) => (
                  <Badge 
                    key={type} 
                    variant="outline" 
                    className="text-xs font-normal gap-1 bg-muted/50"
                  >
                    <Icon className="h-3 w-3" />
                    {label}
                  </Badge>
                ))}
              </div>
            )}

            {/* Weak Topics */}
            {weak_topics?.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Areas for focus:</p>
                <div className="flex flex-wrap gap-1">
                  {weak_topics.map((topic, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs font-normal">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {notes && (
              <p className="text-xs text-muted-foreground mt-2">{notes}</p>
            )}

            {/* If no notable patterns or issues */}
            {notablePatterns.length === 0 && (!weak_topics || weak_topics.length === 0) && !notes && (
              <p className="text-xs text-muted-foreground italic">No specific observations.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
