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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [relationship, setRelationship] = useState("Parent");

  const availableStudents = students.filter((s) => !existingLinks.includes(s.id));

  const toggleStudent = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const linkMutation = useMutation({
    mutationFn: async () => {
      if (!guardian || selectedStudentIds.length === 0) return;

      const links = selectedStudentIds.map((studentId) => ({
        guardian_id: guardian.id,
        student_id: studentId,
        role: "secondary_guardian" as const,
        relationship_label: relationship,
        can_pickup: true,
        can_make_decisions: false,
      }));

      const { error } = await supabase.from("guardian_student_links").insert(links);

      if (error) throw error;
    },
    onSuccess: () => {
      const count = selectedStudentIds.length;
      toast.success(`${count} student${count > 1 ? "s" : ""} linked successfully`);
      queryClient.invalidateQueries({ queryKey: ["school-guardians"] });
      queryClient.invalidateQueries({ queryKey: ["school-students"] });
      setSelectedStudentIds([]);
      setRelationship("Parent");
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error("Error linking students:", error);
      if (error.code === "23505") {
        toast.error("One or more students are already linked to this guardian");
      } else {
        toast.error(error.message || "Failed to link students");
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudentIds.length === 0) {
      toast.error("Please select at least one student");
      return;
    }
    linkMutation.mutate();
  };

  if (!guardian) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Link Students
          </DialogTitle>
          <DialogDescription>
            Link one or more students to {guardian.display_name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
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

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-sm">Select Students *</Label>
                {selectedStudentIds.length > 0 && (
                  <span className="text-xs text-primary font-medium">
                    {selectedStudentIds.length} selected
                  </span>
                )}
              </div>
              <ScrollArea className="h-[180px] border rounded-md p-2">
                {availableStudents.length > 0 ? (
                  <div className="space-y-2">
                    {availableStudents.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center space-x-2 py-1"
                      >
                        <Checkbox
                          id={`link-student-${student.id}`}
                          checked={selectedStudentIds.includes(student.id)}
                          onCheckedChange={() => toggleStudent(student.id)}
                        />
                        <label
                          htmlFor={`link-student-${student.id}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {student.name}
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    All students are already linked to this guardian
                  </p>
                )}
              </ScrollArea>
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
              disabled={linkMutation.isPending || availableStudents.length === 0 || selectedStudentIds.length === 0}
            >
              {linkMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Linking...
                </>
              ) : (
                `Link ${selectedStudentIds.length > 0 ? selectedStudentIds.length : ""} Student${selectedStudentIds.length !== 1 ? "s" : ""}`
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
