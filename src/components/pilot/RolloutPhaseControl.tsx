import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  useSchoolRolloutStatus,
  useRolloutPhaseHistory,
  useAdvanceRolloutPhase,
  PHASE_LABELS,
  PHASE_DESCRIPTIONS,
  type RolloutPhase,
} from "@/hooks/usePilotDeployment";
import { ChevronRight, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const PHASE_ORDER: RolloutPhase[] = [
  'phase_0_setup',
  'phase_1_teachers',
  'phase_2_students',
  'phase_3_ai_suggestions',
  'phase_4_parent_insights',
  'completed',
];

interface RolloutPhaseControlProps {
  schoolId: string;
}

export function RolloutPhaseControl({ schoolId }: RolloutPhaseControlProps) {
  const [advanceReason, setAdvanceReason] = useState("");
  const [showAdvanceDialog, setShowAdvanceDialog] = useState(false);

  const { data: rolloutStatus, isLoading: statusLoading } = useSchoolRolloutStatus(schoolId);
  const { data: phaseHistory, isLoading: historyLoading } = useRolloutPhaseHistory(schoolId);
  const advancePhase = useAdvanceRolloutPhase();

  const currentPhaseIndex = rolloutStatus
    ? PHASE_ORDER.indexOf(rolloutStatus.current_phase)
    : 0;

  const handleAdvancePhase = async () => {
    if (!rolloutStatus) return;

    try {
      await advancePhase.mutateAsync({
        schoolId,
        reason: advanceReason || undefined,
      });
      toast.success("Rollout phase advanced successfully");
      setAdvanceReason("");
      setShowAdvanceDialog(false);
    } catch (error) {
      toast.error("Failed to advance phase");
    }
  };

  if (statusLoading || historyLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading rollout status...
        </CardContent>
      </Card>
    );
  }

  if (!rolloutStatus) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Rollout status not initialized for this school.
        </CardContent>
      </Card>
    );
  }

  const isCompleted = rolloutStatus.current_phase === 'completed';

  return (
    <div className="space-y-6">
      {/* Current Phase Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Rollout Progress</span>
            <Badge variant={isCompleted ? "default" : "secondary"} className="text-sm">
              {PHASE_LABELS[rolloutStatus.current_phase]}
            </Badge>
          </CardTitle>
          <CardDescription>
            {PHASE_DESCRIPTIONS[rolloutStatus.current_phase]}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Phase Timeline */}
          <div className="flex items-center justify-between">
            {PHASE_ORDER.map((phase, index) => {
              const isPast = index < currentPhaseIndex;
              const isCurrent = index === currentPhaseIndex;
              const isFuture = index > currentPhaseIndex;

              return (
                <div key={phase} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                        isPast
                          ? "bg-primary text-primary-foreground"
                          : isCurrent
                          ? "bg-primary/20 text-primary ring-2 ring-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isPast ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        index
                      )}
                    </div>
                    <span className={`mt-1 text-xs ${isCurrent ? "font-medium" : "text-muted-foreground"}`}>
                      {phase === 'completed' ? 'Done' : `P${index}`}
                    </span>
                  </div>
                  {index < PHASE_ORDER.length - 1 && (
                    <div
                      className={`mx-1 h-0.5 w-8 ${
                        isPast ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Phase Start Info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              Current phase started:{" "}
              {format(new Date(rolloutStatus.phase_started_at), "PPP 'at' p")}
            </span>
          </div>

          {/* Advance Button */}
          {!isCompleted && (
            <AlertDialog open={showAdvanceDialog} onOpenChange={setShowAdvanceDialog}>
              <AlertDialogTrigger asChild>
                <Button className="w-full gap-2">
                  Advance to Next Phase
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    Advance Rollout Phase
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    You are about to advance from{" "}
                    <strong>{PHASE_LABELS[rolloutStatus.current_phase]}</strong> to{" "}
                    <strong>
                      {PHASE_LABELS[PHASE_ORDER[currentPhaseIndex + 1]]}
                    </strong>
                    .
                    <br />
                    <br />
                    This action cannot be undone. Make sure all checks for the
                    current phase are complete.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4">
                  <Textarea
                    placeholder="Optional: Add a note about why you're advancing this phase..."
                    value={advanceReason}
                    onChange={(e) => setAdvanceReason(e.target.value)}
                    rows={3}
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleAdvancePhase}
                    disabled={advancePhase.isPending}
                  >
                    {advancePhase.isPending ? "Advancing..." : "Confirm Advance"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardContent>
      </Card>

      {/* Phase History */}
      {phaseHistory && phaseHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Phase History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {phaseHistory.map((history) => (
                <div
                  key={history.id}
                  className="flex items-start justify-between border-b pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      {history.from_phase && (
                        <>
                          <Badge variant="outline" className="text-xs">
                            {PHASE_LABELS[history.from_phase]}
                          </Badge>
                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        </>
                      )}
                      <Badge className="text-xs">
                        {PHASE_LABELS[history.to_phase]}
                      </Badge>
                    </div>
                    {history.reason && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {history.reason}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(history.created_at), "MMM d, yyyy")}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
