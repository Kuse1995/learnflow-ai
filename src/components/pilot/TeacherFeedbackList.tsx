import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useTeacherFeedback,
  useUpdateFeedbackStatus,
  type TeacherFeedback,
} from "@/hooks/usePilotDeployment";
import { format } from "date-fns";
import {
  MessageSquare,
  Bug,
  Lightbulb,
  Heart,
  AlertCircle,
  HelpCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

const FEEDBACK_TYPE_ICONS: Record<TeacherFeedback['feedback_type'], typeof Bug> = {
  bug: Bug,
  suggestion: Lightbulb,
  praise: Heart,
  concern: AlertCircle,
  question: HelpCircle,
};

const FEEDBACK_TYPE_COLORS: Record<TeacherFeedback['feedback_type'], string> = {
  bug: 'bg-red-100 text-red-800',
  suggestion: 'bg-blue-100 text-blue-800',
  praise: 'bg-green-100 text-green-800',
  concern: 'bg-amber-100 text-amber-800',
  question: 'bg-purple-100 text-purple-800',
};

const STATUS_ICONS: Record<TeacherFeedback['status'], typeof Clock> = {
  new: Clock,
  reviewed: MessageSquare,
  in_progress: Loader2,
  resolved: CheckCircle2,
  wont_fix: XCircle,
};

const STATUS_OPTIONS: { value: TeacherFeedback['status']; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'wont_fix', label: "Won't Fix" },
];

const URGENCY_COLORS: Record<TeacherFeedback['urgency'], string> = {
  low: 'bg-slate-100 text-slate-600',
  normal: 'bg-blue-100 text-blue-600',
  high: 'bg-amber-100 text-amber-600',
  critical: 'bg-red-100 text-red-600',
};

interface TeacherFeedbackListProps {
  schoolId?: string;
  statusFilter?: string;
}

export function TeacherFeedbackList({ schoolId, statusFilter }: TeacherFeedbackListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  const { data: feedback, isLoading } = useTeacherFeedback(schoolId, statusFilter);
  const updateStatus = useUpdateFeedbackStatus();

  const handleStatusChange = async (id: string, status: TeacherFeedback['status']) => {
    try {
      await updateStatus.mutateAsync({
        id,
        status,
        admin_notes: adminNotes[id],
      });
      toast.success('Feedback status updated');
    } catch (error) {
      toast.error('Failed to update feedback status');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading feedback...
        </CardContent>
      </Card>
    );
  }

  if (!feedback || feedback.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Teacher Feedback
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          No feedback submitted yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Teacher Feedback
          </div>
          <Badge variant="secondary">{feedback.length} items</Badge>
        </CardTitle>
        <CardDescription>
          Feedback collected from teachers during the pilot
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {feedback.map((item) => {
              const TypeIcon = FEEDBACK_TYPE_ICONS[item.feedback_type];
              const StatusIcon = STATUS_ICONS[item.status];
              const isExpanded = expandedId === item.id;

              return (
                <div
                  key={item.id}
                  className="rounded-lg border p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${FEEDBACK_TYPE_COLORS[item.feedback_type]}`}
                      >
                        <TypeIcon className="h-4 w-4" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-xs capitalize">
                            {item.feedback_type}
                          </Badge>
                          {item.feature_area && (
                            <Badge variant="secondary" className="text-xs">
                              {item.feature_area}
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className={`text-xs ${URGENCY_COLORS[item.urgency]}`}
                          >
                            {item.urgency}
                          </Badge>
                        </div>
                        <p className="text-sm">{item.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(item.created_at), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant={item.status === 'resolved' ? 'default' : 'outline'}
                        className="gap-1"
                      >
                        <StatusIcon className="h-3 w-3" />
                        {item.status.replace('_', ' ')}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      >
                        {isExpanded ? 'Collapse' : 'Manage'}
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 space-y-4 border-t pt-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Admin Notes</label>
                        <Textarea
                          placeholder="Add notes about this feedback..."
                          value={adminNotes[item.id] ?? item.admin_notes ?? ''}
                          onChange={(e) =>
                            setAdminNotes((prev) => ({
                              ...prev,
                              [item.id]: e.target.value,
                            }))
                          }
                          rows={2}
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <Select
                          value={item.status}
                          onValueChange={(v: TeacherFeedback['status']) =>
                            handleStatusChange(item.id, v)
                          }
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          onClick={() => handleStatusChange(item.id, item.status)}
                          disabled={updateStatus.isPending}
                        >
                          Save Notes
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
