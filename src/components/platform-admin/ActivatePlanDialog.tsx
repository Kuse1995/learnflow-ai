import { useState } from "react";
import { useActivatePlan } from "@/hooks/useSuperAdmin";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Plan } from "@/types/platform-admin";

interface ActivatePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  school: { id: string; name: string };
  plans: Plan[];
  currentPlanId?: string;
}

export function ActivatePlanDialog({
  open,
  onOpenChange,
  school,
  plans,
  currentPlanId,
}: ActivatePlanDialogProps) {
  const [selectedPlanId, setSelectedPlanId] = useState(currentPlanId || "");
  const [expiresAt, setExpiresAt] = useState("");
  const [notes, setNotes] = useState("");
  const activatePlan = useActivatePlan();

  const handleSubmit = () => {
    if (!selectedPlanId) return;

    activatePlan.mutate(
      {
        schoolId: school.id,
        planId: selectedPlanId,
        expiresAt: expiresAt || undefined,
        notes: notes || undefined,
        superAdminOverride: true, // Bypass all billing/demo checks
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setSelectedPlanId("");
          setExpiresAt("");
          setNotes("");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {currentPlanId ? "Change Plan" : "Activate Plan"}
          </DialogTitle>
          <DialogDescription>
            {currentPlanId
              ? `Change the subscription plan for "${school.name}"`
              : `Activate a subscription plan for "${school.name}"`}
            <span className="block text-xs mt-1 text-primary font-medium">
              Super Admin Override: Bypasses billing checks • Changes apply immediately
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="plan">Select Plan</Label>
            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a plan..." />
              </SelectTrigger>
              <SelectContent>
                {plans
                  .filter((p) => p.is_active)
                  .map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.display_name}
                      {plan.price_monthly && ` — $${plan.price_monthly}/mo`}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expires">Expiration Date (optional)</Label>
            <Input
              id="expires"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty for no expiration
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Internal Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add internal notes about this activation..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedPlanId || activatePlan.isPending}
          >
            {activatePlan.isPending
              ? "Activating..."
              : currentPlanId
              ? "Change Plan"
              : "Activate Plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
