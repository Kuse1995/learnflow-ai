/**
 * Demo Admin Controls
 * 
 * Admin-only components for managing demo data:
 * - Reset Demo Data
 * - Delete Demo School
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Trash2, AlertTriangle, FlaskConical, Database } from "lucide-react";
import {
  useResetDemoData,
  useDeleteDemoSchool,
  useDemoDataSummary,
  DELETE_DEMO_CONFIRMATION_PHRASE,
} from "@/hooks/useDemoSafety";

interface DemoAdminControlsProps {
  schoolId: string;
  schoolName?: string;
}

export function DemoAdminControls({ schoolId, schoolName }: DemoAdminControlsProps) {
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: summary, isLoading: summaryLoading } = useDemoDataSummary();
  const resetMutation = useResetDemoData();
  const deleteMutation = useDeleteDemoSchool();

  const handleReset = () => {
    resetMutation.mutate();
  };

  const handleDelete = () => {
    deleteMutation.mutate(
      { schoolId, confirmationPhrase: deleteConfirmation },
      {
        onSuccess: () => {
          setShowDeleteDialog(false);
          setDeleteConfirmation("");
        },
      }
    );
  };

  const isConfirmationValid =
    deleteConfirmation.trim().toUpperCase() === DELETE_DEMO_CONFIRMATION_PHRASE;

  return (
    <Card className="border-amber-200 dark:border-amber-800">
      <CardHeader>
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-amber-600" />
          <CardTitle className="text-lg">Demo Data Controls</CardTitle>
        </div>
        <CardDescription>
          Manage demo data for {schoolName || "demo school"}. These actions affect all demo records.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Demo Data Summary */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Database className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-medium">Demo Data Summary</h4>
          </div>
          
          {summaryLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {summary?.map((item) => (
                <Badge
                  key={item.tableName}
                  variant="secondary"
                  className="text-xs"
                >
                  {item.tableName}: {item.recordCount}
                </Badge>
              ))}
              {(!summary || summary.length === 0) && (
                <span className="text-sm text-muted-foreground">No demo data found</span>
              )}
            </div>
          )}
        </div>

        {/* Safety Notice */}
        <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
          <FlaskConical className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-300">
            Demo data does not trigger real notifications, affect analytics, or impact billing.
          </AlertDescription>
        </Alert>

        {/* Reset Demo Data */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Reset Demo Data</Label>
          <p className="text-sm text-muted-foreground">
            Clears all demo students, classes, uploads, and AI artifacts. Preserves the demo school
            shell and demo user accounts for re-seeding.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                disabled={resetMutation.isPending}
              >
                {resetMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Reset Demo Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset Demo Data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete all demo students, classes, uploads, analyses, and AI-generated
                  artifacts. The demo school and demo user accounts will be preserved.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleReset}>Reset Demo Data</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Delete Demo School */}
        <div className="space-y-2 pt-4 border-t">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <Label className="text-sm font-medium text-destructive">Danger Zone</Label>
          </div>
          <p className="text-sm text-muted-foreground">
            Permanently delete the demo school and all linked records. This cannot be undone.
          </p>

          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="w-full sm:w-auto"
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Demo School
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-destructive">
                  Delete Demo School?
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-3">
                  <p>
                    This will <strong>permanently delete</strong> the demo school and ALL linked
                    records including students, classes, uploads, analyses, and user data.
                  </p>
                  <p>
                    Type <code className="bg-muted px-1 rounded">{DELETE_DEMO_CONFIRMATION_PHRASE}</code>{" "}
                    to confirm.
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="py-2">
                <Input
                  placeholder="Type confirmation phrase..."
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  className={
                    deleteConfirmation && !isConfirmationValid
                      ? "border-destructive"
                      : ""
                  }
                />
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeleteConfirmation("")}>
                  Cancel
                </AlertDialogCancel>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={!isConfirmationValid || deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Delete Permanently
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
