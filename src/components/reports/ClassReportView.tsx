import { format } from "date-fns";
import { Users, BookOpen, FileText, PenLine, Sparkles, Clock, TrendingUp, Minus, Heart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import type { ClassReport } from "@/hooks/useTeacherReports";

interface ClassReportViewProps {
  report: ClassReport;
  className: string;
}

export function ClassReportView({ report, className }: ClassReportViewProps) {
  return (
    <div className="space-y-6">
      {/* Overview Section */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
          Overview
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <OverviewCard
            icon={<Users className="h-5 w-5 text-primary" />}
            label="Students"
            value={report.overview.studentCount.toString()}
          />
          <OverviewCard
            icon={<BookOpen className="h-5 w-5 text-primary" />}
            label="Subjects"
            value={report.overview.subjects.length > 0 
              ? report.overview.subjects.slice(0, 2).join(", ") 
              : "—"}
            subtext={report.overview.subjects.length > 2 
              ? `+${report.overview.subjects.length - 2} more` 
              : undefined}
          />
          <OverviewCard
            icon={<FileText className="h-5 w-5 text-primary" />}
            label="Assessments Analyzed"
            value={report.overview.recentAnalysesCount.toString()}
            subtext="Last 90 days"
          />
          <OverviewCard
            icon={<Clock className="h-5 w-5 text-muted-foreground" />}
            label="Last Analysis"
            value={report.overview.lastAnalysisDate 
              ? format(new Date(report.overview.lastAnalysisDate), "MMM d") 
              : "—"}
          />
        </div>
      </section>

      <Separator />

      {/* Learning Themes Section */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
          Learning Themes
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Topics being explored across the class
        </p>
        
        {report.learningThemes.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No learning themes recorded yet.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Themes emerge from teaching actions and assessments.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-wrap gap-2">
            {report.learningThemes.map((theme, idx) => (
              <Badge
                key={idx}
                variant={theme.recentActivity ? "secondary" : "outline"}
                className="text-sm py-1.5 px-3"
              >
                {theme.topic}
                {theme.recentActivity && (
                  <span className="ml-2 text-xs opacity-70">• recent</span>
                )}
              </Badge>
            ))}
          </div>
        )}
      </section>

      <Separator />

      {/* Teaching Actions Summary */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
          Teaching Actions
        </h2>
        
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                <PenLine className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold">{report.teachingActions.totalCount}</span>
                  <span className="text-sm text-muted-foreground">actions recorded</span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {report.teachingActions.recentCount} in the last 30 days
                </p>
              </div>
            </div>
            
            {report.teachingActions.topicThemes.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-2">Common themes</p>
                <div className="flex flex-wrap gap-1.5">
                  {report.teachingActions.topicThemes.map((topic, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* Adaptive Support Coverage */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
          Adaptive Support Coverage
        </h2>
        
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold">{report.supportCoverage.studentsWithPlans}</span>
                  <span className="text-sm text-muted-foreground">
                    students with support plans
                  </span>
                </div>
                <div className="flex gap-4 mt-1 text-sm">
                  <span className="text-green-600">
                    {report.supportCoverage.acknowledgedCount} acknowledged
                  </span>
                  {report.supportCoverage.pendingCount > 0 && (
                    <span className="text-amber-600">
                      {report.supportCoverage.pendingCount} pending review
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

// ==================== SUB-COMPONENTS ====================

interface OverviewCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
}

function OverviewCard({ icon, label, value, subtext }: OverviewCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {icon}
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className="font-semibold truncate">{value}</p>
            {subtext && (
              <p className="text-xs text-muted-foreground">{subtext}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== LOADING SKELETON ====================

export function ClassReportSkeleton() {
  return (
    <div className="space-y-6">
      <section>
        <Skeleton className="h-4 w-24 mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      
      <Separator />
      
      <section>
        <Skeleton className="h-4 w-32 mb-4" />
        <div className="flex gap-2">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-8 w-24" />
          ))}
        </div>
      </section>
      
      <Separator />
      
      <section>
        <Skeleton className="h-4 w-28 mb-4" />
        <Card>
          <CardContent className="py-4">
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
