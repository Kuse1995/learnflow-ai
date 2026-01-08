import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Gift, Percent, FileText, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import {
  useStudentAdjustments,
  ADJUSTMENT_TYPE_CONFIG,
  formatAdjustmentAmount,
  getAdjustmentLabel,
  FeeAdjustment,
} from '@/hooks/useFeeAdjustments';

interface AdjustmentHistoryProps {
  studentId: string;
  currency?: string;
  maxItems?: number;
  showTitle?: boolean;
  isParentView?: boolean;
}

const TypeIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'waiver': return <Gift className="h-4 w-4 text-blue-600" />;
    case 'discount': return <Percent className="h-4 w-4 text-green-600" />;
    case 'arrangement_note': return <FileText className="h-4 w-4 text-gray-600" />;
    default: return null;
  }
};

function AdjustmentItem({ 
  adjustment, 
  currency, 
  isParentView 
}: { 
  adjustment: FeeAdjustment; 
  currency: string;
  isParentView: boolean;
}) {
  const config = ADJUSTMENT_TYPE_CONFIG[adjustment.adjustment_type];
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <TypeIcon type={adjustment.adjustment_type} />
          <div>
            <p className="text-sm font-medium">
              {getAdjustmentLabel(adjustment.adjustment_type)}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(new Date(adjustment.approved_at), 'dd MMM yyyy')}
            </p>
          </div>
        </div>
        {adjustment.amount && (
          <Badge variant="outline" className={config.color}>
            {formatAdjustmentAmount(adjustment.amount, currency)}
          </Badge>
        )}
      </div>

      {/* Reason - different view for parents vs staff */}
      <div className="text-sm text-muted-foreground">
        {isParentView ? (
          <p>{adjustment.parent_visible_reason || 'Fee consideration applied'}</p>
        ) : (
          <>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-primary hover:underline"
            >
              {expanded ? 'Hide details' : 'View details'}
            </button>
            {expanded && (
              <div className="mt-2 p-2 bg-muted/50 rounded text-xs space-y-1">
                <p><strong>Reason:</strong> {adjustment.reason}</p>
                {adjustment.approved_by_name && (
                  <p className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Approved by: {adjustment.approved_by_name}
                  </p>
                )}
                {adjustment.applies_to_term && (
                  <p>Term: {adjustment.applies_to_term}, {adjustment.academic_year}</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function AdjustmentHistory({
  studentId,
  currency = 'ZMW',
  maxItems,
  showTitle = true,
  isParentView = false,
}: AdjustmentHistoryProps) {
  const { data: adjustments = [], isLoading } = useStudentAdjustments(studentId);

  const displayAdjustments = maxItems ? adjustments.slice(0, maxItems) : adjustments;

  if (isLoading) {
    return (
      <Card>
        {showTitle && (
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Adjustments
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showTitle && (
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Fee Adjustments
            {adjustments.length > 0 && (
              <Badge variant="secondary">{adjustments.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent>
        {adjustments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No adjustments recorded.
          </p>
        ) : (
          <ScrollArea className={maxItems ? 'max-h-[300px]' : ''}>
            <div className="space-y-3">
              {displayAdjustments.map((adjustment) => (
                <AdjustmentItem
                  key={adjustment.id}
                  adjustment={adjustment}
                  currency={currency}
                  isParentView={isParentView}
                />
              ))}
              {maxItems && adjustments.length > maxItems && (
                <p className="text-xs text-muted-foreground text-center">
                  +{adjustments.length - maxItems} more adjustments
                </p>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
