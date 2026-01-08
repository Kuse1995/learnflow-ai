import React from 'react';
import { Lock, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

interface AccessDeniedProps {
  /** Custom title - should be neutral, never revealing if data exists */
  title?: string;
  /** Custom message - should be neutral and helpful */
  message?: string;
  /** Show back button */
  showBack?: boolean;
  /** Show home button */
  showHome?: boolean;
  /** Custom action */
  action?: React.ReactNode;
  /** Compact mode for inline use */
  compact?: boolean;
}

/**
 * Access Denied Component
 * 
 * Shows a neutral message when content is not available to the user.
 * 
 * IMPORTANT SECURITY RULES:
 * - Never reveals whether restricted data exists
 * - Never blames or shames the user
 * - Uses neutral, non-specific language
 * - Does not mention specific permissions or roles
 */
export function AccessDenied({
  title = 'Not Available',
  message = "This content is not available to your account. Please contact your administrator if you need assistance.",
  showBack = true,
  showHome = true,
  action,
  compact = false,
}: AccessDeniedProps) {
  const navigate = useNavigate();

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border">
        <Lock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground truncate">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <Card className="max-w-md w-full border-border">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <Lock className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl text-foreground">{title}</CardTitle>
          <CardDescription className="text-base">{message}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {showBack && (
              <Button variant="outline" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            )}
            {showHome && (
              <Button onClick={() => navigate('/')}>
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
            )}
            {action}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Access Denied Page
 * 
 * Full-page version for route-level access denial.
 * Uses neutral messaging that doesn't reveal if content exists.
 */
export function AccessDeniedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <AccessDenied />
    </div>
  );
}

/**
 * Feature Not Available
 * 
 * Neutral message when a feature isn't available.
 * Does not specify why to avoid revealing plan/permission details.
 */
export function FeatureNotAvailable({
  featureName,
  compact = false,
}: {
  featureName?: string;
  compact?: boolean;
}) {
  // Neutral message - doesn't reveal if it's a plan or permission issue
  const message = featureName
    ? `The ${featureName} feature is not currently available. Please contact your administrator for assistance.`
    : "This feature is not currently available.";

  return (
    <AccessDenied
      title="Feature Not Available"
      message={message}
      showBack={!compact}
      showHome={false}
      compact={compact}
    />
  );
}

/**
 * Data Not Accessible
 * 
 * Neutral message when data is not accessible.
 * NEVER reveals whether the data exists or not.
 */
export function DataNotAccessible({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <AccessDenied
      title="Not Available"
      message="This information is not available. Please contact your administrator if you need assistance."
      showBack={!compact}
      showHome={false}
      compact={compact}
    />
  );
}
