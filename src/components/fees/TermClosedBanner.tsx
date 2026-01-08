import React from 'react';
import { Lock, Calendar, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useTermClosure, formatClosureDate } from '@/hooks/useTermClosure';

interface TermClosedBannerProps {
  schoolId: string;
  academicYear: number;
  term: number;
  compact?: boolean;
}

/**
 * Banner component that shows when viewing a closed term
 * Informs users that data is read-only
 */
export function TermClosedBanner({
  schoolId,
  academicYear,
  term,
  compact = false,
}: TermClosedBannerProps) {
  const { data: closure, isLoading } = useTermClosure(schoolId, academicYear, term);

  if (isLoading || !closure?.isClosed) {
    return null;
  }

  if (compact) {
    return (
      <Badge variant="secondary" className="gap-1">
        <Lock className="h-3 w-3" />
        Term Finalized
      </Badge>
    );
  }

  return (
    <Alert className="bg-muted/50 border-muted-foreground/20">
      <Lock className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        Term {term} {academicYear} — Finalized
      </AlertTitle>
      <AlertDescription className="mt-1 text-muted-foreground">
        <p>
          This term's fee records have been finalized. All data is read-only.
        </p>
        <div className="flex items-center gap-1 mt-2 text-xs">
          <Calendar className="h-3 w-3" />
          <span>
            Closed on {formatClosureDate(closure.closedAt)} by {closure.closedBy}
          </span>
        </div>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Simple inline indicator for closed terms
 */
export function TermClosedIndicator({
  schoolId,
  academicYear,
  term,
}: {
  schoolId: string;
  academicYear: number;
  term: number;
}) {
  const { data: closure, isLoading } = useTermClosure(schoolId, academicYear, term);

  if (isLoading || !closure?.isClosed) {
    return null;
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Lock className="h-3 w-3" />
      Finalized
    </span>
  );
}

/**
 * Warning shown when user tries to edit in a closed term
 */
export function TermClosedWarning({
  term,
  academicYear,
}: {
  term: number;
  academicYear: number;
}) {
  return (
    <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
      <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div className="text-sm">
        <p className="font-medium text-amber-800 dark:text-amber-200">
          Term {term} {academicYear} is closed
        </p>
        <p className="text-amber-700 dark:text-amber-300 mt-1">
          Financial records for this term have been finalized. If you need to make 
          a correction, please record it as a post-term adjustment in the current open term.
        </p>
      </div>
    </div>
  );
}

/**
 * Parent-friendly message for closed terms
 */
export function ParentTermFinalizedMessage({
  term,
  academicYear,
}: {
  term: number;
  academicYear: number;
}) {
  return (
    <div className="p-4 bg-muted/50 rounded-lg text-center">
      <Lock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
      <p className="font-medium">Term {term} {academicYear}</p>
      <p className="text-sm text-muted-foreground mt-1">
        This term's fees have been finalized.
      </p>
    </div>
  );
}
