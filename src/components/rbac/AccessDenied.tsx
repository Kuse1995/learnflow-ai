import React from 'react';
import { ShieldX, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

interface AccessDeniedProps {
  /** Custom title */
  title?: string;
  /** Custom message */
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
 * Friendly message shown when a user doesn't have permission to access a resource.
 * Never shames or blames the user.
 */
export function AccessDenied({
  title = 'Access Restricted',
  message = "You don't have permission to view this content. If you believe this is an error, please contact your school administrator.",
  showBack = true,
  showHome = true,
  action,
  compact = false,
}: AccessDeniedProps) {
  const navigate = useNavigate();

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border">
        <ShieldX className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground truncate">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <ShieldX className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
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
 * Full-page version for route-level access denial
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
 * Friendly message for features not included in the school's plan
 */
export function FeatureNotAvailable({
  featureName,
  compact = false,
}: {
  featureName?: string;
  compact?: boolean;
}) {
  const message = featureName
    ? `The ${featureName} feature is not available in your current plan. Please contact your administrator for more information.`
    : "This feature is not available in your current plan.";

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
