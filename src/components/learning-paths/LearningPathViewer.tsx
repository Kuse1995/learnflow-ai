import { format } from "date-fns";
import { Check, Loader2, Target, Lightbulb, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  LearningPath,
  useAcknowledgeLearningPath,
} from "@/hooks/useLearningPaths";

/**
 * Learning Path Viewer
 * 
 * CONSTRAINTS (enforced):
 * - VISIBILITY: Teacher-only. Never expose to parents or students.
 * - No notifications triggered by viewing or acknowledging.
 * - No analytics, tracking, or scoring displayed.
 * - No automatic generation—always requires manual teacher action.
 * - Disclaimer always visible: "This guidance is optional..."
 */
interface LearningPathViewerProps {
  path: LearningPath;
  studentName: string;
  showAcknowledge?: boolean;
}

export function LearningPathViewer({
  path,
  studentName,
  showAcknowledge = true,
}: LearningPathViewerProps) {
  const acknowledgeMutation = useAcknowledgeLearningPath();

  const handleAcknowledge = async () => {
    try {
      await acknowledgeMutation.mutateAsync({ id: path.id });
      toast.success("Learning path acknowledged");
    } catch (error) {
      toast.error("Failed to acknowledge learning path");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              {studentName}
              {path.teacher_acknowledged && (
                <Badge variant="secondary" className="text-xs font-normal">
                  <Check className="h-3 w-3 mr-1" />
                  Acknowledged
                </Badge>
              )}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Generated {format(new Date(path.generated_at), "MMM d, yyyy")}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground italic border-l-2 border-muted pl-3">
          This guidance is optional and intended to support professional judgment.
        </p>

        {/* Focus Topics */}
        {path.focus_topics.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <Target className="h-4 w-4" />
              <span>Focus topics</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {path.focus_topics.map((topic, index) => (
                <Badge key={index} variant="outline" className="font-normal">
                  {topic}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Suggested Learning Activities */}
        {path.suggested_activities.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <Lightbulb className="h-4 w-4" />
              <span>Suggested learning activities</span>
            </div>
            <ul className="text-sm space-y-1 pl-6">
              {path.suggested_activities.map((activity, index) => (
                <li key={index} className="list-disc text-foreground">{activity}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Pacing Notes */}
        {path.pacing_notes && (
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <Clock className="h-4 w-4" />
              <span>Pacing notes</span>
            </div>
            <p className="text-sm bg-muted/50 rounded-md p-3">
              {path.pacing_notes}
            </p>
          </div>
        )}

        {/* Acknowledge Action */}
        {showAcknowledge && !path.teacher_acknowledged && (
          <div className="pt-2 flex justify-end">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" disabled={acknowledgeMutation.isPending}>
                  {acknowledgeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Check className="h-4 w-4 mr-1" />
                  )}
                  Acknowledge
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Acknowledge this learning path?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This marks the learning path as reviewed. You can generate a new path 
                    for this student after acknowledging the current one.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleAcknowledge}>Acknowledge</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
