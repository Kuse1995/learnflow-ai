import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, XCircle, Clock, Edit2, Eye, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConsentViewRole, ConsentStatus } from "./ConsentStatusIndicator";
import type { ConsentCategory, ConsentStatus as ConsentRecordStatus } from "@/lib/parent-consent-system";

interface CategoryConsent {
  category: ConsentCategory;
  status: ConsentRecordStatus;
  grantedAt?: string;
  source?: string;
}

interface ConsentCategorySummaryProps {
  guardianName: string;
  studentName: string;
  categories: CategoryConsent[];
  role: ConsentViewRole;
  overallStatus: ConsentStatus;
  onEdit?: () => void;
  onViewHistory?: () => void;
}

const CATEGORY_LABELS: Record<ConsentCategory, string> = {
  attendance_notifications: 'Attendance',
  academic_updates: 'Academic Updates',
  fee_communications: 'Fee Notices',
  school_announcements: 'School Announcements',
  event_invitations: 'Event Invitations',
  emergency_alerts: 'Emergency Alerts',
};

const CATEGORY_DESCRIPTIONS: Record<ConsentCategory, string> = {
  attendance_notifications: 'Daily attendance status and absence alerts',
  academic_updates: 'Academic progress and learning insights',
  fee_communications: 'Fee reminders and payment notifications',
  school_announcements: 'School events and general notices',
  event_invitations: 'Invitations to school events and activities',
  emergency_alerts: 'Safety and emergency notifications',
};

export function ConsentCategorySummary({
  guardianName,
  studentName,
  categories,
  role,
  overallStatus,
  onEdit,
  onViewHistory,
}: ConsentCategorySummaryProps) {
  const canEdit = role === 'admin';

  const getStatusIcon = (status: ConsentRecordStatus, category: ConsentCategory) => {
    // Emergency alerts always show as granted (cannot opt out)
    if (category === 'emergency_alerts') {
      return <Lock className="w-4 h-4 text-muted-foreground" />;
    }

    switch (status) {
      case 'granted':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'withdrawn':
      case 'not_requested':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: ConsentRecordStatus, category: ConsentCategory): string => {
    if (category === 'emergency_alerts') {
      return 'Required';
    }
    switch (status) {
      case 'granted': return 'Granted';
      case 'pending': return 'Pending';
      case 'withdrawn': return 'Withdrawn';
      case 'not_requested': return 'Not Requested';
      default: return 'Unknown';
    }
  };

  const getStatusClass = (status: ConsentRecordStatus, category: ConsentCategory): string => {
    if (category === 'emergency_alerts') {
      return 'text-muted-foreground';
    }
    switch (status) {
      case 'granted': return 'text-emerald-700';
      case 'pending': return 'text-blue-700';
      case 'withdrawn': 
      case 'not_requested': return 'text-red-700';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base font-semibold">
              Consent Status
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              {guardianName} → {studentName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onViewHistory && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onViewHistory}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>View consent history</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {canEdit && onEdit && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onEdit}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit consent records</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {categories.map((item) => (
            <div
              key={item.category}
              className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(item.status, item.category)}
                <div>
                  <p className="text-sm font-medium">
                    {CATEGORY_LABELS[item.category]}
                  </p>
                  {role === 'admin' && (
                    <p className="text-xs text-muted-foreground">
                      {CATEGORY_DESCRIPTIONS[item.category]}
                    </p>
                  )}
                </div>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  'text-xs font-medium',
                  getStatusClass(item.status, item.category)
                )}
              >
                {getStatusLabel(item.status, item.category)}
              </Badge>
            </div>
          ))}
        </div>

        {/* Teacher simplified view note */}
        {role === 'teacher' && (
          <p className="text-xs text-muted-foreground mt-4 pt-3 border-t border-border/50">
            Contact a school administrator for consent changes.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Compact inline summary for lists
interface ConsentInlineSummaryProps {
  grantedCount: number;
  totalCount: number;
  role: ConsentViewRole;
}

export function ConsentInlineSummary({ 
  grantedCount, 
  totalCount, 
  role 
}: ConsentInlineSummaryProps) {
  const allGranted = grantedCount === totalCount;
  const noneGranted = grantedCount === 0;

  return (
    <span className={cn(
      'text-sm',
      allGranted && 'text-emerald-700',
      noneGranted && 'text-red-700',
      !allGranted && !noneGranted && 'text-amber-700'
    )}>
      {grantedCount}/{totalCount} categories
    </span>
  );
}
