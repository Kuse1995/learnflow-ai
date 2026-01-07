import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Power } from "lucide-react";
import { useToggleAiKillSwitch, useUpdateAiFeatureToggles } from "@/hooks/useSuperAdmin";
import type { PlatformAiControls, FeatureToggles } from "@/types/platform-admin";
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
import { Textarea } from "@/components/ui/textarea";

interface AiControlsCardProps {
  controls: PlatformAiControls | null | undefined;
  isLoading: boolean;
}

const FEATURE_LABELS: Record<keyof FeatureToggles, string> = {
  upload_analysis: "Upload Analysis",
  teaching_suggestions: "Teaching Suggestions",
  learning_paths: "Learning Paths",
  adaptive_support: "Adaptive Support",
  parent_insights: "Parent Insights",
  practice_generation: "Practice Generation",
};

export function AiControlsCard({ controls, isLoading }: AiControlsCardProps) {
  const [killSwitchReason, setKillSwitchReason] = useState("");
  const toggleKillSwitch = useToggleAiKillSwitch();
  const updateFeatures = useUpdateAiFeatureToggles();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const handleFeatureToggle = (feature: keyof FeatureToggles) => {
    if (!controls) return;
    const newToggles = {
      ...controls.feature_toggles,
      [feature]: !controls.feature_toggles[feature],
    };
    updateFeatures.mutate(newToggles);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Power className="h-5 w-5" />
          AI Controls
        </CardTitle>
        <CardDescription>
          Global AI feature controls and emergency kill switch
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Kill Switch */}
        <div className={`p-4 rounded-lg border-2 ${controls?.kill_switch_active ? 'border-destructive bg-destructive/10' : 'border-muted'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-5 w-5 ${controls?.kill_switch_active ? 'text-destructive' : 'text-muted-foreground'}`} />
              <div>
                <p className="font-semibold">Emergency Kill Switch</p>
                <p className="text-sm text-muted-foreground">
                  {controls?.kill_switch_active 
                    ? "AI is DISABLED across all schools" 
                    : "Instantly disable all AI features"}
                </p>
              </div>
            </div>

            {controls?.kill_switch_active ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline">Deactivate</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Deactivate Kill Switch?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will re-enable AI features across all schools based on their individual toggles.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => toggleKillSwitch.mutate({ activate: false })}
                    >
                      Deactivate
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">Activate Kill Switch</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-destructive">⚠️ Activate Kill Switch?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will IMMEDIATELY disable ALL AI features across ALL schools. This action is logged.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="py-4">
                    <Label htmlFor="reason">Reason (required for audit)</Label>
                    <Textarea
                      id="reason"
                      placeholder="Enter reason for activating kill switch..."
                      value={killSwitchReason}
                      onChange={(e) => setKillSwitchReason(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => toggleKillSwitch.mutate({ activate: true, reason: killSwitchReason })}
                      disabled={!killSwitchReason.trim()}
                    >
                      ACTIVATE KILL SWITCH
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* Feature Toggles */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Feature Toggles</p>
          <div className="grid grid-cols-2 gap-3">
            {controls && Object.entries(FEATURE_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between p-2 rounded border">
                <Label htmlFor={key} className="text-sm">{label}</Label>
                <Switch
                  id={key}
                  checked={controls.feature_toggles[key as keyof FeatureToggles]}
                  onCheckedChange={() => handleFeatureToggle(key as keyof FeatureToggles)}
                  disabled={controls.kill_switch_active || updateFeatures.isPending}
                />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
