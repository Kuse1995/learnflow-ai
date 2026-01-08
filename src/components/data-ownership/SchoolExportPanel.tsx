/**
 * School Export Panel
 * 
 * Admin interface for exporting school data at different levels
 */

import { useState } from 'react';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Download,
  FileArchive,
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useExportJobs, useGenerateExport } from '@/hooks/useSchoolExport';
import {
  ExportLevel,
  ExportJob,
  EXPORT_LEVEL_LABELS,
  EXPORT_LEVEL_DESCRIPTIONS,
  formatFileSize,
} from '@/lib/school-data-export';

interface SchoolExportPanelProps {
  schoolId: string;
  schoolName: string;
  userId: string;
}

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { icon: <Clock className="h-3 w-3" />, variant: 'secondary' },
  processing: { icon: <Loader2 className="h-3 w-3 animate-spin" />, variant: 'default' },
  ready: { icon: <CheckCircle2 className="h-3 w-3" />, variant: 'default' },
  expired: { icon: <XCircle className="h-3 w-3" />, variant: 'outline' },
  failed: { icon: <XCircle className="h-3 w-3" />, variant: 'destructive' },
};

export function SchoolExportPanel({ schoolId, schoolName, userId }: SchoolExportPanelProps) {
  const [exportLevel, setExportLevel] = useState<ExportLevel>('operational');
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('json');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: exportJobs, isLoading: isLoadingJobs } = useExportJobs(schoolId);
  const generateExport = useGenerateExport();

  const handleExport = () => {
    generateExport.mutate({
      schoolId,
      schoolName,
      exportLevel,
      format: exportFormat,
    });
    setConfirmOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Export Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileArchive className="h-5 w-5" />
            Export School Data
          </CardTitle>
          <CardDescription>
            Your school owns all its data. Export anytime for backup, audit, or migration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Export Level Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Export Level</label>
            <Select value={exportLevel} onValueChange={(v) => setExportLevel(v as ExportLevel)}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(EXPORT_LEVEL_LABELS) as ExportLevel[]).map((level) => (
                  <SelectItem key={level} value={level}>
                    <div className="flex flex-col">
                      <span>{EXPORT_LEVEL_LABELS[level]}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {EXPORT_LEVEL_DESCRIPTIONS[exportLevel]}
            </p>
          </div>

          {/* Format Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Format</label>
            <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as 'csv' | 'json')}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON (Single file with manifest)</SelectItem>
                <SelectItem value="csv">CSV (Separate files per table)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Security Warning */}
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertTitle>Security Notice</AlertTitle>
            <AlertDescription>
              Exports may contain sensitive information including student data and financial records.
              Store the exported files securely and limit access to authorized personnel only.
            </AlertDescription>
          </Alert>

          {/* Export Button */}
          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogTrigger asChild>
              <Button disabled={generateExport.isPending}>
                {generateExport.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Export Data
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Data Export</DialogTitle>
                <DialogDescription>
                  You are about to export <strong>{EXPORT_LEVEL_LABELS[exportLevel]}</strong> data
                  for <strong>{schoolName}</strong>.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Alert variant="destructive" className="bg-destructive/10">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This export will contain sensitive data. Ensure you have authorization
                    and will store the files securely.
                  </AlertDescription>
                </Alert>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleExport}>
                  Confirm Export
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Export History */}
      <Card>
        <CardHeader>
          <CardTitle>Export History</CardTitle>
          <CardDescription>
            Download links expire after 7 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingJobs ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : exportJobs && exportJobs.length > 0 ? (
            <div className="space-y-3">
              {exportJobs.map((job) => (
                <ExportJobCard key={job.id} job={job} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No exports yet. Create your first export above.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ExportJobCard({ job }: { job: ExportJob }) {
  const config = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending;

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{EXPORT_LEVEL_LABELS[job.export_level]}</span>
          <Badge variant={config.variant} className="gap-1">
            {config.icon}
            {job.status}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Requested {format(new Date(job.requested_at), 'MMM d, yyyy h:mm a')}
        </p>
        {job.file_size_bytes && (
          <p className="text-xs text-muted-foreground">
            Size: {formatFileSize(job.file_size_bytes)}
          </p>
        )}
      </div>
      {job.status === 'ready' && job.file_url && (
        <Button variant="outline" size="sm" asChild>
          <a href={job.file_url} download>
            <Download className="mr-2 h-4 w-4" />
            Download
          </a>
        </Button>
      )}
    </div>
  );
}
