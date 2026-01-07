import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  XCircle,
  RotateCcw,
  X 
} from "lucide-react";
import { useBackgroundJobs, type BackgroundJob } from "@/hooks/useBackgroundJobs";
import { cn } from "@/lib/utils";

interface JobProgressIndicatorProps {
  className?: string;
}

export function JobProgressIndicator({ className }: JobProgressIndicatorProps) {
  const { jobs, clearCompleted, retryJob, cancelJob } = useBackgroundJobs();

  // Only show recent jobs (last 10)
  const recentJobs = jobs.slice(-10).reverse();
  const activeJobs = recentJobs.filter(
    (j) => j.status === "pending" || j.status === "processing"
  );

  if (recentJobs.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {recentJobs.map((job) => (
        <JobItem
          key={job.id}
          job={job}
          onRetry={() => retryJob(job.id)}
          onCancel={() => cancelJob(job.id)}
        />
      ))}
      {activeJobs.length === 0 && recentJobs.some((j) => j.status === "completed") && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearCompleted}
          className="text-xs text-muted-foreground"
        >
          Clear completed
        </Button>
      )}
    </div>
  );
}

interface JobItemProps {
  job: BackgroundJob;
  onRetry: () => void;
  onCancel: () => void;
}

function JobItem({ job, onRetry, onCancel }: JobItemProps) {
  const getStatusIcon = () => {
    switch (job.status) {
      case "pending":
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case "cancelled":
        return <XCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const isActive = job.status === "pending" || job.status === "processing";

  return (
    <Card className="border-border/50">
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{job.message}</p>
            {isActive && (
              <Progress value={job.progress} className="h-1.5 mt-1" />
            )}
            {job.error && (
              <p className="text-xs text-destructive mt-1">{job.error}</p>
            )}
          </div>
          {isActive && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onCancel}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          {job.status === "failed" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onRetry}
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Compact floating job indicator for the bottom of the screen
 */
export function FloatingJobIndicator() {
  const { pendingJobs, hasFailedJobs } = useBackgroundJobs();

  if (pendingJobs.length === 0 && !hasFailedJobs) return null;

  const latestJob = pendingJobs[0];

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="shadow-lg border-border">
        <CardContent className="p-3 flex items-center gap-3 min-w-[200px]">
          {hasFailedJobs ? (
            <>
              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              <span className="text-sm">Some tasks need attention</span>
            </>
          ) : latestJob ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{latestJob.message}</p>
                <Progress value={latestJob.progress} className="h-1 mt-1" />
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
