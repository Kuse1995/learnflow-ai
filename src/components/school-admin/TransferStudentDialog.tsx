import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowRightLeft, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface Student {
  id: string;
  name: string;
  student_id: string;
  grade: string | null;
  class_id: string | null;
  class_name: string | null;
}

interface TransferStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
  schoolId: string;
  classes: Array<{ id: string; name: string; grade: string | null }>;
}

export function TransferStudentDialog({
  open,
  onOpenChange,
  student,
  schoolId,
  classes,
}: TransferStudentDialogProps) {
  const queryClient = useQueryClient();
  
  const [targetClassId, setTargetClassId] = useState("");
  const [transferReason, setTransferReason] = useState("");

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setTargetClassId("");
      setTransferReason("");
    }
  }, [open]);

  // Filter out the current class from available options
  const availableClasses = classes.filter(c => c.id !== student?.class_id);

  const transferMutation = useMutation({
    mutationFn: async () => {
      if (!student) throw new Error("No student selected");
      if (!targetClassId) throw new Error("Please select a target class");

      const targetClass = classes.find(c => c.id === targetClassId);
      const fromClass = student.class_name || "Unassigned";
      const toClass = targetClass?.name || "Unknown";

      // Update the student's class
      const { error: updateError } = await supabase
        .from("students")
        .update({
          class_id: targetClassId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", student.id);

      if (updateError) throw updateError;

      // Log the transfer in school_change_logs
      try {
        await supabase.from("school_change_logs").insert({
          school_id: schoolId,
          change_type: "student_transfer",
          change_description: `Transferred ${student.name} from ${fromClass} to ${toClass}${transferReason ? `: ${transferReason}` : ""}`,
          previous_value: {
            class_id: student.class_id,
            class_name: fromClass,
          },
          new_value: {
            class_id: targetClassId,
            class_name: toClass,
            reason: transferReason || null,
          },
        });
      } catch (logError) {
        // Non-critical - don't fail the transfer if logging fails
        console.warn("Failed to log transfer:", logError);
      }

      return { fromClass, toClass };
    },
    onSuccess: ({ fromClass, toClass }) => {
      toast.success(`${student?.name} transferred from ${fromClass} to ${toClass}`);
      queryClient.invalidateQueries({ queryKey: ["school-students"] });
      queryClient.invalidateQueries({ queryKey: ["school-classes-details"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error("Error transferring student:", error);
      toast.error(error.message || "Failed to transfer student");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetClassId) {
      toast.error("Please select a class to transfer to");
      return;
    }
    transferMutation.mutate();
  };

  if (!student) return null;

  const currentClass = student.class_name || "Unassigned";
  const targetClass = classes.find(c => c.id === targetClassId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Transfer Student
          </DialogTitle>
          <DialogDescription>
            Move <strong>{student.name}</strong> to a different class.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current status */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Student:</span>
              <span className="font-medium">{student.name}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Current Class:</span>
              {student.class_id ? (
                <Badge variant="secondary">{currentClass}</Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">Unassigned</Badge>
              )}
            </div>
          </div>

          {/* Transfer preview */}
          {targetClassId && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center gap-2">
                <Badge variant="outline">{currentClass}</Badge>
                <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                <Badge variant="default">{targetClass?.name}</Badge>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <div>
              <Label htmlFor="targetClass">Transfer To *</Label>
              <Select value={targetClassId} onValueChange={setTargetClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select destination class" />
                </SelectTrigger>
                <SelectContent>
                  {availableClasses.length > 0 ? (
                    availableClasses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} {c.grade && `(${c.grade})`}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No other classes available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="transferReason">Reason (Optional)</Label>
              <Textarea
                id="transferReason"
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                placeholder="e.g., Grade promotion, class balancing, parent request..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={transferMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={transferMutation.isPending || !targetClassId || availableClasses.length === 0}
            >
              {transferMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Transferring...
                </>
              ) : (
                "Transfer Student"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
