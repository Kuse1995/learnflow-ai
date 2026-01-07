import { AlertCircle } from "lucide-react";
import { SAFETY_DISCLAIMERS, FALLBACK_COPY } from "@/lib/safety-constants";

interface SafetyDisclaimerProps {
  variant?: "teacher" | "parent" | "student" | "practice";
  className?: string;
}

/**
 * Safety disclaimer component - REQUIRED on every AI surface
 */
export function SafetyDisclaimer({ variant = "teacher", className = "" }: SafetyDisclaimerProps) {
  const getMessage = () => {
    switch (variant) {
      case "parent":
        return SAFETY_DISCLAIMERS.PARENT_APPROVED;
      case "student":
      case "practice":
        return SAFETY_DISCLAIMERS.TEACHER_GUIDANCE;
      case "teacher":
      default:
        return SAFETY_DISCLAIMERS.TEACHER_GUIDANCE;
    }
  };

  return (
    <p className={`text-xs text-muted-foreground leading-relaxed ${className}`}>
      {getMessage()}
    </p>
  );
}

interface SafetyFallbackProps {
  variant?: "unavailable" | "rate_limited" | "language_violation" | "failed";
  className?: string;
}

/**
 * Safety fallback message component
 */
export function SafetyFallback({ variant = "unavailable", className = "" }: SafetyFallbackProps) {
  const getMessage = () => {
    switch (variant) {
      case "rate_limited":
        return FALLBACK_COPY.RATE_LIMITED;
      case "language_violation":
        return FALLBACK_COPY.LANGUAGE_VIOLATION;
      case "failed":
        return FALLBACK_COPY.GENERATION_FAILED;
      case "unavailable":
      default:
        return FALLBACK_COPY.SERVICE_UNAVAILABLE;
    }
  };

  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-dashed ${className}`}>
      <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
      <p className="text-sm text-muted-foreground">{getMessage()}</p>
    </div>
  );
}

interface RateLimitBlockProps {
  onViewExisting?: () => void;
  className?: string;
}

/**
 * Rate limit block message with action
 */
export function RateLimitBlock({ onViewExisting, className = "" }: RateLimitBlockProps) {
  return (
    <div className={`text-center space-y-3 ${className}`}>
      <p className="text-sm text-muted-foreground">{FALLBACK_COPY.RATE_LIMITED}</p>
      {onViewExisting && (
        <button
          onClick={onViewExisting}
          className="text-sm text-primary hover:underline"
        >
          View existing insight
        </button>
      )}
    </div>
  );
}
