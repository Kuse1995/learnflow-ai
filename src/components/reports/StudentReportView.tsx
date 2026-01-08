import { format } from "date-fns";
import { TrendingUp, Minus, Heart, Sparkles, MessageCircle, Check, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import type { StudentReport, EngagementTrend } from "@/hooks/useTeacherReports";
import { getEngagementTrendDisplay } from "@/hooks/useTeacherReports";

interface StudentReportViewProps {
  report: StudentReport;
}

export function StudentReportView({ report }: StudentReportViewProps) {
  const trendDisplay = getEngagementTrendDisplay(report.engagementTrend);
  
  return (
    <div className="space-y-6">
      {/* Learning Snapshot */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
          Learning Snapshot
        </h2>
        
        <div className="space-y-4">
          {/* Strengths */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Areas of confidence
              </CardTitle>
            </CardHeader>
            <CardContent>
              {report.learningSnapshot.strengths.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  Building a picture over time...
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {report.learningSnapshot.strengths.map((strength, idx) => (
                    <Badge key={idx} variant="secondary" className="text-sm">
                      {strength}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Topics Being Practiced */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Topics being practiced
              </CardTitle>
            </CardHeader>
            <CardContent>
              {report.learningSnapshot.topicsBeingPracticed.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  No specific topics identified yet
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {report.learningSnapshot.topicsBeingPracticed.map((topic, idx) => (
                    <Badge key={idx} variant="outline" className="text-sm">
                      {topic}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Focus Areas */}
          {report.learningSnapshot.focusAreas.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Areas for attention
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {report.learningSnapshot.focusAreas.map((area, idx) => (
                    <Badge key={idx} variant="outline" className="text-sm border-amber-300 text-amber-700">
                      {area}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      <Separator />

      {/* Engagement Trend */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
          Engagement Trend
        </h2>
        
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                report.engagementTrend === 'increasing' ? 'bg-green-100' :
                report.engagementTrend === 'needs_encouragement' ? 'bg-amber-100' :
                'bg-muted'
              }`}>
                <EngagementIcon trend={report.engagementTrend} />
              </div>
              <div>
                <p className={`font-medium ${trendDisplay.color}`}>
                  {trendDisplay.label}
                </p>
                <p className="text-sm text-muted-foreground">
                  {trendDisplay.description}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* Support History */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
          Support History
        </h2>
        
        {report.supportHistory.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No adaptive support plans have been created yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {report.supportHistory.map((plan) => (
              <Card key={plan.id}>
                <CardContent className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">
                          {format(new Date(plan.generatedAt), "MMM d, yyyy")}
                        </span>
                        {plan.acknowledged ? (
                          <Badge variant="secondary" className="text-xs">
                            <Check className="h-3 w-3 mr-1" />
                            Reviewed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </div>
                      {plan.focusAreas.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {plan.focusAreas.slice(0, 3).map((area, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {area}
                            </Badge>
                          ))}
                          {plan.focusAreas.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{plan.focusAreas.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Separator />

      {/* Parent Communication Status */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
          Parent Communication
        </h2>
        
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                report.parentCommunication.sharedAt ? 'bg-green-100' :
                report.parentCommunication.isApproved ? 'bg-blue-100' :
                report.parentCommunication.hasDraft ? 'bg-amber-100' :
                'bg-muted'
              }`}>
                <MessageCircle className={`h-6 w-6 ${
                  report.parentCommunication.sharedAt ? 'text-green-600' :
                  report.parentCommunication.isApproved ? 'text-blue-600' :
                  report.parentCommunication.hasDraft ? 'text-amber-600' :
                  'text-muted-foreground'
                }`} />
              </div>
              <div>
                <CommunicationStatus status={report.parentCommunication} />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

// ==================== SUB-COMPONENTS ====================

function EngagementIcon({ trend }: { trend: EngagementTrend }) {
  switch (trend) {
    case 'increasing':
      return <TrendingUp className="h-6 w-6 text-green-600" />;
    case 'needs_encouragement':
      return <Heart className="h-6 w-6 text-amber-600" />;
    default:
      return <Minus className="h-6 w-6 text-muted-foreground" />;
  }
}

interface CommunicationStatusProps {
  status: {
    hasDraft: boolean;
    isApproved: boolean;
    approvedAt: string | null;
    sharedAt: string | null;
  };
}

function CommunicationStatus({ status }: CommunicationStatusProps) {
  if (status.sharedAt) {
    return (
      <>
        <p className="font-medium text-green-600">Shared with parent</p>
        <p className="text-sm text-muted-foreground">
          {format(new Date(status.sharedAt), "MMM d, yyyy")}
        </p>
      </>
    );
  }
  
  if (status.isApproved && status.approvedAt) {
    return (
      <>
        <p className="font-medium text-blue-600">Approved, ready to share</p>
        <p className="text-sm text-muted-foreground">
          Approved {format(new Date(status.approvedAt), "MMM d, yyyy")}
        </p>
      </>
    );
  }
  
  if (status.hasDraft) {
    return (
      <>
        <p className="font-medium text-amber-600">Draft available</p>
        <p className="text-sm text-muted-foreground">
          Awaiting your review
        </p>
      </>
    );
  }
  
  return (
    <>
      <p className="font-medium text-muted-foreground">No update prepared</p>
      <p className="text-sm text-muted-foreground">
        Generate a parent insight when ready
      </p>
    </>
  );
}

// ==================== LOADING SKELETON ====================

export function StudentReportSkeleton() {
  return (
    <div className="space-y-6">
      <section>
        <Skeleton className="h-4 w-32 mb-4" />
        <div className="space-y-4">
          {[1, 2].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-28" />
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  {[1, 2, 3].map(j => (
                    <Skeleton key={j} className="h-6 w-16" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      
      <Separator />
      
      <section>
        <Skeleton className="h-4 w-28 mb-4" />
        <Card>
          <CardContent className="py-4">
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
