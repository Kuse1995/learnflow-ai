import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, PenLine, Pencil, Trash2, MessageSquare, Calendar, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { TeacherLayout } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/empty-states";
import { useClass } from "@/hooks/useClasses";
import {
  useClassActionLogs,
  useUpdateActionLog,
  useDeleteActionLog,
  type TeacherActionLog,
} from "@/hooks/useTeacherActionLogs";

export default function TeacherActions() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();

  const { data: classData, isLoading: isLoadingClass } = useClass(classId);
  const { data: actionLogs = [], isLoading: isLoadingLogs } = useClassActionLogs(classId);
  const { mutate: updateLog, isPending: isUpdating } = useUpdateActionLog();
  const { mutate: deleteLog, isPending: isDeleting } = useDeleteActionLog();

  const [editingLog, setEditingLog] = useState<TeacherActionLog | null>(null);
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);

  // Edit form state
  const [editTopic, setEditTopic] = useState("");
  const [editAction, setEditAction] = useState("");
  const [editReflection, setEditReflection] = useState("");

  const handleStartEdit = (log: TeacherActionLog) => {
    setEditingLog(log);
    setEditTopic(log.topic || "");
    setEditAction(log.action_taken);
    setEditReflection(log.reflection_notes || "");
  };

  const handleSaveEdit = () => {
    if (!editingLog || !editAction.trim()) return;

    updateLog(
      {
        logId: editingLog.id,
        classId: editingLog.class_id,
        updates: {
          topic: editTopic.trim() || null,
          action_taken: editAction.trim(),
          reflection_notes: editReflection.trim() || null,
        },
      },
      {
        onSuccess: () => {
          toast.success("Action log updated");
          setEditingLog(null);
        },
        onError: () => {
          toast.error("Failed to update action log");
        },
      }
    );
  };

  const handleConfirmDelete = () => {
    if (!deletingLogId || !classId) return;

    deleteLog(
      { logId: deletingLogId, classId },
      {
        onSuccess: () => {
          toast.success("Action log deleted");
          setDeletingLogId(null);
        },
        onError: () => {
          toast.error("Failed to delete action log");
        },
      }
    );
  };

  if (isLoadingClass) {
    return (
      <TeacherLayout schoolName="Stitch Academy">
        <div className="p-4 space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </TeacherLayout>
    );
  }

  if (!classData) {
    return (
      <TeacherLayout schoolName="Stitch Academy">
        <div className="p-4">
          <Button variant="ghost" onClick={() => navigate("/teacher/classes")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Classes
          </Button>
          <EmptyState
            variant="no-data"
            title="Class not found"
            description="The class you're looking for doesn't exist or you don't have access to it."
          />
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout schoolName="Stitch Academy">
      <div className="flex flex-col min-h-full pb-24 md:pb-8">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b px-4 pt-4 pb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/teacher/classes/${classId}`)}
            className="mb-3 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {classData.name}
          </Button>

          <div className="flex items-start gap-3">
            <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <PenLine className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Teaching Actions</h1>
              <p className="text-sm text-muted-foreground">
                {classData.name}
                {classData.grade && classData.section && ` • Grade ${classData.grade}, Section ${classData.section}`}
              </p>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4">
          {isLoadingLogs ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ) : actionLogs.length === 0 ? (
            <EmptyState
              variant="no-data"
              title="No teaching actions recorded yet"
              description="This space is for documenting instructional decisions and reflections over time. You can record actions directly from analysis results or teaching suggestions."
            />
          ) : (
            <div className="space-y-3">
              {actionLogs.map((log) => (
                <ActionLogCard
                  key={log.id}
                  log={log}
                  onEdit={() => handleStartEdit(log)}
                  onDelete={() => setDeletingLogId(log.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingLog} onOpenChange={(open) => !open && setEditingLog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Teaching Action</DialogTitle>
            <DialogDescription>
              Update the details of this recorded action.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-topic">Topic (optional)</Label>
              <Input
                id="edit-topic"
                value={editTopic}
                onChange={(e) => setEditTopic(e.target.value)}
                placeholder="e.g., Fractions, Reading Comprehension"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-action">Action Taken</Label>
              <Textarea
                id="edit-action"
                value={editAction}
                onChange={(e) => setEditAction(e.target.value)}
                placeholder="Describe the instructional action..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-reflection">Reflection Notes (optional)</Label>
              <Textarea
                id="edit-reflection"
                value={editReflection}
                onChange={(e) => setEditReflection(e.target.value)}
                placeholder="Any observations or reflections..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingLog(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={!editAction.trim() || isUpdating}>
              {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingLogId} onOpenChange={(open) => !open && setDeletingLogId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Teaching Action?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The recorded teaching action will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TeacherLayout>
  );
}

interface ActionLogCardProps {
  log: TeacherActionLog;
  onEdit: () => void;
  onDelete: () => void;
}

function ActionLogCard({ log, onEdit, onDelete }: ActionLogCardProps) {
  const formattedDate = format(new Date(log.created_at), "MMM d, yyyy 'at' h:mm a");

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-2">
            {/* Date and Topic */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{formattedDate}</span>
              </div>
              {log.topic && (
                <Badge variant="secondary" className="text-xs">
                  {log.topic}
                </Badge>
              )}
            </div>

            {/* Action Taken */}
            <p className="text-sm">{log.action_taken}</p>

            {/* Reflection Notes */}
            {log.reflection_notes && (
              <>
                <Separator className="my-2" />
                <div className="flex items-start gap-2">
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground italic">{log.reflection_notes}</p>
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
