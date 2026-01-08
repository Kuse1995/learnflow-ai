/**
 * Manual Plan Management for School Admins
 * Stripe-ready but manual-first approach
 * Designed for Zambian school realities (bank transfers, mobile money, cash)
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, Pause, Play, Plus, Calendar, FileText } from "lucide-react";
import { format } from "date-fns";
import { useManualPlanAssignments, useAssignPlan, usePausePlan, useResumePlan, ManualPlanAssignment } from "@/hooks/useSchoolAdmin";

interface ManualPlanManagerProps {
  schoolId: string;
}

const PLAN_TYPES = [
  { value: "starter", label: "Starter", description: "Basic features for small schools" },
  { value: "standard", label: "Standard", description: "Full features for growing schools" },
  { value: "premium", label: "Premium", description: "All features with priority support" },
];

const DURATION_TYPES = [
  { value: "monthly", label: "Monthly" },
  { value: "term", label: "Term (3 months)" },
  { value: "annual", label: "Annual" },
];

const PAYMENT_METHODS = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "cash", label: "Cash Payment" },
  { value: "other", label: "Other" },
];

function AssignPlanDialog({ schoolId, onClose }: { schoolId: string; onClose: () => void }) {
  const [planType, setPlanType] = useState<"starter" | "standard" | "premium">("standard");
  const [durationType, setDurationType] = useState<"monthly" | "term" | "annual">("term");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [endDate, setEndDate] = useState("");

  const assignPlan = useAssignPlan();

  const handleSubmit = async () => {
    await assignPlan.mutateAsync({
      school_id: schoolId,
      plan_type: planType,
      duration_type: durationType,
      payment_method: paymentMethod || undefined,
      payment_reference: paymentReference || undefined,
      internal_notes: internalNotes || undefined,
      end_date: endDate || null,
    });
    onClose();
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Assign Subscription Plan</DialogTitle>
        <DialogDescription>
          Set up access for this school. You can update or pause this at any time.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>Plan Type</Label>
          <Select value={planType} onValueChange={(v) => setPlanType(v as typeof planType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLAN_TYPES.map((plan) => (
                <SelectItem key={plan.value} value={plan.value}>
                  <div>
                    <div className="font-medium">{plan.label}</div>
                    <div className="text-xs text-muted-foreground">{plan.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Duration</Label>
          <Select value={durationType} onValueChange={(v) => setDurationType(v as typeof durationType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DURATION_TYPES.map((duration) => (
                <SelectItem key={duration.value} value={duration.value}>
                  {duration.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>End Date (Optional)</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Leave blank if not yet determined
          </p>
        </div>

        <div className="space-y-2">
          <Label>Payment Method</Label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger>
              <SelectValue placeholder="Select payment method..." />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((method) => (
                <SelectItem key={method.value} value={method.value}>
                  {method.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Payment Reference</Label>
          <Input
            placeholder="e.g., Receipt #, Transaction ID..."
            value={paymentReference}
            onChange={(e) => setPaymentReference(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Internal Notes</Label>
          <Textarea
            placeholder="Notes for your records (not visible to teachers)..."
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            rows={3}
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={assignPlan.isPending}>
          {assignPlan.isPending ? "Assigning..." : "Assign Plan"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function PlanStatusBadge({ assignment }: { assignment: ManualPlanAssignment }) {
  if (assignment.paused_at) {
    return <Badge variant="secondary">Paused</Badge>;
  }
  if (!assignment.is_active) {
    return <Badge variant="outline">Inactive</Badge>;
  }
  return <Badge className="bg-primary/10 text-primary border-primary/20">Active</Badge>;
}

export function ManualPlanManager({ schoolId }: ManualPlanManagerProps) {
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [pauseReason, setPauseReason] = useState("");
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);

  const { data: assignments, isLoading } = useManualPlanAssignments(schoolId);
  const pausePlan = usePausePlan();
  const resumePlan = useResumePlan();

  const activeAssignment = assignments?.find((a) => a.is_active && !a.paused_at);

  const handlePause = async (assignmentId: string) => {
    if (!pauseReason.trim()) return;
    await pausePlan.mutateAsync({ assignmentId, reason: pauseReason });
    setPauseReason("");
    setSelectedAssignment(null);
  };

  const handleResume = async (assignmentId: string) => {
    await resumePlan.mutateAsync(assignmentId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Subscription Management</h2>
          <p className="text-muted-foreground text-sm">
            Manage access plans for your school
          </p>
        </div>
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Assign Plan
            </Button>
          </DialogTrigger>
          <AssignPlanDialog schoolId={schoolId} onClose={() => setIsAssignDialogOpen(false)} />
        </Dialog>
      </div>

      {/* Current Plan Card */}
      {activeAssignment && (
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Current Plan
                </CardTitle>
                <CardDescription>Active subscription details</CardDescription>
              </div>
              <Badge className="text-lg px-3 py-1 capitalize">
                {activeAssignment.plan_type}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Duration</p>
                <p className="font-medium capitalize">{activeAssignment.duration_type}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Started</p>
                <p className="font-medium">{format(new Date(activeAssignment.start_date), "MMM d, yyyy")}</p>
              </div>
              {activeAssignment.end_date && (
                <div>
                  <p className="text-muted-foreground">Expires</p>
                  <p className="font-medium">{format(new Date(activeAssignment.end_date), "MMM d, yyyy")}</p>
                </div>
              )}
              {activeAssignment.payment_method && (
                <div>
                  <p className="text-muted-foreground">Payment</p>
                  <p className="font-medium capitalize">{activeAssignment.payment_method.replace("_", " ")}</p>
                </div>
              )}
            </div>
            {activeAssignment.internal_notes && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  Internal Notes
                </p>
                <p className="text-sm mt-1">{activeAssignment.internal_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Plan History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Plan History
          </CardTitle>
          <CardDescription>
            Record of all plan assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : assignments?.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No plans assigned yet. Click "Assign Plan" to get started.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments?.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium capitalize">
                      {assignment.plan_type}
                    </TableCell>
                    <TableCell className="capitalize">
                      {assignment.duration_type}
                    </TableCell>
                    <TableCell>
                      {format(new Date(assignment.start_date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <PlanStatusBadge assignment={assignment} />
                    </TableCell>
                    <TableCell className="text-right">
                      {assignment.is_active && !assignment.paused_at && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="gap-1">
                              <Pause className="h-3 w-3" />
                              Pause
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Pause Access</DialogTitle>
                              <DialogDescription>
                                Temporarily pause this plan. Teachers will lose access until resumed.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                              <Label>Reason for pausing</Label>
                              <Textarea
                                placeholder="e.g., Payment pending, temporary hold..."
                                value={pauseReason}
                                onChange={(e) => setPauseReason(e.target.value)}
                                className="mt-2"
                              />
                            </div>
                            <DialogFooter>
                              <Button
                                variant="destructive"
                                onClick={() => handlePause(assignment.id)}
                                disabled={!pauseReason.trim() || pausePlan.isPending}
                              >
                                Pause Access
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                      {assignment.paused_at && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1"
                          onClick={() => handleResume(assignment.id)}
                          disabled={resumePlan.isPending}
                        >
                          <Play className="h-3 w-3" />
                          Resume
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Future Stripe Integration Note */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="py-4 text-center">
          <p className="text-sm text-muted-foreground">
            💳 Online payment integration coming soon. Manual management will always remain available.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
