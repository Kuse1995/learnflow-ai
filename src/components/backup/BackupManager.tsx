import { useState } from "react";
import { format } from "date-fns";
import { 
  Download, 
  HardDrive, 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Building2,
  Users,
  User
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  useBackups, 
  useCreateBackup, 
  type Backup, 
  type BackupScope 
} from "@/hooks/useBackups";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const SCOPE_ICONS = {
  system: HardDrive,
  school: Building2,
  class: Users,
  student: User,
};

const STATUS_STYLES = {
  pending: { icon: Clock, className: "text-muted-foreground" },
  in_progress: { icon: RefreshCw, className: "text-blue-600 animate-spin" },
  completed: { icon: CheckCircle, className: "text-green-600" },
  failed: { icon: AlertCircle, className: "text-destructive" },
};

function BackupCard({ backup }: { backup: Backup }) {
  const StatusIcon = STATUS_STYLES[backup.status].icon;
  const ScopeIcon = SCOPE_ICONS[backup.scope];
  const recordCounts = backup.record_counts as Record<string, number> | null;

  return (
    <div className="p-4 border rounded-lg hover:bg-muted/30 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-muted rounded-lg">
            <ScopeIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium capitalize">{backup.scope} Backup</span>
              <Badge variant="outline" className="text-xs">
                {backup.backup_type}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {backup.version_id}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(backup.created_at), "MMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <StatusIcon className={cn("h-5 w-5", STATUS_STYLES[backup.status].className)} />
          {backup.status === 'completed' && backup.file_url && (
            <Button size="sm" variant="outline" asChild>
              <a href={backup.file_url} download>
                <Download className="h-4 w-4 mr-1" />
                Download
              </a>
            </Button>
          )}
        </div>
      </div>
      
      {backup.status === 'completed' && recordCounts && Object.keys(recordCounts).length > 0 && (
        <div className="mt-3 pt-3 border-t flex flex-wrap gap-2">
          {Object.entries(recordCounts).map(([key, count]) => (
            <Badge key={key} variant="secondary" className="text-xs">
              {count} {key}
            </Badge>
          ))}
        </div>
      )}
      
      {backup.error_message && (
        <p className="mt-2 text-sm text-destructive">{backup.error_message}</p>
      )}
    </div>
  );
}

interface BackupManagerProps {
  schoolId?: string;
  showSystemBackups?: boolean;
}

export function BackupManager({ schoolId, showSystemBackups = false }: BackupManagerProps) {
  const { toast } = useToast();
  const [selectedScope, setSelectedScope] = useState<BackupScope>(schoolId ? 'school' : 'system');
  const { data: backups, isLoading, refetch } = useBackups(schoolId);
  const createBackup = useCreateBackup();

  const handleCreateBackup = async () => {
    try {
      await createBackup.mutateAsync({
        scope: selectedScope,
        school_id: schoolId,
      });
      toast({
        title: "Backup started",
        description: "Your backup is being created. This may take a few minutes.",
      });
    } catch {
      toast({
        title: "Backup failed",
        description: "Unable to start the backup. Please try again.",
        variant: "destructive",
      });
    }
  };

  const scopeOptions = showSystemBackups 
    ? ['system', 'school', 'class', 'student'] 
    : ['school', 'class', 'student'];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Data Backups
            </CardTitle>
            <CardDescription>
              Create and manage backups of your data for safekeeping
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Create Backup */}
        <div className="flex items-end gap-3 p-4 bg-muted/50 rounded-lg">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">
              What would you like to back up?
            </label>
            <Select 
              value={selectedScope} 
              onValueChange={(v) => setSelectedScope(v as BackupScope)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {scopeOptions.map((scope) => (
                  <SelectItem key={scope} value={scope}>
                    <span className="capitalize">{scope}</span>
                    <span className="text-muted-foreground ml-2">
                      {scope === 'system' && '— All data'}
                      {scope === 'school' && '— This school only'}
                      {scope === 'class' && '— A specific class'}
                      {scope === 'student' && '— A specific student'}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button 
            onClick={handleCreateBackup}
            disabled={createBackup.isPending}
          >
            {createBackup.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <HardDrive className="h-4 w-4 mr-2" />
                Create Backup
              </>
            )}
          </Button>
        </div>
        
        {/* Backup List */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : backups?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <HardDrive className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No backups yet</p>
            <p className="text-sm mt-1">Create your first backup to protect your data</p>
          </div>
        ) : (
          <div className="space-y-3">
            {backups?.map((backup) => (
              <BackupCard key={backup.id} backup={backup} />
            ))}
          </div>
        )}
        
        {/* Info Box */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-medium text-blue-800 dark:text-blue-300 text-sm mb-1">
            About Backups
          </h4>
          <p className="text-sm text-blue-700 dark:text-blue-400">
            Backups include student information, class data, attendance records, 
            learning profiles, and approved insights. They do not include temporary 
            data or session information. Backups are kept secure and can be restored 
            at any time.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
