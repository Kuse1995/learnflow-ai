import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  usePilotIncidentControls,
  usePauseSchoolAI,
  useResumeSchoolAI,
  useUpdateIncidentControls,
} from "@/hooks/usePilotDeployment";
import {
  AlertTriangle,
  Pause,
  Play,
  BookOpen,
  MessageSquareWarning,
  ShieldAlert,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface PilotIncidentPanelProps {
  schoolId: string;
}

export function PilotIncidentPanel({ schoolId }: PilotIncidentPanelProps) {
  const [pauseReason, setPauseReason] = useState("");
  const [bannerMessage, setBannerMessage] = useState("");
  const [bannerSeverity, setBannerSeverity] = useState<"info" | "warning" | "error">("warning");

  const { data: controls, isLoading } = usePilotIncidentControls(schoolId);
  const pauseAI = usePauseSchoolAI();
  const resumeAI = useResumeSchoolAI();
  const updateControls = useUpdateIncidentControls();

  const handlePauseAI = async () => {
    if (!pauseReason.trim()) {
      toast.error("Please provide a reason for pausing AI");
      return;
    }

    try {
      await pauseAI.mutateAsync({ schoolId, reason: pauseReason });
      toast.success("AI paused for this school");
      setPauseReason("");
    } catch (error) {
      toast.error("Failed to pause AI");
    }
  };

  const handleResumeAI = async () => {
    try {
      await resumeAI.mutateAsync(schoolId);
      toast.success("AI resumed for this school");
    } catch (error) {
      toast.error("Failed to resume AI");
    }
  };

  const handleToggleReadOnly = async (enabled: boolean) => {
    try {
      await updateControls.mutateAsync({
        schoolId,
        controls: {
          read_only_mode: enabled,
          read_only_started_at: enabled ? new Date().toISOString() : null,
          read_only_reason: enabled ? "Manually enabled by admin" : null,
        },
      });
      toast.success(enabled ? "Read-only mode enabled" : "Read-only mode disabled");
    } catch (error) {
      toast.error("Failed to update read-only mode");
    }
  };

  const handleSetBanner = async () => {
    try {
      await updateControls.mutateAsync({
        schoolId,
        controls: {
          active_banner_message: bannerMessage || null,
          banner_severity: bannerMessage ? bannerSeverity : null,
        },
      });
      toast.success(bannerMessage ? "Banner message set" : "Banner cleared");
      if (!bannerMessage) setBannerMessage("");
    } catch (error) {
      toast.error("Failed to update banner");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading incident controls...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Incidents Summary */}
      {controls && (controls.ai_paused || controls.read_only_mode || controls.active_banner_message) && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Active Incident Controls</AlertTitle>
          <AlertDescription className="space-y-1">
            {controls.ai_paused && <div>• AI is currently paused</div>}
            {controls.read_only_mode && <div>• School is in read-only mode</div>}
            {controls.active_banner_message && <div>• Banner message is active</div>}
          </AlertDescription>
        </Alert>
      )}

      {/* AI Emergency Pause */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pause className="h-5 w-5 text-destructive" />
            AI Emergency Pause
          </CardTitle>
          <CardDescription>
            Immediately stop all AI operations for this school
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {controls?.ai_paused ? (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>AI is Currently Paused</AlertTitle>
                <AlertDescription>
                  <div className="mt-2 space-y-1 text-sm">
                    <div>
                      <strong>Paused at:</strong>{" "}
                      {controls.ai_paused_at &&
                        format(new Date(controls.ai_paused_at), "PPP 'at' p")}
                    </div>
                    <div>
                      <strong>Reason:</strong> {controls.ai_pause_reason}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
              <Button
                onClick={handleResumeAI}
                disabled={resumeAI.isPending}
                className="w-full gap-2"
              >
                <Play className="h-4 w-4" />
                {resumeAI.isPending ? "Resuming..." : "Resume AI Operations"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Reason for Pausing</Label>
                <Textarea
                  placeholder="Describe the issue requiring AI pause..."
                  value={pauseReason}
                  onChange={(e) => setPauseReason(e.target.value)}
                  rows={3}
                />
              </div>
              <Button
                variant="destructive"
                onClick={handlePauseAI}
                disabled={pauseAI.isPending || !pauseReason.trim()}
                className="w-full gap-2"
              >
                <Pause className="h-4 w-4" />
                {pauseAI.isPending ? "Pausing..." : "Pause AI (Emergency)"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Read-Only Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Read-Only Mode
          </CardTitle>
          <CardDescription>
            Prevent any data modifications for this school
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Read-Only Mode</Label>
              <p className="text-sm text-muted-foreground">
                Teachers can view but not modify data
              </p>
            </div>
            <Switch
              checked={controls?.read_only_mode ?? false}
              onCheckedChange={handleToggleReadOnly}
              disabled={updateControls.isPending}
            />
          </div>
          {controls?.read_only_mode && controls.read_only_started_at && (
            <p className="mt-2 text-xs text-muted-foreground">
              Enabled since:{" "}
              {format(new Date(controls.read_only_started_at), "PPP 'at' p")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Banner Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquareWarning className="h-5 w-5" />
            Teacher Banner Alert
          </CardTitle>
          <CardDescription>
            Display an alert banner to all teachers in this school
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {controls?.active_banner_message && (
            <Alert
              variant={controls.banner_severity === "error" ? "destructive" : "default"}
              className={
                controls.banner_severity === "warning"
                  ? "border-amber-500 bg-amber-50 text-amber-800"
                  : controls.banner_severity === "info"
                  ? "border-blue-500 bg-blue-50 text-blue-800"
                  : ""
              }
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Current Banner</AlertTitle>
              <AlertDescription>{controls.active_banner_message}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Banner Message</Label>
              <Input
                placeholder="Enter message to display to teachers..."
                value={bannerMessage}
                onChange={(e) => setBannerMessage(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Severity</Label>
              <Select
                value={bannerSeverity}
                onValueChange={(v: "info" | "warning" | "error") => setBannerSeverity(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-500">Info</Badge>
                      <span>General information</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="warning">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-amber-500">Warning</Badge>
                      <span>Important notice</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="error">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">Error</Badge>
                      <span>Critical issue</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSetBanner}
                disabled={updateControls.isPending}
                className="flex-1"
              >
                {controls?.active_banner_message ? "Update Banner" : "Set Banner"}
              </Button>
              {controls?.active_banner_message && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setBannerMessage("");
                    handleSetBanner();
                  }}
                  disabled={updateControls.isPending}
                >
                  Clear Banner
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
