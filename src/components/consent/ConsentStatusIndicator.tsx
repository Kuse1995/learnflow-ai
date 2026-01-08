import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, AlertCircle, Clock, XCircle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Consent status types
export type ConsentStatus = 'fully_consented' | 'partial_consent' | 'pending' | 'withdrawn' | 'not_requested';

// Role-based view permissions
export type ConsentViewRole = 'admin' | 'teacher';

interface ConsentStatusConfig {
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
  teacherTooltip: string;
  adminTooltip: string;
}

const CONSENT_STATUS_CONFIG: Record<ConsentStatus, ConsentStatusConfig> = {
  fully_consented: {
    label: 'Fully Consented',
    shortLabel: 'Consented',
    icon: CheckCircle2,
    variant: 'default',
    className: 'bg-emerald-500/10 text-emerald-700 border-emerald-200 hover:bg-emerald-500/20',
    teacherTooltip: 'Parent has given consent for all communication categories',
    adminTooltip: 'Full consent granted. Click to view consent details and history.',
  },
  partial_consent: {
    label: 'Partial Consent',
    shortLabel: 'Partial',
    icon: AlertCircle,
    variant: 'secondary',
    className: 'bg-amber-500/10 text-amber-700 border-amber-200 hover:bg-amber-500/20',
    teacherTooltip: 'Parent has consented to some communication categories only',
    adminTooltip: 'Partial consent. Some categories restricted. Click to view details.',
  },
  pending: {
    label: 'Pending Consent',
    shortLabel: 'Pending',
    icon: Clock,
    variant: 'outline',
    className: 'bg-blue-500/10 text-blue-700 border-blue-200 hover:bg-blue-500/20',
    teacherTooltip: 'Consent request sent, awaiting parent response',
    adminTooltip: 'Awaiting consent confirmation. Click to resend or record manually.',
  },
  withdrawn: {
    label: 'Consent Withdrawn',
    shortLabel: 'Withdrawn',
    icon: XCircle,
    variant: 'destructive',
    className: 'bg-red-500/10 text-red-700 border-red-200 hover:bg-red-500/20',
    teacherTooltip: 'Parent has withdrawn consent for communications',
    adminTooltip: 'Consent withdrawn. Only emergency alerts permitted. Click for details.',
  },
  not_requested: {
    label: 'Not Requested',
    shortLabel: 'None',
    icon: HelpCircle,
    variant: 'outline',
    className: 'bg-muted text-muted-foreground border-border hover:bg-muted/80',
    teacherTooltip: 'Consent has not been requested yet',
    adminTooltip: 'No consent on record. Click to initiate consent collection.',
  },
};

interface ConsentStatusIndicatorProps {
  status: ConsentStatus;
  role: ConsentViewRole;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showTooltip?: boolean;
  onClick?: () => void;
  className?: string;
}

export function ConsentStatusIndicator({
  status,
  role,
  size = 'md',
  showLabel = true,
  showTooltip = true,
  onClick,
  className,
}: ConsentStatusIndicatorProps) {
  const config = CONSENT_STATUS_CONFIG[status];
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5 gap-1',
    md: 'text-sm px-2 py-1 gap-1.5',
    lg: 'text-base px-3 py-1.5 gap-2',
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  const tooltip = role === 'admin' ? config.adminTooltip : config.teacherTooltip;
  const label = size === 'sm' ? config.shortLabel : config.label;
  const isClickable = role === 'admin' && onClick;

  const badge = (
    <Badge
      variant={config.variant}
      className={cn(
        'inline-flex items-center font-medium transition-colors',
        sizeClasses[size],
        config.className,
        isClickable && 'cursor-pointer',
        className
      )}
      onClick={isClickable ? onClick : undefined}
    >
      <Icon size={iconSizes[size]} className="shrink-0" />
      {showLabel && <span>{label}</span>}
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-sm">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Compact dot indicator for lists/tables
interface ConsentStatusDotProps {
  status: ConsentStatus;
  role: ConsentViewRole;
  showTooltip?: boolean;
}

export function ConsentStatusDot({ status, role, showTooltip = true }: ConsentStatusDotProps) {
  const config = CONSENT_STATUS_CONFIG[status];
  const tooltip = role === 'admin' ? config.adminTooltip : config.teacherTooltip;

  const dotColors: Record<ConsentStatus, string> = {
    fully_consented: 'bg-emerald-500',
    partial_consent: 'bg-amber-500',
    pending: 'bg-blue-500',
    withdrawn: 'bg-red-500',
    not_requested: 'bg-muted-foreground',
  };

  const dot = (
    <span
      className={cn(
        'inline-block w-2 h-2 rounded-full',
        dotColors[status]
      )}
      aria-label={config.label}
    />
  );

  if (!showTooltip) {
    return dot;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {dot}
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-sm font-medium">{config.label}</p>
          <p className="text-xs text-muted-foreground">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Permission helper
export function canEditConsent(role: ConsentViewRole): boolean {
  return role === 'admin';
}

export function getConsentStatusConfig(status: ConsentStatus): ConsentStatusConfig {
  return CONSENT_STATUS_CONFIG[status];
}

export function getAllConsentStatuses(): ConsentStatus[] {
  return ['fully_consented', 'partial_consent', 'pending', 'withdrawn', 'not_requested'];
}
