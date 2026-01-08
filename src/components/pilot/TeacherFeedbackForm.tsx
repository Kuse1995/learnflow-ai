import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSubmitTeacherFeedback, type TeacherFeedback } from "@/hooks/usePilotDeployment";
import { MessageSquare, Bug, Lightbulb, Heart, AlertCircle, HelpCircle } from "lucide-react";
import { toast } from "sonner";

const FEEDBACK_TYPES: {
  value: TeacherFeedback['feedback_type'];
  label: string;
  icon: typeof Bug;
  description: string;
}[] = [
  { value: 'bug', label: 'Bug Report', icon: Bug, description: 'Something is not working correctly' },
  { value: 'suggestion', label: 'Suggestion', icon: Lightbulb, description: 'Ideas for improvement' },
  { value: 'praise', label: 'Praise', icon: Heart, description: 'Something works well' },
  { value: 'concern', label: 'Concern', icon: AlertCircle, description: 'Worried about something' },
  { value: 'question', label: 'Question', icon: HelpCircle, description: 'Need clarification' },
];

const URGENCY_OPTIONS: { value: TeacherFeedback['urgency']; label: string }[] = [
  { value: 'low', label: 'Low - Not urgent' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High - Needs attention soon' },
  { value: 'critical', label: 'Critical - Blocking work' },
];

const FEATURE_AREAS = [
  'Uploads & Analysis',
  'Student Profiles',
  'AI Suggestions',
  'Parent Insights',
  'Attendance',
  'Dashboard',
  'Navigation',
  'Performance',
  'Other',
];

interface TeacherFeedbackFormProps {
  schoolId: string;
  teacherAccountId?: string;
  onSuccess?: () => void;
}

export function TeacherFeedbackForm({
  schoolId,
  teacherAccountId,
  onSuccess,
}: TeacherFeedbackFormProps) {
  const [feedbackType, setFeedbackType] = useState<TeacherFeedback['feedback_type'] | ''>('');
  const [featureArea, setFeatureArea] = useState('');
  const [message, setMessage] = useState('');
  const [urgency, setUrgency] = useState<TeacherFeedback['urgency']>('normal');

  const submitFeedback = useSubmitTeacherFeedback();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!feedbackType || !message.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await submitFeedback.mutateAsync({
        school_id: schoolId,
        teacher_account_id: teacherAccountId,
        feedback_type: feedbackType,
        feature_area: featureArea || undefined,
        message: message.trim(),
        urgency,
      });

      toast.success('Thank you for your feedback!');
      setFeedbackType('');
      setFeatureArea('');
      setMessage('');
      setUrgency('normal');
      onSuccess?.();
    } catch (error) {
      toast.error('Failed to submit feedback. Please try again.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Share Your Feedback
        </CardTitle>
        <CardDescription>
          Help us improve by sharing your experience with the pilot
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Feedback Type */}
          <div className="space-y-2">
            <Label>What type of feedback is this? *</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {FEEDBACK_TYPES.map((type) => (
                <Button
                  key={type.value}
                  type="button"
                  variant={feedbackType === type.value ? 'default' : 'outline'}
                  className="h-auto flex-col gap-1 py-3"
                  onClick={() => setFeedbackType(type.value)}
                >
                  <type.icon className="h-4 w-4" />
                  <span className="text-xs">{type.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Feature Area */}
          <div className="space-y-2">
            <Label>Which feature area?</Label>
            <Select value={featureArea} onValueChange={setFeatureArea}>
              <SelectTrigger>
                <SelectValue placeholder="Select a feature area (optional)" />
              </SelectTrigger>
              <SelectContent>
                {FEATURE_AREAS.map((area) => (
                  <SelectItem key={area} value={area}>
                    {area}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label>Your feedback *</Label>
            <Textarea
              placeholder="Please describe your feedback in detail..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              required
            />
          </div>

          {/* Urgency */}
          <div className="space-y-2">
            <Label>How urgent is this?</Label>
            <Select value={urgency} onValueChange={(v: TeacherFeedback['urgency']) => setUrgency(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {URGENCY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={submitFeedback.isPending || !feedbackType || !message.trim()}
          >
            {submitFeedback.isPending ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
