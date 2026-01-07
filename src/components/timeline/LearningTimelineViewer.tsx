import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LearningTimelineEvent,
  TimelineEventType,
} from "@/hooks/useLearningTimeline";

/**
 * Learning Timeline Viewer
 * 
 * CONSTRAINTS (enforced):
 * - VISIBILITY: Teacher-only. Never expose to parents or students.
 * - Read-only: No actions or edits.
 * - Neutral design: No success/failure icons, no color coding by type.
 * - No expandable raw data.
 * - Disclaimer always visible.
 */

interface LearningTimelineViewerProps {
  events: LearningTimelineEvent[];
  isLoading?: boolean;
  studentName?: string;
}

const EVENT_TYPE_LABELS: Record<TimelineEventType, string> = {
  analysis: "Work Analyzed",
  teaching_action: "Teaching Action",
  support_plan: "Support Plan",
  learning_path: "Learning Path",
  parent_summary: "Parent Summary",
};

function getEventLabel(eventType: TimelineEventType): string {
  return EVENT_TYPE_LABELS[eventType] || "Event";
}

export function LearningTimelineViewer({
  events,
  isLoading,
  studentName,
}: LearningTimelineViewerProps) {
  if (isLoading) {
    return <TimelineSkeleton />;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">
          Learning Evidence Timeline
          {studentName && (
            <span className="font-normal text-muted-foreground ml-2">
              — {studentName}
            </span>
          )}
        </CardTitle>
        {/* Disclaimer - always visible */}
        <p className="text-xs text-muted-foreground italic border-l-2 border-muted pl-3 mt-2">
          This timeline provides contextual learning evidence to support professional judgment.
        </p>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <EmptyTimeline />
        ) : (
          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-0">
              {events.map((event, index) => (
                <TimelineEntry
                  key={event.id}
                  event={event}
                  isLast={index === events.length - 1}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

interface TimelineEntryProps {
  event: LearningTimelineEvent;
  isLast: boolean;
}

function TimelineEntry({ event, isLast }: TimelineEntryProps) {
  const label = getEventLabel(event.event_type);
  const formattedDate = format(new Date(event.occurred_at), "MMM d, yyyy");

  return (
    <div className="relative flex gap-4">
      {/* Timeline connector */}
      <div className="flex flex-col items-center">
        <div className="h-2 w-2 rounded-full bg-muted-foreground/40 mt-2 shrink-0" />
        {!isLast && (
          <div className="w-px flex-1 bg-border min-h-[24px]" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium text-foreground">
            {label}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">
            {formattedDate}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {event.event_summary}
        </p>
      </div>
    </div>
  );
}

function EmptyTimeline() {
  return (
    <div className="py-8 text-center">
      <p className="text-sm text-muted-foreground">
        No timeline entries yet.
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        Events will appear here as learning evidence is recorded.
      </p>
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-72 mt-2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-2 w-2 rounded-full mt-2" />
              <div className="flex-1 space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
