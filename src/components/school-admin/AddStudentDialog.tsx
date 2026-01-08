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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, UserPlus } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useClassLevelTerminology } from "@/hooks/useClassLevelTerminology";

interface AddStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  classes: Array<{ id: string; name: string; grade: string | null }>;
}

export function AddStudentDialog({
  open,
  onOpenChange,
  schoolId,
  classes,
}: AddStudentDialogProps) {
  const queryClient = useQueryClient();
  const { config: terminologyConfig } = useClassLevelTerminology(schoolId);
  
  // Student info
  const [studentName, setStudentName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [grade, setGrade] = useState("");
  const [classId, setClassId] = useState("");
  
  // Guardian info
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [guardianRelationship, setGuardianRelationship] = useState("Parent");

  const resetForm = () => {
    setStudentName("");
    setStudentId("");
    setGrade("");
    setClassId("");
    setGuardianName("");
    setGuardianPhone("");
    setGuardianEmail("");
    setGuardianRelationship("Parent");
  };

  const addStudentMutation = useMutation({
    mutationFn: async () => {
      // Generate a student ID if not provided
      const finalStudentId = studentId || `STU-${Date.now().toString(36).toUpperCase()}`;
      
      // 1. Create the student
      const { data: student, error: studentError } = await supabase
        .from("students")
        .insert({
          name: studentName.trim(),
          student_id: finalStudentId,
          grade: grade || null,
          class_id: classId || null,
          school_id: schoolId,
        })
        .select()
        .single();

      if (studentError) throw studentError;

      // 2. Create guardian if info provided
      if (guardianName.trim()) {
        const { data: guardian, error: guardianError } = await supabase
          .from("guardians")
          .insert({
            display_name: guardianName.trim(),
            primary_phone: guardianPhone.trim() || null,
            email: guardianEmail.trim() || null,
            school_id: schoolId,
          })
          .select()
          .single();

        if (guardianError) throw guardianError;

        // 3. Link guardian to student
        const { error: linkError } = await supabase
          .from("guardian_student_links")
          .insert({
            guardian_id: guardian.id,
            student_id: student.id,
            role: "primary_guardian",
            relationship_label: guardianRelationship,
            can_pickup: true,
            can_make_decisions: true,
          });

        if (linkError) throw linkError;
      }

      return student;
    },
    onSuccess: () => {
      toast.success("Student added successfully");
      queryClient.invalidateQueries({ queryKey: ["school-students"] });
      queryClient.invalidateQueries({ queryKey: ["school-classes-details"] });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error("Error adding student:", error);
      if (error.code === "23505") {
        toast.error("A student with this ID already exists");
      } else {
        toast.error(error.message || "Failed to add student");
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      toast.error("Student name is required");
      return;
    }
    addStudentMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add New Student
          </DialogTitle>
          <DialogDescription>
            Add a student to your school. You can optionally assign them to a class and add guardian information.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Student Information */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Student Information</h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label htmlFor="studentName">Full Name *</Label>
                <Input
                  id="studentName"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Enter student's full name"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="studentId">Student ID</Label>
                <Input
                  id="studentId"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="Auto-generated if empty"
                />
              </div>
              
              <div>
                <Label htmlFor="grade">{terminologyConfig.singular}</Label>
                <Select value={grade} onValueChange={setGrade}>
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${terminologyConfig.singular.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {terminologyConfig.levels.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="classId">Assign to Class</Label>
                <Select 
                  value={classId || "none"} 
                  onValueChange={(val) => setClassId(val === "none" ? "" : val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No class (enroll later)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No class (enroll later)</SelectItem>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} {c.grade && `(${c.grade})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Guardian Information */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Guardian Information (Optional)</h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="guardianName">Guardian Name</Label>
                <Input
                  id="guardianName"
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  placeholder="Parent/Guardian name"
                />
              </div>
              
              <div>
                <Label htmlFor="guardianRelationship">Relationship</Label>
                <Select value={guardianRelationship} onValueChange={setGuardianRelationship}>
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
                <Label htmlFor="guardianPhone">Phone Number</Label>
                <Input
                  id="guardianPhone"
                  type="tel"
                  value={guardianPhone}
                  onChange={(e) => setGuardianPhone(e.target.value)}
                  placeholder="+260..."
                />
              </div>
              
              <div>
                <Label htmlFor="guardianEmail">Email</Label>
                <Input
                  id="guardianEmail"
                  type="email"
                  value={guardianEmail}
                  onChange={(e) => setGuardianEmail(e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={addStudentMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={addStudentMutation.isPending}>
              {addStudentMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Student"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
