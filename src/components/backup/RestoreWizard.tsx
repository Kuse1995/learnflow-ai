import { useState } from "react";
import { format } from "date-fns";
import { 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle,
  Eye,
  X,
  ArrowRight
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  useBackup, 
  useCreateRestoreJob, 
  useConfirmRestore,
  useCancelRestore,
  checkVersionCompatibility,
  type Backup
} from "@/hooks/useBackups";
import { useToast } from "@/hooks/use-toast";

interface RestoreWizardProps {
  backup: Backup;
  onClose: () => void;
}

type WizardStep = 'preview' | 'impact' | 'confirm' | 'complete';

export function RestoreWizard({ backup, onClose }: RestoreWizardProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<WizardStep>('preview');
  const [restoreJobId, setRestoreJobId] = useState<string | null>(null);
  
  const createRestore = useCreateRestoreJob();
  const confirmRestore = useConfirmRestore();
  const cancelRestore = useCancelRestore();

  const compatibility = checkVersionCompatibility(backup.version_id, 'current');
  const recordCounts = backup.record_counts as Record<string, number> | null;

  const handleStartPreview = async () => {
    try {
      const job = await createRestore.mutateAsync({
        backup_id: backup.id,
        scope: backup.scope,
        target_school_id: backup.school_id || undefined,
        target_class_id: backup.class_id || undefined,
        target_student_id: backup.student_id || undefined,
      });
      setRestoreJobId(job.id);
      setStep('impact');
    } catch {
      toast({
        title: "Preview failed",
        description: "Unable to preview the restore. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleConfirmRestore = async () => {
    if (!restoreJobId) return;
    
    try {
      await confirmRestore.mutateAsync(restoreJobId);
      setStep('complete');
      toast({
        title: "Restore started",
        description: "Your data is being restored. This may take a few minutes.",
      });
    } catch {
      toast({
        title: "Restore failed",
        description: "Unable to start the restore. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = async () => {
    if (restoreJobId) {
      await cancelRestore.mutateAsync(restoreJobId);
    }
    onClose();
  };

  return (
    <Dialog open onOpenChange={handleCancel}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Restore Data
          </DialogTitle>
          <DialogDescription>
            Restore your data from backup: {backup.version_id}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 py-4">
          {(['preview', 'impact', 'confirm', 'complete'] as WizardStep[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${step === s ? 'bg-primary text-primary-foreground' : 
                  (['preview', 'impact', 'confirm', 'complete'].indexOf(step) > i 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-muted text-muted-foreground')}
              `}>
                {i + 1}
              </div>
              {i < 3 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {/* Step Content */}
        {step === 'preview' && (
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Backup Details</h4>
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">Created:</span> {format(new Date(backup.created_at), "MMMM d, yyyy 'at' h:mm a")}</p>
                <p><span className="text-muted-foreground">Scope:</span> <span className="capitalize">{backup.scope}</span></p>
                <p><span className="text-muted-foreground">Type:</span> <span className="capitalize">{backup.backup_type}</span></p>
              </div>
              
              {recordCounts && Object.keys(recordCounts).length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Records included:</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(recordCounts).map(([key, count]) => (
                      <Badge key={key} variant="secondary">
                        {count} {key}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {compatibility.warning && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Compatibility Notice</AlertTitle>
                <AlertDescription>{compatibility.warning}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {step === 'impact' && (
          <div className="space-y-4">
            <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800 dark:text-amber-300">
                What will happen
              </AlertTitle>
              <AlertDescription className="text-amber-700 dark:text-amber-400">
                Restoring this backup will replace current data with the backed-up version. 
                Any changes made since this backup was created will be overwritten.
              </AlertDescription>
            </Alert>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Impact Summary</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-amber-600">•</span>
                  <span>Data from {format(new Date(backup.created_at), "MMMM d, yyyy")} will be restored</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600">•</span>
                  <span>Recent changes will be replaced with backup data</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600">•</span>
                  <span>A backup of current data will be created automatically</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Final Confirmation Required</AlertTitle>
              <AlertDescription>
                This action cannot be undone without another restore operation. 
                Please confirm that you want to proceed.
              </AlertDescription>
            </Alert>
            
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-sm font-medium">
                Are you sure you want to restore data from:
              </p>
              <p className="text-lg font-mono mt-1">{backup.version_id}</p>
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="py-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium mb-2">Restore Started</h3>
            <p className="text-muted-foreground">
              Your data is being restored. This process may take a few minutes. 
              You'll be notified when it's complete.
            </p>
          </div>
        )}

        <DialogFooter>
          {step !== 'complete' && (
            <Button variant="outline" onClick={handleCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          )}
          
          {step === 'preview' && (
            <Button onClick={handleStartPreview} disabled={createRestore.isPending}>
              <Eye className="h-4 w-4 mr-2" />
              Preview Impact
            </Button>
          )}
          
          {step === 'impact' && (
            <Button onClick={() => setStep('confirm')}>
              Continue
            </Button>
          )}
          
          {step === 'confirm' && (
            <Button 
              variant="destructive"
              onClick={handleConfirmRestore}
              disabled={confirmRestore.isPending}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Confirm Restore
            </Button>
          )}
          
          {step === 'complete' && (
            <Button onClick={onClose}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Simplified restore button for backup list
interface RestoreButtonProps {
  backup: Backup;
}

export function RestoreButton({ backup }: RestoreButtonProps) {
  const [showWizard, setShowWizard] = useState(false);

  if (backup.status !== 'completed') {
    return null;
  }

  return (
    <>
      <Button 
        size="sm" 
        variant="outline"
        onClick={() => setShowWizard(true)}
      >
        <RotateCcw className="h-4 w-4 mr-1" />
        Restore
      </Button>
      
      {showWizard && (
        <RestoreWizard backup={backup} onClose={() => setShowWizard(false)} />
      )}
    </>
  );
}
