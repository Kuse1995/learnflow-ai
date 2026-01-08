import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MessageCircleQuestion, Send } from "lucide-react";
import { useSubmitQuickFeedback } from "@/hooks/useTeacherTraining";
import { toast } from "sonner";

interface QuickFeedbackButtonProps {
  featureArea?: string;
  schoolId?: string;
  teacherId?: string;
}

type FeedbackType = 'confused' | 'suggestion' | 'issue' | 'praise';

const FEEDBACK_OPTIONS: { value: FeedbackType; label: string; description: string }[] = [
  { value: 'confused', label: 'Something confused me', description: 'Part of the system was unclear' },
  { value: 'suggestion', label: 'I have a suggestion', description: 'An idea for improvement' },
  { value: 'issue', label: 'Something isn\'t working', description: 'A bug or problem' },
  { value: 'praise', label: 'Something worked well', description: 'Positive feedback' },
];

export function QuickFeedbackButton({ featureArea, schoolId, teacherId }: QuickFeedbackButtonProps) {
  const [open, setOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('confused');
  const [message, setMessage] = useState("");
  
  const submitFeedback = useSubmitQuickFeedback();

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    try {
      await submitFeedback.mutateAsync({
        feedback_type: feedbackType,
        feature_area: featureArea,
        message: message.trim(),
        school_id: schoolId,
        teacher_id: teacherId,
      });

      toast.success("Thank you for your feedback!", {
        description: "Your input helps us improve the system.",
      });

      setOpen(false);
      setMessage("");
      setFeedbackType('confused');
    } catch {
      toast.error("Failed to submit feedback");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <MessageCircleQuestion className="h-4 w-4" />
          <span className="hidden sm:inline">Feedback</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Your Thoughts</DialogTitle>
          <DialogDescription>
            Your feedback helps us improve. No pressure—just share what's on your mind.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label>What would you like to share?</Label>
            <RadioGroup
              value={feedbackType}
              onValueChange={(v) => setFeedbackType(v as FeedbackType)}
              className="space-y-2"
            >
              {FEEDBACK_OPTIONS.map((option) => (
                <div
                  key={option.value}
                  className={`flex items-center space-x-3 rounded-lg border p-3 transition-colors ${
                    feedbackType === option.value ? 'border-primary bg-primary/5' : ''
                  }`}
                >
                  <RadioGroupItem value={option.value} id={option.value} />
                  <Label htmlFor={option.value} className="flex-1 cursor-pointer">
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-muted-foreground">{option.description}</div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Your message</Label>
            <Textarea
              id="message"
              placeholder="Tell us more..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitFeedback.isPending} className="gap-2">
            <Send className="h-4 w-4" />
            Send Feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
