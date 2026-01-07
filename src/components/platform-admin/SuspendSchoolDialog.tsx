import { useState } from "react";
import { useSuspendSchool } from "@/hooks/useSuperAdmin";
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
import { AlertTriangle } from "lucide-react";

interface SuspendSchoolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  school: { id: string; name: string };
}

export function SuspendSchoolDialog({
  open,
  onOpenChange,
  school,
}: SuspendSchoolDialogProps) {
  const [reason, setReason] = useState("");
  const suspendSchool = useSuspendSchool();

  const handleSubmit = () => {
    if (!reason.trim()) return;

    suspendSchool.mutate(
      {
        schoolId: school.id,
        reason,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setReason("");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Suspend School
          </DialogTitle>
          <DialogDescription>
            Suspending "{school.name}" will prevent all AI features, uploads, and insight generation. Users can still log in and view existing data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/30">
            <p className="text-sm font-medium text-destructive">This action:</p>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
              <li>Disables all AI features for this school</li>
              <li>Blocks new uploads and analysis</li>
              <li>Prevents insight generation</li>
              <li>Is logged in the audit trail</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Suspension Reason (required)</Label>
            <Textarea
              id="reason"
              placeholder="Enter the reason for suspension..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-24"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!reason.trim() || suspendSchool.isPending}
          >
            {suspendSchool.isPending ? "Suspending..." : "Suspend School"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
