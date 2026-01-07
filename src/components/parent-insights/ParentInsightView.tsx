import { format } from "date-fns";
import { Heart } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useApprovedParentInsight } from "@/hooks/useParentInsights";

interface ParentInsightViewProps {
  studentId: string;
  studentName: string;
}

export function ParentInsightView({ studentId, studentName }: ParentInsightViewProps) {
  const { data: insight, isLoading } = useApprovedParentInsight(studentId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-32 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!insight) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="py-8 text-center">
          <Heart className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground text-sm">
            No learning update is available for {studentName} yet.
          </p>
          <p className="text-muted-foreground text-xs mt-1">
            Check back soon for updates from your child's teacher.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-rose-400" />
          <h3 className="font-medium">Learning Update for {studentName}</h3>
        </div>
        {insight.approved_at && (
          <p className="text-xs text-muted-foreground">
            Shared on {format(new Date(insight.approved_at), "MMMM d, yyyy")}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <p className="text-sm leading-relaxed">{insight.summary_text}</p>

        {/* Home Support Tips */}
        {insight.home_support_tips && insight.home_support_tips.length > 0 && (
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="text-sm font-medium mb-2">How you can support at home</h4>
            <ul className="space-y-2">
              {insight.home_support_tips.map((tip, index) => (
                <li key={index} className="text-sm flex gap-2">
                  <span className="text-muted-foreground">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
