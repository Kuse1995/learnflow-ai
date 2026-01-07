import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { useGenerateParentInsight, useStudentDraftInsight } from "@/hooks/useParentInsights";

interface Student {
  id: string;
  name: string;
}

interface ParentInsightGeneratorProps {
  classId: string;
  students: Student[];
  trigger?: React.ReactNode;
}

export function ParentInsightGenerator({ classId, students, trigger }: ParentInsightGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  
  const generateMutation = useGenerateParentInsight();
  
  // Check if selected student already has a draft
  const { data: existingDraft } = useStudentDraftInsight(
    selectedStudentId || undefined,
    classId
  );

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
      toast.success("Parent insight generated");
      setOpen(false);
      setSelectedStudentId("");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate insight");
    }
  };

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Sparkles className="h-4 w-4 mr-2" />
            Generate parent insight
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Parent Insight</DialogTitle>
          <DialogDescription>
            Create a parent-friendly summary of a student's learning journey.
            You'll be able to review and edit before it's shared.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
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

          {existingDraft && selectedStudent && (
            <p className="text-sm text-amber-600 mt-2">
              {selectedStudent.name} already has a draft insight pending review.
              Generating a new one will create an additional draft.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!selectedStudentId || generateMutation.isPending}
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
