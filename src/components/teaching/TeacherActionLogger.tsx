import { useState } from "react";
import { format } from "date-fns";
import { PenLine, Loader2, MessageSquare, Calendar } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { useCreateActionLog, useClassActionLogs, useUploadActionLogs, type TeacherActionLog } from "@/hooks/useTeacherActionLogs";

const actionLogSchema = z.object({
  actionTaken: z.string().trim().min(1, "Please describe the action you took").max(2000, "Action description must be less than 2000 characters"),
  reflectionNotes: z.string().trim().max(2000, "Reflection notes must be less than 2000 characters").optional(),
  topic: z.string().trim().max(200, "Topic must be less than 200 characters").optional(),
});

type ActionLogFormData = z.infer<typeof actionLogSchema>;

interface TeacherActionLoggerProps {
  classId: string;
  uploadId?: string;
  defaultTopic?: string;
  trigger?: React.ReactNode;
  showHistory?: boolean;
}

export function TeacherActionLogger({
  classId,
  uploadId,
  defaultTopic,
  trigger,
  showHistory = true,
}: TeacherActionLoggerProps) {
  const [open, setOpen] = useState(false);
  const { mutate: createLog, isPending } = useCreateActionLog();
  
  // Fetch logs based on context
  const { data: classLogs = [] } = useClassActionLogs(showHistory ? classId : undefined);
  const { data: uploadLogs = [] } = useUploadActionLogs(showHistory && uploadId ? uploadId : undefined);
  
  // Use upload-specific logs if uploadId provided, otherwise class logs
  const logs = uploadId ? uploadLogs : classLogs;

  const form = useForm<ActionLogFormData>({
    resolver: zodResolver(actionLogSchema),
    defaultValues: {
      actionTaken: "",
      reflectionNotes: "",
      topic: defaultTopic || "",
    },
  });

  const handleSubmit = (data: ActionLogFormData) => {
    createLog(
      {
        classId,
        uploadId,
        topic: data.topic || undefined,
        actionTaken: data.actionTaken,
        reflectionNotes: data.reflectionNotes || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Teaching action recorded");
          form.reset({ actionTaken: "", reflectionNotes: "", topic: defaultTopic || "" });
          setOpen(false);
        },
        onError: (error) => {
          console.error("Failed to save action log:", error);
          toast.error("Failed to save action. Please try again.");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <PenLine className="h-4 w-4" />
            Record Teaching Action
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="h-5 w-5 text-primary" />
            Record Teaching Action
          </DialogTitle>
          <DialogDescription>
            Document the instructional actions you have taken and reflect on their outcomes.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Form */}
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Topic (optional) */}
            <div className="space-y-2">
              <Label htmlFor="topic" className="text-sm font-medium">
                Topic <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="topic"
                placeholder="e.g., Fractions, Reading Comprehension"
                {...form.register("topic")}
              />
              {form.formState.errors.topic && (
                <p className="text-sm text-destructive">{form.formState.errors.topic.message}</p>
              )}
            </div>

            {/* Action Taken */}
            <div className="space-y-2">
              <Label htmlFor="actionTaken" className="text-sm font-medium">
                What action did you take? <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="actionTaken"
                placeholder="Describe the instructional approach, activity, or intervention you implemented..."
                className="min-h-[100px] resize-none"
                {...form.register("actionTaken")}
              />
              {form.formState.errors.actionTaken && (
                <p className="text-sm text-destructive">{form.formState.errors.actionTaken.message}</p>
              )}
            </div>

            {/* Reflection Notes */}
            <div className="space-y-2">
              <Label htmlFor="reflectionNotes" className="text-sm font-medium">
                What did you observe afterward? <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="reflectionNotes"
                placeholder="Note any observations, student responses, or outcomes you noticed..."
                className="min-h-[80px] resize-none"
                {...form.register("reflectionNotes")}
              />
              {form.formState.errors.reflectionNotes && (
                <p className="text-sm text-destructive">{form.formState.errors.reflectionNotes.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Action"
              )}
            </Button>
          </form>

          {/* Past Actions */}
          {showHistory && logs.length > 0 && (
            <>
              <Separator />
              <div className="flex-1 min-h-0">
                <h4 className="text-sm font-medium mb-3">Recent Actions</h4>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-3 pr-4">
                    {logs.slice(0, 5).map((log) => (
                      <ActionLogCard key={log.id} log={log} />
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ActionLogCardProps {
  log: TeacherActionLog;
}

function ActionLogCard({ log }: ActionLogCardProps) {
  return (
    <Card className="bg-muted/30">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{format(new Date(log.created_at), "MMM d, yyyy")}</span>
          {log.topic && (
            <>
              <span>•</span>
              <span className="font-medium text-foreground">{log.topic}</span>
            </>
          )}
        </div>
        <p className="text-sm line-clamp-2">{log.action_taken}</p>
        {log.reflection_notes && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
            <span className="line-clamp-2">{log.reflection_notes}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
