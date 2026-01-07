import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { useGenerateLessonSuggestion } from "@/hooks/useLessonDifferentiation";

interface LessonDifferentiationFormProps {
  classId: string;
  className: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function LessonDifferentiationForm({
  classId,
  className,
  trigger,
  onSuccess,
}: LessonDifferentiationFormProps) {
  const [open, setOpen] = useState(false);
  const [lessonTopic, setLessonTopic] = useState("");
  const [lessonObjective, setLessonObjective] = useState("");
  const [duration, setDuration] = useState<string>("");
  const { mutateAsync: generate, isPending } = useGenerateLessonSuggestion();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonTopic.trim() || !lessonObjective.trim()) return;

    try {
      await generate({
        classId,
        lessonTopic,
        lessonObjective,
        lessonDurationMinutes: duration ? parseInt(duration, 10) : undefined,
      });
      toast.success("Differentiated lesson generated successfully");
      setOpen(false);
      setLessonTopic("");
      setLessonObjective("");
      setDuration("");
      onSuccess?.();
    } catch (error) {
      console.error("Generate lesson error:", error);
      toast.error("Failed to generate lesson. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Generate Lesson
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Differentiated Lesson</DialogTitle>
          <DialogDescription>
            Create an AI-assisted lesson plan adapted for diverse learners in {className}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="topic">Lesson Topic</Label>
            <Input
              id="topic"
              placeholder="e.g., Introduction to Fractions"
              value={lessonTopic}
              onChange={(e) => setLessonTopic(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="objective">Learning Objective</Label>
            <Textarea
              id="objective"
              placeholder="e.g., Students will be able to identify and compare simple fractions using visual models"
              value={lessonObjective}
              onChange={(e) => setLessonObjective(e.target.value)}
              rows={3}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="duration">Lesson Duration (optional)</Label>
            <Input
              id="duration"
              type="number"
              placeholder="e.g., 45"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              min={5}
              max={180}
            />
            <p className="text-xs text-muted-foreground">Duration in minutes</p>
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <>
                <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Lesson
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
