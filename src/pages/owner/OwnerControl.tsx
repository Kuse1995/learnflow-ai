import { Navigate } from 'react-router-dom';
import { usePlatformOwner } from '@/hooks/usePlatformOwner';
import { usePendingCounts } from '@/hooks/useOwnerControls';
import {
  OwnerModeBanner,
  SystemActionsPanel,
  AdaptivePlansTable,
  ParentInsightsTable,
  SystemHealthPanel,
  AccessOverridesPanel,
  QuickNavigationPanel,
  SchoolManagementPanel,
  UserManagementPanel,
  ClassManagementPanel,
} from '@/components/owner';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, Brain, FileText } from 'lucide-react';

export default function OwnerControl() {
  const { isPlatformOwner, isLoading } = usePlatformOwner();
  const { data: pendingCounts } = usePendingCounts();

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Skeleton className="h-16 w-full mb-8" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  // Access denied - redirect non-owners
  if (!isPlatformOwner) {
    return <Navigate to="/access-denied" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Owner Mode Banner */}
      <OwnerModeBanner />

      {/* Page Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <Settings className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Owner Control Center</h1>
              <p className="text-muted-foreground">
                Highest authority layer — full system control
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-6 space-y-6">
        {/* Quick Navigation - Full Width */}
        <QuickNavigationPanel />

        {/* School & User Management Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          <SchoolManagementPanel />
          <UserManagementPanel />
        </div>

        {/* Access Overrides & Class Management Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          <AccessOverridesPanel />
          <ClassManagementPanel />
        </div>

        {/* System Actions - Full Width */}
        <SystemActionsPanel />

        {/* Pending Reviews Section */}
        <div>
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-xl font-semibold">Pending Reviews</h2>
            <div className="flex gap-2">
              {pendingCounts && pendingCounts.adaptivePlans > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Brain className="h-3 w-3" />
                  {pendingCounts.adaptivePlans} plans
                </Badge>
              )}
              {pendingCounts && pendingCounts.parentInsights > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {pendingCounts.parentInsights} insights
                </Badge>
              )}
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <AdaptivePlansTable />
            <ParentInsightsTable />
          </div>
        </div>

        {/* System Health - Full Width */}
        <SystemHealthPanel />
      </main>
    </div>
  );
}
