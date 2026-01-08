import { Badge } from "@/components/ui/badge";
import { Beaker, CheckCircle2 } from "lucide-react";
import { PHASE_LABELS, type RolloutPhase } from "@/hooks/usePilotDeployment";

interface PilotSchoolBadgeProps {
  isPilot: boolean;
  currentPhase?: RolloutPhase;
  isComplete?: boolean;
  showPhase?: boolean;
}

export function PilotSchoolBadge({
  isPilot,
  currentPhase,
  isComplete,
  showPhase = true,
}: PilotSchoolBadgeProps) {
  if (!isPilot) return null;

  if (isComplete) {
    return (
      <Badge variant="outline" className="gap-1 border-green-500 text-green-600">
        <CheckCircle2 className="h-3 w-3" />
        Pilot Complete
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-800 hover:bg-amber-200">
        <Beaker className="h-3 w-3" />
        Pilot School
      </Badge>
      {showPhase && currentPhase && (
        <Badge variant="outline" className="text-xs">
          {PHASE_LABELS[currentPhase]}
        </Badge>
      )}
    </div>
  );
}
