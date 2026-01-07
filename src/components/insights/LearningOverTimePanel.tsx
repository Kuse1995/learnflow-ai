import { TrendingUp, Loader2, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DataReadinessIndicator } from "@/components/ui/data-readiness-indicator";
import { useLearningPatterns } from "@/hooks/useLearningPatterns";
import { useClassDataReadiness } from "@/hooks/useDataReadiness";

interface LearningOverTimePanelProps {
  classId: string;
}

export function LearningOverTimePanel({ classId }: LearningOverTimePanelProps) {
  const { data: patterns, isLoading, error } = useLearningPatterns(classId);
  const { data: readiness, isLoading: isLoadingReadiness } = useClassDataReadiness(classId);

  // Don't render if loading
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Learning Over Time</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
        </CardContent>
      </Card>
    );
  }

  // Don't render if error or no data
  if (error || !patterns) {
    return null;
  }

  // Don't render if insufficient data for meaningful patterns
  const hasInsights = patterns.insights && patterns.insights.length > 0;
  const hasEnoughData = patterns.data_coverage.analyses_count >= 2;

  if (!hasEnoughData) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Learning Over Time</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              Longitudinal patterns will appear here as more analyses are completed over time.
              This helps identify how focus areas evolve across the class.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Learning Over Time</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">
          Observations from the past 90 days
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Data Readiness Indicator */}
        <DataReadinessIndicator 
          readiness={readiness} 
          isLoading={isLoadingReadiness} 
        />

        {/* Insights List */}
        {hasInsights ? (
          <ul className="space-y-3">
            {patterns.insights.map((insight, idx) => (
              <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                <span className="text-primary mt-1.5 shrink-0">•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Patterns are still emerging. Check back as more data becomes available.
          </p>
        )}

        {/* Subtle disclaimer */}
        <p className="text-xs text-muted-foreground pt-2 border-t">
          These observations reflect aggregated patterns and may evolve as new data is collected.
        </p>
      </CardContent>
    </Card>
  );
}
