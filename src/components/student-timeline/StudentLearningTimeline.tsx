import { memo, useMemo } from "react";
import { format } from "date-fns";
import { FileText, PenLine, Layers, MessageSquare, LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useStudentLearningTimeline,
  StudentLearningTimelineEvent,
  StudentTimelineEventType,
} from "@/hooks/useStudentLearningTimeline";

/**
 * Student Learning Timeline
 * 
 * CONSTRAINTS:
 * - VISIBILITY: Teacher-only. Parents have a separate simplified view.
 * - READ-ONLY: No actions, edits, or buttons.
 * - NEUTRAL: No scores, grades, rankings, or evaluative language.
 * - This is a narrative timeline, not an evaluation tool.
 */

interface StudentLearningTimelineProps {
  studentId: string;
  classId: string;
  studentName?: string;
}

const EVENT_ICONS: Record<StudentTimelineEventType, LucideIcon> = {
  analysis: FileText,
  teaching_action: PenLine,
  adaptive_support_plan: Layers,
  parent_update: MessageSquare,
};

const EVENT_LABELS: Record<StudentTimelineEventType, string> = {
  analysis: "Work Analyzed",
  teaching_action: "Teaching Action",
  adaptive_support_plan: "Support Plan",
  parent_update: "Parent Update",
};

export const StudentLearningTimeline = memo(function StudentLearningTimeline({
  studentId,
  classId,
  studentName,
}: StudentLearningTimelineProps) {
  const { data: events, isLoading, isError } = useStudentLearningTimeline(
    studentId,
    classId
  );

  if (isLoading) {
    return <TimelineSkeleton />;
  }

  if (isError) {
    return <TimelineError />;
  }

  if (!events || events.length === 0) {
    return <TimelineEmpty />;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">
          Learning Journey
          {studentName && (
            <span className="font-normal text-muted-foreground ml-2">
              — {studentName}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[500px] pr-4">
          <TimelineList events={events} />
        </ScrollArea>
      </CardContent>
    </Card>
  );
});

/**
 * Memoized timeline list to prevent unnecessary re-renders
 */
const TimelineList = memo(function TimelineList({
  events,
}: {
  events: StudentLearningTimelineEvent[];
}) {
  const renderedItems = useMemo(
    () =>
      events.map((event, index) => (
        <TimelineItem
          key={event.timeline_id}
          event={event}
          isLast={index === events.length - 1}
        />
      )),
    [events]
  );

  return <div className="space-y-0">{renderedItems}</div>;
});

/**
 * Individual timeline item with icon, date, and summary
 */
interface TimelineItemProps {
  event: StudentLearningTimelineEvent;
  isLast: boolean;
}

const TimelineItem = memo(function TimelineItem({
  event,
  isLast,
}: TimelineItemProps) {
  const Icon = EVENT_ICONS[event.event_type] || FileText;
  const label = EVENT_LABELS[event.event_type] || "Event";
  const formattedDate = format(new Date(event.event_date), "MMM d, yyyy");

  return (
    <div className="relative flex gap-4">
      {/* Timeline connector */}
      <div className="flex flex-col items-center">
        {/* Icon container */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        {/* Connector line */}
        {!isLast && (
          <div className="w-px flex-1 bg-border min-h-[16px]" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
          <span className="text-sm font-medium text-foreground">
            {label}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">
            {formattedDate}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
          {event.summary_text}
        </p>
      </div>
    </div>
  );
});

/**
 * Loading skeleton with timeline-like structure
 */
function TimelineSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-20" />
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

/**
 * Empty state - calm and informative
 */
function TimelineEmpty() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">Learning Journey</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No learning activity has been recorded for this student yet.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Events such as assessments, teaching actions, and support plans will appear here.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Error state - neutral and non-alarming
 */
function TimelineError() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">Learning Journey</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Unable to load learning timeline at the moment.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
