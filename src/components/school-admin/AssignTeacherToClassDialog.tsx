/**
 * Assign Teacher to Class Dialog
 * Allows school admins to assign or change the teacher for a class
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, UserPlus, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSchoolTeachersWithClasses, useAssignTeacherToClass } from "@/hooks/useSchoolAdmin";

interface AssignTeacherToClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  className: string;
  currentTeacherId?: string;
  schoolId: string;
}

export function AssignTeacherToClassDialog({
  open,
  onOpenChange,
  classId,
  className,
  currentTeacherId,
  schoolId,
}: AssignTeacherToClassDialogProps) {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(currentTeacherId || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: teachers, isLoading } = useSchoolTeachersWithClasses(schoolId);
  const assignTeacher = useAssignTeacherToClass();

  const handleAssign = async () => {
    if (!selectedTeacherId) return;
    setIsSubmitting(true);
    try {
      await assignTeacher.mutateAsync({
        classId,
        teacherId: selectedTeacherId,
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Assign Teacher
          </DialogTitle>
          <DialogDescription>
            Select a teacher to assign to "{className}"
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : teachers && teachers.length > 0 ? (
          <RadioGroup
            value={selectedTeacherId}
            onValueChange={setSelectedTeacherId}
            className="space-y-3 max-h-64 overflow-y-auto"
          >
            {teachers.map((teacher) => (
              <div
                key={teacher.user_id}
                className="flex items-center space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setSelectedTeacherId(teacher.user_id)}
              >
                <RadioGroupItem value={teacher.user_id} id={teacher.user_id} />
                <Label
                  htmlFor={teacher.user_id}
                  className="flex items-center gap-3 flex-1 cursor-pointer"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {teacher.full_name?.charAt(0) || "T"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{teacher.full_name || "Unknown"}</p>
                    <p className="text-sm text-muted-foreground">
                      {teacher.class_count} {teacher.class_count === 1 ? "class" : "classes"} assigned
                    </p>
                  </div>
                  {teacher.user_id === currentTeacherId && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                      Current
                    </span>
                  )}
                </Label>
              </div>
            ))}
          </RadioGroup>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No teachers available. Invite teachers first before assigning them to classes.
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter className="pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={isSubmitting || !selectedTeacherId || selectedTeacherId === currentTeacherId}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Assigning...
              </>
            ) : (
              "Assign Teacher"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
