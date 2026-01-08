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

interface AddGuardianDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  students: Array<{ id: string; name: string }>;
}

export function AddGuardianDialog({
  open,
  onOpenChange,
  schoolId,
  students,
}: AddGuardianDialogProps) {
  const queryClient = useQueryClient();

  // Guardian info
  const [displayName, setDisplayName] = useState("");
  const [primaryPhone, setPrimaryPhone] = useState("");
  const [email, setEmail] = useState("");

  // Link to student
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [relationship, setRelationship] = useState("Parent");

  const resetForm = () => {
    setDisplayName("");
    setPrimaryPhone("");
    setEmail("");
    setSelectedStudentId("");
    setRelationship("Parent");
  };

  const addGuardianMutation = useMutation({
    mutationFn: async () => {
      // 1. Create the guardian
      const { data: guardian, error: guardianError } = await supabase
        .from("guardians")
        .insert({
          display_name: displayName.trim(),
          primary_phone: primaryPhone.trim() || null,
          email: email.trim() || null,
          school_id: schoolId,
        })
        .select()
        .single();

      if (guardianError) throw guardianError;

      // 2. Link to student if selected
      if (selectedStudentId && selectedStudentId !== "none") {
        const { error: linkError } = await supabase
          .from("guardian_student_links")
          .insert({
            guardian_id: guardian.id,
            student_id: selectedStudentId,
            role: "primary_guardian",
            relationship_label: relationship,
            can_pickup: true,
            can_make_decisions: true,
          });

        if (linkError) throw linkError;
      }

      return guardian;
    },
    onSuccess: () => {
      toast.success("Guardian added successfully");
      queryClient.invalidateQueries({ queryKey: ["school-guardians"] });
      queryClient.invalidateQueries({ queryKey: ["school-students"] });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error("Error adding guardian:", error);
      toast.error(error.message || "Failed to add guardian");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error("Guardian name is required");
      return;
    }
    if (!primaryPhone.trim() && !email.trim()) {
      toast.error("Please provide at least a phone number or email");
      return;
    }
    addGuardianMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add New Guardian
          </DialogTitle>
          <DialogDescription>
            Add a parent or guardian to your school. You can link them to students now or later.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <div>
              <Label htmlFor="displayName">Full Name *</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter guardian's full name"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="primaryPhone">Phone Number</Label>
                <Input
                  id="primaryPhone"
                  type="tel"
                  value={primaryPhone}
                  onChange={(e) => setPrimaryPhone(e.target.value)}
                  placeholder="+260..."
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
            </div>

            <div className="pt-2 border-t">
              <Label className="text-muted-foreground text-sm">Link to Student (Optional)</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div>
                  <Label htmlFor="studentId">Student</Label>
                  <Select
                    value={selectedStudentId || "none"}
                    onValueChange={(val) => setSelectedStudentId(val === "none" ? "" : val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Link later</SelectItem>
                      {students.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={addGuardianMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={addGuardianMutation.isPending}>
              {addGuardianMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Guardian"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
