/**
 * School Admin Dashboard Page
 * Governance & Oversight Layer for Zambian Schools
 */

import { useState, useEffect } from "react";
import {
  SchoolAdminOnboardingFlow,
  GovernanceDashboard,
} from "@/components/school-admin";
import {
  useIsSchoolAdmin,
  useSchoolAdminSchool,
  useSchoolAdminOnboarding,
  useCreateSchoolAdminOnboarding,
} from "@/hooks/useSchoolAdmin";
import { AdminLayout } from "@/components/navigation/AdminNav";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DemoModeBanner } from "@/components/demo";
import { useIsDemoSchool } from "@/hooks/useDemoSafety";

export default function SchoolAdminDashboard() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  const { data: isAdmin, isLoading: isAdminLoading } = useIsSchoolAdmin();
  const { data: school, isLoading: isSchoolLoading } = useSchoolAdminSchool();
  const { data: onboarding, isLoading: isOnboardingLoading } = useSchoolAdminOnboarding();
  const createOnboarding = useCreateSchoolAdminOnboarding();
  const { data: isDemo } = useIsDemoSchool(school?.id);

  useEffect(() => {
    if (school && !onboarding && !isOnboardingLoading) {
      createOnboarding.mutate(school.id);
    }
  }, [school, onboarding, isOnboardingLoading]);

  useEffect(() => {
    if (onboarding && !onboarding.completed_at) {
      setShowOnboarding(true);
    }
  }, [onboarding]);

  const isLoading = isAdminLoading || isSchoolLoading || isOnboardingLoading;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You don't have school administrator access.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No School Assigned</AlertTitle>
          <AlertDescription>
            Your account is not yet linked to a school.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <>
      {showOnboarding && (
        <SchoolAdminOnboardingFlow
          onComplete={() => setShowOnboarding(false)}
          currentStep={onboarding?.current_step || 1}
        />
      )}

      <AdminLayout schoolName={school.name}>
        <div className="space-y-6">
          {/* Demo Mode Banner */}
          {isDemo && (
            <DemoModeBanner schoolId={school?.id} context="admin" />
          )}

          <div className="bg-muted/50 rounded-lg px-4 py-3 text-sm text-muted-foreground">
            <p>👋 Welcome to your admin dashboard. You manage school systems here — teachers manage their classrooms.</p>
          </div>

          <GovernanceDashboard schoolId={school.id} schoolName={school.name} />
        </div>
      </AdminLayout>
    </>
  );
}
