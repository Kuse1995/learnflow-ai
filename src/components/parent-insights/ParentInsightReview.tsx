import { useState } from "react";
import { format } from "date-fns";
import { Check, Loader2, Pencil, Trash2, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ParentInsightSummary,
  useUpdateParentInsight,
  useApproveParentInsight,
  useDeleteParentInsight,
} from "@/hooks/useParentInsights";

interface ParentInsightReviewProps {
  insight: ParentInsightSummary;
  studentName: string;
}

export function ParentInsightReview({ insight, studentName }: ParentInsightReviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(insight.summary_text);
  const [editedTips, setEditedTips] = useState<string[]>(insight.home_support_tips || []);
  
  const updateMutation = useUpdateParentInsight();
  const approveMutation = useApproveParentInsight();
  const deleteMutation = useDeleteParentInsight();

  const handleSaveEdit = async () => {
    try {
      await updateMutation.mutateAsync({
        id: insight.id,
        summary_text: editedText,
        home_support_tips: editedTips.filter(tip => tip.trim()),
      });
      setIsEditing(false);
      toast.success("Changes saved");
    } catch (error) {
      toast.error("Failed to save changes");
    }
  };

  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync({ id: insight.id });
      toast.success("Summary approved and visible to parents");
    } catch (error) {
      toast.error("Failed to approve summary");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync({ id: insight.id, classId: insight.class_id });
      toast.success("Draft deleted");
    } catch (error) {
      toast.error("Failed to delete draft");
    }
  };

  const handleTipChange = (index: number, value: string) => {
    const newTips = [...editedTips];
    newTips[index] = value;
    setEditedTips(newTips);
  };

  const handleRemoveTip = (index: number) => {
    setEditedTips(editedTips.filter((_, i) => i !== index));
  };

  const handleCancelEdit = () => {
    setEditedText(insight.summary_text);
    setEditedTips(insight.home_support_tips || []);
    setIsEditing(false);
  };

  const isLoading = updateMutation.isPending || approveMutation.isPending || deleteMutation.isPending;

  return (
    <Card className="border-l-4 border-l-amber-400">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base font-medium">{studentName}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Draft created {format(new Date(insight.created_at), "MMM d, yyyy")}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {!isEditing && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditing(true)}
                  disabled={isLoading}
                  className="h-8 w-8"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={isLoading}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete draft?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete this draft summary for {studentName}.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Warning Banner */}
        <Alert className="bg-amber-50 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 text-sm">
            Parents will see exactly what is approved here
          </AlertDescription>
        </Alert>

        {/* Summary Text */}
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">
            Summary for parents
          </label>
          {isEditing ? (
            <Textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              rows={3}
              className="resize-none"
              placeholder="Write a warm, encouraging summary..."
            />
          ) : (
            <p className="text-sm bg-muted/50 rounded-md p-3">{insight.summary_text}</p>
          )}
        </div>

        {/* Home Support Tips */}
        {(editedTips.length > 0 || isEditing) && (
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              How parents can support at home
            </label>
            {isEditing ? (
              <div className="space-y-2">
                {editedTips.map((tip, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={tip}
                      onChange={(e) => handleTipChange(index, e.target.value)}
                      placeholder="Enter a tip..."
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveTip(index)}
                      className="h-10 w-10 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {editedTips.length < 3 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditedTips([...editedTips, ""])}
                  >
                    Add tip
                  </Button>
                )}
              </div>
            ) : (
              <ul className="text-sm bg-muted/50 rounded-md p-3 space-y-1">
                {insight.home_support_tips.map((tip, index) => (
                  <li key={index} className="flex gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          {isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={handleCancelEdit} disabled={isLoading}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveEdit} disabled={isLoading}>
                {updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : null}
                Save changes
              </Button>
            </>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" disabled={isLoading}>
                  {approveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Check className="h-4 w-4 mr-1" />
                  )}
                  Approve for parents
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Approve this summary?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Once approved, this summary will be visible to {studentName}'s parents. 
                    Approved summaries cannot be edited.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleApprove}>Approve</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
