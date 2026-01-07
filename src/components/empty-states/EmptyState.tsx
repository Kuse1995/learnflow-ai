import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LucideIcon, FileText, Upload, CalendarX } from "lucide-react";

type EmptyStateVariant = "no-data" | "upload-first" | "no-lessons";

interface EmptyStateConfig {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
}

const variants: Record<EmptyStateVariant, EmptyStateConfig> = {
  "no-data": {
    icon: FileText,
    title: "No data yet",
    description: "There's nothing here yet. Data will appear once it's been added.",
    actionLabel: "Get started",
  },
  "upload-first": {
    icon: Upload,
    title: "Upload your first script",
    description: "Start by uploading a test or assignment for AI analysis.",
    actionLabel: "Upload file",
  },
  "no-lessons": {
    icon: CalendarX,
    title: "No lessons planned today",
    description: "Your schedule is clear. Take a moment to plan ahead!",
    actionLabel: "Plan a lesson",
  },
};

interface EmptyStateProps {
  variant: EmptyStateVariant;
  onAction?: () => void;
  className?: string;
  /** Override default title */
  title?: string;
  /** Override default description */
  description?: string;
  /** Override default action label */
  actionLabel?: string;
  /** Hide the action button */
  hideAction?: boolean;
}

/**
 * Calm and encouraging empty state component.
 * 
 * Design principles:
 * - Soft, muted colors
 * - Clear single call-to-action
 * - Encouraging copy (no negative language)
 * 
 * Variants:
 * - no-data: Generic empty state
 * - upload-first: First upload prompt
 * - no-lessons: No scheduled lessons
 */
export function EmptyState({
  variant,
  onAction,
  className,
  title: titleOverride,
  description: descriptionOverride,
  actionLabel: actionLabelOverride,
  hideAction = false,
}: EmptyStateProps) {
  const config = variants[variant];
  const Icon = config.icon;
  
  const title = titleOverride ?? config.title;
  const description = descriptionOverride ?? config.description;
  const actionLabel = actionLabelOverride ?? config.actionLabel;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-6 text-center",
        className
      )}
    >
      {/* Icon container */}
      <div className="mb-6 relative">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon className="h-10 w-10 text-primary" />
        </div>
        {/* Decorative glow */}
        <div className="absolute inset-0 w-20 h-20 rounded-full bg-primary/5 blur-xl" />
      </div>

      {/* Text content */}
      <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-[280px] leading-relaxed mb-6">
        {description}
      </p>

      {/* Call to action */}
      {!hideAction && actionLabel && (
        <Button
          onClick={onAction}
          className="rounded-xl px-6"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
