/**
 * School Admin Dashboard Page
 * Governance & Oversight Layer for Zambian Schools
 */

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  SchoolAdminOnboardingFlow,
  GovernanceDashboard,
  ManualPlanManager,
  SystemHistoryViewer,
} from "@/components/school-admin";
import {
  useIsSchoolAdmin,
  useSchoolAdminSchool,
  useSchoolAdminOnboarding,
  useCreateSchoolAdminOnboarding,
} from "@/hooks/useSchoolAdmin";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, LayoutGrid, CreditCard, History, Users, FileText } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";

export default function SchoolAdminDashboard() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const navigate = useNavigate();

  const { data: isAdmin, isLoading: isAdminLoading } = useIsSchoolAdmin();
  const { data: school, isLoading: isSchoolLoading } = useSchoolAdminSchool();
  const { data: onboarding, isLoading: isOnboardingLoading } = useSchoolAdminOnboarding();
  const createOnboarding = useCreateSchoolAdminOnboarding();

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

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="bg-muted/50 rounded-lg px-4 py-3 text-sm text-muted-foreground">
          <p>👋 Welcome to your admin dashboard. You manage school systems here — teachers manage their classrooms.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2" onClick={() => navigate("/admin/reports")}>
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
            <TabsTrigger value="plans" className="gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Plans</span>
            </TabsTrigger>
            <TabsTrigger value="staff" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Staff</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="overview" className="m-0">
              <GovernanceDashboard schoolId={school.id} schoolName={school.name} />
            </TabsContent>
            <TabsContent value="plans" className="m-0">
              <ManualPlanManager schoolId={school.id} />
            </TabsContent>
            <TabsContent value="staff" className="m-0">
              <div className="bg-muted/30 rounded-lg p-8 text-center">
                <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">Staff role management coming soon</p>
              </div>
            </TabsContent>
            <TabsContent value="history" className="m-0">
              <SystemHistoryViewer schoolId={school.id} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </>
  );
}
