import { useState } from "react";
import { Loader2, Route, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useGenerateLearningPath,
  useCanGenerateLearningPath,
} from "@/hooks/useLearningPaths";

interface Student {
  id: string;
  name: string;
}

/**
 * Learning Path Generator
 * 
 * CONSTRAINTS (enforced):
 * - VISIBILITY: Teacher-only. Never expose to parents or students.
 * - No notifications triggered by generation.
 * - No analytics, tracking, or scoring.
 * - No automatic generation—always requires manual teacher action.
 * - 14-day regeneration guard with acknowledgment requirement.
 */
interface LearningPathGeneratorProps {
  classId: string;
  students: Student[];
  trigger?: React.ReactNode;
}

export function LearningPathGenerator({ classId, students, trigger }: LearningPathGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  
  const generateMutation = useGenerateLearningPath();
  
  // Check if selected student can have a new path generated (14-day guard)
  const { data: canGenerateCheck, isLoading: isCheckingCanGenerate } = useCanGenerateLearningPath(
    selectedStudentId || undefined,
    classId
  );

  // Auto-select student when dialog opens with single student
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && students.length === 1) {
      setSelectedStudentId(students[0].id);
    } else if (!isOpen) {
      setSelectedStudentId("");
    }
  };

  const handleGenerate = async () => {
    if (!selectedStudentId) {
      toast.error("Please select a student");
      return;
    }

    try {
      await generateMutation.mutateAsync({
        studentId: selectedStudentId,
        classId,
      });
      toast.success("Learning path generated");
      handleOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to generate learning path");
    }
  };

  const canGenerate = selectedStudentId ? canGenerateCheck?.canGenerate !== false : false;
  const isSingleStudent = students.length === 1;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Route className="h-4 w-4 mr-2" />
            Generate learning path
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Learning Path</DialogTitle>
          <DialogDescription>
            Create personalized learning suggestions based on recent evidence.
            This guidance is optional and intended to support professional judgment.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {isSingleStudent ? (
            <div>
              <label className="text-sm font-medium mb-2 block">Student</label>
              <p className="text-sm text-muted-foreground">{students[0].name}</p>
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium mb-2 block">Select student</label>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a student..." />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Regeneration Guard Warning */}
          {selectedStudentId && !isCheckingCanGenerate && canGenerateCheck && !canGenerateCheck.canGenerate && (
            <Alert variant="default" className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 text-sm">
                {canGenerateCheck.reason}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!selectedStudentId || !canGenerate || generateMutation.isPending || isCheckingCanGenerate}
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generating...
              </>
            ) : (
              "Generate"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
