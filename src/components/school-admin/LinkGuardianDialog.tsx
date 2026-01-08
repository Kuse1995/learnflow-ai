import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Link2 } from "lucide-react";

interface LinkGuardianDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guardian: { id: string; display_name: string } | null;
  students: Array<{ id: string; name: string }>;
  existingLinks: string[]; // student IDs already linked
}

export function LinkGuardianDialog({
  open,
  onOpenChange,
  guardian,
  students,
  existingLinks,
}: LinkGuardianDialogProps) {
  const queryClient = useQueryClient();
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [relationship, setRelationship] = useState("Parent");

  const availableStudents = students.filter((s) => !existingLinks.includes(s.id));

  const linkMutation = useMutation({
    mutationFn: async () => {
      if (!guardian || !selectedStudentId) return;

      const { error } = await supabase.from("guardian_student_links").insert({
        guardian_id: guardian.id,
        student_id: selectedStudentId,
        role: "secondary_guardian",
        relationship_label: relationship,
        can_pickup: true,
        can_make_decisions: false,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Student linked successfully");
      queryClient.invalidateQueries({ queryKey: ["school-guardians"] });
      queryClient.invalidateQueries({ queryKey: ["school-students"] });
      setSelectedStudentId("");
      setRelationship("Parent");
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error("Error linking student:", error);
      if (error.code === "23505") {
        toast.error("This student is already linked to this guardian");
      } else {
        toast.error(error.message || "Failed to link student");
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      toast.error("Please select a student");
      return;
    }
    linkMutation.mutate();
  };

  if (!guardian) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Link Student
          </DialogTitle>
          <DialogDescription>
            Link a student to {guardian.display_name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <div>
              <Label htmlFor="studentId">Student *</Label>
              <Select
                value={selectedStudentId || "none"}
                onValueChange={(val) => setSelectedStudentId(val === "none" ? "" : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a student" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" disabled>
                    Select a student
                  </SelectItem>
                  {availableStudents.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableStudents.length === 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  All students are already linked to this guardian
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="relationship">Relationship</Label>
              <Select value={relationship} onValueChange={setRelationship}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Parent">Parent</SelectItem>
                  <SelectItem value="Mother">Mother</SelectItem>
                  <SelectItem value="Father">Father</SelectItem>
                  <SelectItem value="Guardian">Guardian</SelectItem>
                  <SelectItem value="Grandparent">Grandparent</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={linkMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={linkMutation.isPending || availableStudents.length === 0}
            >
              {linkMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Linking...
                </>
              ) : (
                "Link Student"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
