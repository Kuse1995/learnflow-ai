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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Loader2, UserPlus, KeyRound } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

  // Account creation
  const [createAccount, setCreateAccount] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  // Link to students (multiple)
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [relationship, setRelationship] = useState("Parent");

  const resetForm = () => {
    setDisplayName("");
    setPrimaryPhone("");
    setEmail("");
    setCreateAccount(false);
    setTempPassword(null);
    setSelectedStudentIds([]);
    setRelationship("Parent");
  };

  const toggleStudent = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
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

      // 2. Link to all selected students
      if (selectedStudentIds.length > 0) {
        const links = selectedStudentIds.map((studentId, index) => {
          const role: "primary_guardian" | "secondary_guardian" = index === 0 ? "primary_guardian" : "secondary_guardian";
          return {
            guardian_id: guardian.id,
            student_id: studentId,
            role,
            relationship_label: relationship,
            can_pickup: true,
            can_make_decisions: index === 0,
          };
        });

        const { error: linkError } = await supabase
          .from("guardian_student_links")
          .insert(links);

        if (linkError) throw linkError;
      }

      // 3. Create account if requested
      let accountPassword: string | null = null;
      if (createAccount && email.trim()) {
        const { data: accountData, error: accountError } = await supabase.functions.invoke(
          "create-parent-account",
          {
            body: {
              guardianId: guardian.id,
              email: email.trim(),
              displayName: displayName.trim(),
              schoolId,
            },
          }
        );

        if (accountError) {
          console.error("Account creation error:", accountError);
          toast.error("Guardian added but account creation failed");
        } else if (accountData?.tempPassword) {
          accountPassword = accountData.tempPassword;
        } else if (accountData?.existingAccount) {
          toast.info("Linked to existing account");
        }
      }

      return { guardian, tempPassword: accountPassword };
    },
    onSuccess: (data) => {
      const count = selectedStudentIds.length;
      
      if (data.tempPassword) {
        setTempPassword(data.tempPassword);
        toast.success("Guardian added with account created!");
      } else {
        toast.success(
          count > 0
            ? `Guardian added and linked to ${count} student${count > 1 ? "s" : ""}`
            : "Guardian added successfully"
        );
        queryClient.invalidateQueries({ queryKey: ["school-guardians"] });
        queryClient.invalidateQueries({ queryKey: ["school-students"] });
        resetForm();
        onOpenChange(false);
      }
    },
    onError: (error: any) => {
      console.error("Error adding guardian:", error);
      toast.error(error.message || "Failed to add guardian");
    },
  });

  const handleClose = () => {
    if (tempPassword) {
      queryClient.invalidateQueries({ queryKey: ["school-guardians"] });
      queryClient.invalidateQueries({ queryKey: ["school-students"] });
      resetForm();
    }
    onOpenChange(false);
  };

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
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {tempPassword ? "Account Created" : "Add New Guardian"}
          </DialogTitle>
          <DialogDescription>
            {tempPassword 
              ? "Share these login credentials with the parent securely."
              : "Add a parent or guardian. You can link them to multiple students (e.g., siblings)."}
          </DialogDescription>
        </DialogHeader>

        {tempPassword ? (
          <div className="space-y-4 py-4">
            <Alert>
              <KeyRound className="h-4 w-4" />
              <AlertDescription className="space-y-3">
                <p className="font-medium">Login credentials for {displayName}:</p>
                <div className="bg-muted p-3 rounded-md space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-mono">{email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Temp Password:</span>
                    <span className="font-mono">{tempPassword}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  The parent should change this password after first login.
                </p>
              </AlertDescription>
            </Alert>
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
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

            {/* Create Account Option */}
            {email.trim() && (
              <div className="flex items-center justify-between py-3 px-3 bg-muted/50 rounded-md">
                <div className="space-y-0.5">
                  <Label htmlFor="createAccount" className="text-sm font-medium">
                    Create login account
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Generate credentials so this parent can log in
                  </p>
                </div>
                <Switch
                  id="createAccount"
                  checked={createAccount}
                  onCheckedChange={setCreateAccount}
                />
              </div>
            )}

            <div className="pt-2 border-t space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground text-sm">
                  Link to Students (Optional)
                </Label>
                {selectedStudentIds.length > 0 && (
                  <span className="text-xs text-primary font-medium">
                    {selectedStudentIds.length} selected
                  </span>
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

              <div>
                <Label className="text-sm">Select Students</Label>
                <ScrollArea className="h-[120px] border rounded-md p-2 mt-1">
                  {students.length > 0 ? (
                    <div className="space-y-2">
                      {students.map((student) => (
                        <div
                          key={student.id}
                          className="flex items-center space-x-2 py-1"
                        >
                          <Checkbox
                            id={`student-${student.id}`}
                            checked={selectedStudentIds.includes(student.id)}
                            onCheckedChange={() => toggleStudent(student.id)}
                          />
                          <label
                            htmlFor={`student-${student.id}`}
                            className="text-sm cursor-pointer flex-1"
                          >
                            {student.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No students available
                    </p>
                  )}
                </ScrollArea>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
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
        )}
      </DialogContent>
    </Dialog>
  );
}
