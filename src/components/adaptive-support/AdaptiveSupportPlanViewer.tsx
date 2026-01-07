import { useState } from "react";
import { format } from "date-fns";
import { Check, Loader2, Target, Lightbulb, HandHelping, Heart, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  AdaptiveSupportPlan,
  useAcknowledgeAdaptiveSupportPlan,
} from "@/hooks/useAdaptiveSupportPlans";

/**
 * Adaptive Support Plan Viewer
 * VISIBILITY: Teacher-only. Never expose to parents or students.
 * No notifications, analytics, scores, or progress indicators.
 */
interface AdaptiveSupportPlanViewerProps {
  plan: AdaptiveSupportPlan;
  studentName: string;
  showAcknowledge?: boolean;
}

export function AdaptiveSupportPlanViewer({
  plan,
  studentName,
  showAcknowledge = true,
}: AdaptiveSupportPlanViewerProps) {
  const acknowledgeMutation = useAcknowledgeAdaptiveSupportPlan();

  const handleAcknowledge = async () => {
    try {
      await acknowledgeMutation.mutateAsync({ id: plan.id });
      toast.success("Support plan acknowledged");
    } catch (error) {
      toast.error("Failed to acknowledge plan");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              {studentName}
              {plan.teacher_acknowledged && (
                <Badge variant="secondary" className="text-xs font-normal">
                  <Check className="h-3 w-3 mr-1" />
                  Acknowledged
                </Badge>
              )}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Generated {format(new Date(plan.generated_at), "MMM d, yyyy")} • 
              Based on last {plan.source_window_days} days
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground italic border-l-2 border-muted pl-3">
          This guidance is optional and intended to support professional judgment.
        </p>

        {/* Focus Areas */}
        {plan.focus_areas.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <Target className="h-4 w-4" />
              <span>Focus areas for continued practice</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {plan.focus_areas.map((area, index) => (
                <Badge key={index} variant="outline" className="font-normal">
                  {area}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Practice Types */}
        {plan.recommended_practice_types.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <Lightbulb className="h-4 w-4" />
              <span>Types of practice that may help</span>
            </div>
            <ul className="text-sm space-y-1 pl-6">
              {plan.recommended_practice_types.map((type, index) => (
                <li key={index} className="list-disc text-foreground">{type}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Support Strategies */}
        {plan.support_strategies.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <HandHelping className="h-4 w-4" />
              <span>Support strategies to consider</span>
            </div>
            <ul className="text-sm space-y-1 pl-6">
              {plan.support_strategies.map((strategy, index) => (
                <li key={index} className="list-disc text-foreground">{strategy}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Confidence Support Notes */}
        {plan.confidence_support_notes && (
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <Heart className="h-4 w-4" />
              <span>Confidence & engagement notes</span>
            </div>
            <p className="text-sm bg-muted/50 rounded-md p-3">
              {plan.confidence_support_notes}
            </p>
          </div>
        )}

        {/* Acknowledge Action */}
        {showAcknowledge && !plan.teacher_acknowledged && (
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
                  <AlertDialogTitle>Acknowledge this support plan?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This marks the plan as reviewed. You can generate a new plan 
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
