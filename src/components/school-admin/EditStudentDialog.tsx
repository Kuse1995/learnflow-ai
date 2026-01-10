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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, UserCog } from "lucide-react";
import { useClassLevelTerminology } from "@/hooks/useClassLevelTerminology";

interface Student {
  id: string;
  name: string;
  student_id: string;
  grade: string | null;
  class_id: string | null;
  class_name: string | null;
}

interface EditStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
  schoolId: string;
  classes: Array<{ id: string; name: string; grade: string | null }>;
}

export function EditStudentDialog({
  open,
  onOpenChange,
  student,
  schoolId,
  classes,
}: EditStudentDialogProps) {
  const queryClient = useQueryClient();
  const { config: terminologyConfig } = useClassLevelTerminology(schoolId);
  
  const [studentName, setStudentName] = useState("");
  const [studentIdValue, setStudentIdValue] = useState("");
  const [grade, setGrade] = useState("");
  const [classId, setClassId] = useState("");

  // Sync form state when student changes
  useEffect(() => {
    if (student) {
      setStudentName(student.name);
      setStudentIdValue(student.student_id);
      setGrade(student.grade || "");
      setClassId(student.class_id || "");
    }
  }, [student]);

  const updateStudentMutation = useMutation({
    mutationFn: async () => {
      if (!student) throw new Error("No student selected");

      const { error } = await supabase
        .from("students")
        .update({
          name: studentName.trim(),
          student_id: studentIdValue.trim(),
          grade: grade || null,
          class_id: classId || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", student.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Student updated successfully");
      queryClient.invalidateQueries({ queryKey: ["school-students"] });
      queryClient.invalidateQueries({ queryKey: ["school-classes-details"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error("Error updating student:", error);
      if (error.code === "23505") {
        toast.error("A student with this ID already exists");
      } else {
        toast.error(error.message || "Failed to update student");
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      toast.error("Student name is required");
      return;
    }
    if (!studentIdValue.trim()) {
      toast.error("Student ID is required");
      return;
    }
    updateStudentMutation.mutate();
  };

  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Edit Student
          </DialogTitle>
          <DialogDescription>
            Update student information and class assignment.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <div>
              <Label htmlFor="editStudentName">Full Name *</Label>
              <Input
                id="editStudentName"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Enter student's full name"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="editStudentId">Student ID *</Label>
              <Input
                id="editStudentId"
                value={studentIdValue}
                onChange={(e) => setStudentIdValue(e.target.value)}
                placeholder="Student ID"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="editGrade">{terminologyConfig.singular}</Label>
              <Select value={grade || "none"} onValueChange={(val) => setGrade(val === "none" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${terminologyConfig.singular.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not specified</SelectItem>
                  {terminologyConfig.levels.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="editClassId">Assigned Class</Label>
              <Select 
                value={classId || "none"} 
                onValueChange={(val) => setClassId(val === "none" ? "" : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No class assigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No class (unassigned)</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.grade && `(${c.grade})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateStudentMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateStudentMutation.isPending}>
              {updateStudentMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
