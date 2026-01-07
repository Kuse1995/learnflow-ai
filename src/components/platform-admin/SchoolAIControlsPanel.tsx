import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useSchoolAIControls, useUpdateSchoolAIControls } from "@/hooks/useLaunchMode";
import { Bot, Pause, Play, AlertTriangle, CheckCircle } from "lucide-react";

interface SchoolAIControlsPanelProps {
  schoolId: string;
  schoolName?: string;
}

const AVAILABLE_FEATURES = [
  { key: 'teaching_suggestions', label: 'Teaching Suggestions', description: 'AI-powered lesson recommendations' },
  { key: 'upload_analysis_limited', label: 'Upload Analysis', description: 'Basic work analysis' },
  { key: 'upload_analysis_full', label: 'Full Analysis', description: 'Detailed diagnostics' },
  { key: 'parent_insights', label: 'Parent Insights', description: 'Parent communication summaries' },
  { key: 'adaptive_support', label: 'Adaptive Support', description: 'Personalized learning paths' },
  { key: 'practice_generation', label: 'Practice Generation', description: 'Custom practice activities' },
];

export function SchoolAIControlsPanel({ schoolId, schoolName }: SchoolAIControlsPanelProps) {
  const { data: controls, isLoading } = useSchoolAIControls(schoolId);
  const updateControls = useUpdateSchoolAIControls();
  
  const [pauseReason, setPauseReason] = useState('');
  const [pauseHours, setPauseHours] = useState('24');

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  const isEnabled = controls?.ai_enabled ?? true;
  const isPaused = controls?.paused_until && new Date(controls.paused_until) > new Date();
  const allowedFeatures = controls?.allowed_features || ['teaching_suggestions', 'upload_analysis_limited'];

  const handleToggleAI = () => {
    updateControls.mutate({
      school_id: schoolId,
      ai_enabled: !isEnabled,
    });
  };

  const handlePauseAI = () => {
    const pauseUntil = new Date();
    pauseUntil.setHours(pauseUntil.getHours() + parseInt(pauseHours));
    
    updateControls.mutate({
      school_id: schoolId,
      paused_until: pauseUntil.toISOString(),
      pause_reason: pauseReason || 'Temporarily paused by administrator',
    });
  };

  const handleResumeAI = () => {
    updateControls.mutate({
      school_id: schoolId,
      paused_until: null,
      pause_reason: null,
    });
  };

  const handleToggleFeature = (featureKey: string) => {
    const newFeatures = allowedFeatures.includes(featureKey)
      ? allowedFeatures.filter(f => f !== featureKey)
      : [...allowedFeatures, featureKey];
    
    updateControls.mutate({
      school_id: schoolId,
      allowed_features: newFeatures,
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bot className="h-5 w-5 text-accent" />
            <div>
              <CardTitle className="text-lg">
                AI Controls {schoolName && `- ${schoolName}`}
              </CardTitle>
              <CardDescription>
                Manage AI feature access for this school
              </CardDescription>
            </div>
          </div>
          <Badge variant={isEnabled && !isPaused ? 'default' : 'secondary'}>
            {isPaused ? 'Paused' : isEnabled ? 'Active' : 'Disabled'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Master Toggle */}
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
          <div>
            <p className="font-medium">AI Features Enabled</p>
            <p className="text-sm text-muted-foreground">
              Master switch for all AI capabilities
            </p>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={handleToggleAI}
            disabled={updateControls.isPending}
          />
        </div>

        {/* Pause Controls */}
        {isEnabled && (
          <div className="p-4 border rounded-lg space-y-4">
            <div className="flex items-center gap-2">
              {isPaused ? (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              <span className="font-medium">
                {isPaused ? 'AI Currently Paused' : 'AI Running Normally'}
              </span>
            </div>

            {isPaused ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Reason: {controls?.pause_reason || 'No reason provided'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Resumes: {new Date(controls!.paused_until!).toLocaleString()}
                </p>
                <Button onClick={handleResumeAI} disabled={updateControls.isPending}>
                  <Play className="h-4 w-4 mr-2" />
                  Resume AI Now
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid gap-2">
                  <Label htmlFor="pause-reason">Pause Reason</Label>
                  <Textarea
                    id="pause-reason"
                    value={pauseReason}
                    onChange={(e) => setPauseReason(e.target.value)}
                    placeholder="e.g., Scheduled maintenance, Investigating issue..."
                    rows={2}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pause-hours">Pause Duration (hours)</Label>
                  <Input
                    id="pause-hours"
                    type="number"
                    value={pauseHours}
                    onChange={(e) => setPauseHours(e.target.value)}
                    min="1"
                    max="168"
                  />
                </div>
                <Button 
                  variant="secondary" 
                  onClick={handlePauseAI}
                  disabled={updateControls.isPending}
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Pause AI
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Feature Toggles */}
        {isEnabled && !isPaused && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">
              Enabled Features
            </h4>
            <div className="grid gap-2">
              {AVAILABLE_FEATURES.map((feature) => (
                <div
                  key={feature.key}
                  className="flex items-center justify-between p-3 bg-muted/20 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-sm">{feature.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                  <Switch
                    checked={allowedFeatures.includes(feature.key)}
                    onCheckedChange={() => handleToggleFeature(feature.key)}
                    disabled={updateControls.isPending}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
