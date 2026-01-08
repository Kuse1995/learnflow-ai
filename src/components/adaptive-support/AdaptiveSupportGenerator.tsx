import { useState } from "react";
import { Loader2, Sparkles, AlertTriangle, Info } from "lucide-react";
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
  useGenerateAdaptiveSupportPlan,
  useCanGenerateAdaptiveSupportPlan,
  type GenerationError,
} from "@/hooks/useAdaptiveSupportPlans";

interface Student {
  id: string;
  name: string;
}

/**
 * Adaptive Support Plan Generator
 * VISIBILITY: Teacher-only. Never expose to parents or students.
 * No notifications, analytics, scores, or progress indicators.
 */
interface AdaptiveSupportGeneratorProps {
  classId: string;
  students: Student[];
  trigger?: React.ReactNode;
}

export function AdaptiveSupportGenerator({ classId, students, trigger }: AdaptiveSupportGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  // Auto-select if only one student is provided
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  
  const generateMutation = useGenerateAdaptiveSupportPlan();
  
  // Check if selected student can have a new plan generated
  const { data: canGenerateCheck, isLoading: isCheckingCanGenerate } = useCanGenerateAdaptiveSupportPlan(
    selectedStudentId || undefined,
    classId
  );

  // Auto-select student when dialog opens with single student
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    setGenerationError(null);
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

    setGenerationError(null);

    try {
      const result = await generateMutation.mutateAsync({
        studentId: selectedStudentId,
        classId,
      });
      
      if (result.isDemoGenerated) {
        toast.success("Demo support plan generated", {
          description: "This is sample guidance for demonstration purposes.",
        });
      } else {
        toast.success("Adaptive support plan generated");
      }
      handleOpenChange(false);
    } catch (error: unknown) {
      const genError = error as GenerationError;
      const errorMessage = genError.message || "Failed to generate support plan";
      
      // Show error inline instead of toast for demo/service errors
      if (genError.isDemoError) {
        setGenerationError(errorMessage);
      } else {
        setGenerationError(errorMessage);
      }
    }
  };

  const canGenerate = selectedStudentId ? canGenerateCheck?.canGenerate !== false : false;
  const isSingleStudent = students.length === 1;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Sparkles className="h-4 w-4 mr-2" />
            Generate support plan
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Adaptive Support Plan</DialogTitle>
          <DialogDescription>
            Create personalized learning support suggestions based on recent evidence.
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

          {/* Generation Error Display */}
          {generationError && (
            <Alert variant="destructive">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {generationError}
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
