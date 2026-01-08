import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  PilotSchoolBadge,
  RolloutPhaseControl,
  PilotIncidentPanel,
  PilotMetricsDashboard,
  SchoolChangeLogViewer,
  TeacherFeedbackList,
} from "@/components/pilot";
import {
  usePilotSchools,
  useInitializePilotSchool,
  useSchoolRolloutStatus,
  useMarkPilotComplete,
  PHASE_LABELS,
} from "@/hooks/usePilotDeployment";

import { Beaker, Plus, School, CheckCircle2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function PlatformAdminPilot() {
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");
  const [showInitDialog, setShowInitDialog] = useState(false);
  const [newPilotSchoolId, setNewPilotSchoolId] = useState("");
  const [newPilotNotes, setNewPilotNotes] = useState("");

  const { data: pilotSchools, isLoading: pilotsLoading } = usePilotSchools();
  const { data: selectedRolloutStatus } = useSchoolRolloutStatus(selectedSchoolId);
  const initializePilot = useInitializePilotSchool();
  const markComplete = useMarkPilotComplete();


  const handleInitializePilot = async () => {
    if (!newPilotSchoolId) {
      toast.error("Please select a school");
      return;
    }

    try {
      await initializePilot.mutateAsync({
        schoolId: newPilotSchoolId,
        notes: newPilotNotes || undefined,
      });
      toast.success("Pilot school initialized successfully");
      setShowInitDialog(false);
      setNewPilotSchoolId("");
      setNewPilotNotes("");
      setSelectedSchoolId(newPilotSchoolId);
    } catch (error) {
      toast.error("Failed to initialize pilot school");
    }
  };

  const handleMarkComplete = async () => {
    if (!selectedSchoolId) return;

    try {
      await markComplete.mutateAsync(selectedSchoolId);
      toast.success("Pilot marked as complete");
    } catch (error) {
      toast.error("Failed to mark pilot as complete");
    }
  };

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Pilot Deployment</h1>
        <p className="text-muted-foreground">Manage pilot school rollouts and monitor progress</p>
      </div>

      {/* Pilot Schools Overview */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* School List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Beaker className="h-5 w-5" />
                Pilot Schools
              </div>
              <Dialog open={showInitDialog} onOpenChange={setShowInitDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1">
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Initialize Pilot School</DialogTitle>
                    <DialogDescription>
                      Select a school to add to the pilot program
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>School</Label>
                      <Select
                        value={newPilotSchoolId}
                        onValueChange={setNewPilotSchoolId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a school" />
                        </SelectTrigger>
                        <SelectContent>
                          {nonPilotSchools?.map((school) => (
                            <SelectItem key={school.id} value={school.id}>
                              {school.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Notes (optional)</Label>
                      <Textarea
                        placeholder="Add notes about this pilot..."
                        value={newPilotNotes}
                        onChange={(e) => setNewPilotNotes(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleInitializePilot}
                      disabled={initializePilot.isPending || !newPilotSchoolId}
                    >
                      {initializePilot.isPending
                        ? "Initializing..."
                        : "Initialize Pilot"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pilotsLoading ? (
              <p className="text-center text-muted-foreground">Loading...</p>
            ) : pilotSchools && pilotSchools.length > 0 ? (
              <div className="space-y-2">
                {pilotSchools.map((school) => (
                  <button
                    key={school.id}
                    onClick={() => setSelectedSchoolId(school.id)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted ${
                      selectedSchoolId === school.id
                        ? "border-primary bg-primary/5"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <School className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{school.name}</span>
                      </div>
                      {school.pilot_completed_at ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Active
                        </Badge>
                      )}
                    </div>
                    {school.pilot_started_at && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Started:{" "}
                        {format(new Date(school.pilot_started_at), "MMM d, yyyy")}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <Beaker className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p>No pilot schools yet</p>
                <p className="text-sm">Click "Add" to initialize a pilot</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selected School Details */}
        <div className="lg:col-span-2">
          {selectedSchoolId ? (
            <div className="space-y-6">
              {/* School Header */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>
                        {pilotSchools?.find((s) => s.id === selectedSchoolId)?.name}
                      </CardTitle>
                      <CardDescription>
                        {selectedRolloutStatus && (
                          <PilotSchoolBadge
                            isPilot={true}
                            currentPhase={selectedRolloutStatus.current_phase}
                            isComplete={selectedRolloutStatus.current_phase === 'completed'}
                          />
                        )}
                      </CardDescription>
                    </div>
                    {selectedRolloutStatus &&
                      selectedRolloutStatus.current_phase !== 'completed' && (
                        <Button
                          variant="outline"
                          onClick={handleMarkComplete}
                          disabled={markComplete.isPending}
                          className="gap-2"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Mark Complete
                        </Button>
                      )}
                  </div>
                </CardHeader>
              </Card>

              {/* Tabs */}
              <Tabs defaultValue="rollout">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="rollout">Rollout</TabsTrigger>
                  <TabsTrigger value="metrics">Metrics</TabsTrigger>
                  <TabsTrigger value="incidents">Incidents</TabsTrigger>
                  <TabsTrigger value="feedback">Feedback</TabsTrigger>
                  <TabsTrigger value="logs">Logs</TabsTrigger>
                </TabsList>

                <TabsContent value="rollout" className="mt-4">
                  <RolloutPhaseControl schoolId={selectedSchoolId} />
                </TabsContent>

                <TabsContent value="metrics" className="mt-4">
                  <PilotMetricsDashboard schoolId={selectedSchoolId} />
                </TabsContent>

                <TabsContent value="incidents" className="mt-4">
                  <PilotIncidentPanel schoolId={selectedSchoolId} />
                </TabsContent>

                <TabsContent value="feedback" className="mt-4">
                  <TeacherFeedbackList schoolId={selectedSchoolId} />
                </TabsContent>

                <TabsContent value="logs" className="mt-4">
                  <SchoolChangeLogViewer schoolId={selectedSchoolId} />
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <Card className="flex h-full min-h-[400px] items-center justify-center">
              <CardContent className="text-center text-muted-foreground">
                <Beaker className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p className="text-lg font-medium">Select a Pilot School</p>
                <p className="text-sm">
                  Choose a school from the list to view its pilot status
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
