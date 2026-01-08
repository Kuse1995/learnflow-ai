import { Navigate, useNavigate } from 'react-router-dom';
import { useIsSuperAdmin } from '@/hooks/useSuperAdmin';
import { useAuthContext } from '@/contexts/AuthContext';
import { usePlatformOwner } from '@/hooks/usePlatformOwner';
import { usePendingParentInsightsByClass } from '@/hooks/usePendingParentInsights';
import { PlatformOwnerBanner } from '@/components/platform-owner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  RotateCcw, 
  Trash2, 
  FileText, 
  Brain, 
  BellOff, 
  Shield,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTerminologyConfig } from '@/hooks/useClassLevelTerminology';

export default function PlatformAdmin() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthContext();
  const { isPlatformOwner, isLoading: loadingOwner } = usePlatformOwner();
  const { data: isSuperAdmin, isLoading: loadingSuperAdmin } = useIsSuperAdmin();
  const { data: pendingByClass = [], isLoading: loadingPendingByClass } = usePendingParentInsightsByClass();
  const terminology = useTerminologyConfig(); // Default terminology for platform admin

  // Fetch pending counts
  const { data: pendingCounts, isLoading: loadingCounts } = useQuery({
    queryKey: ['platform-admin-pending-counts'],
    queryFn: async (): Promise<{ pendingInsights: number; pendingPlans: number }> => {
      // Get pending parent insights count
      const insightsRes = await (supabase
        .from('parent_insight_summaries') as any)
        .select('id', { count: 'exact', head: true })
        .eq('approved', false);

      // Get pending adaptive support plans count
      const plansRes = await (supabase
        .from('adaptive_support_plans') as any)
        .select('id', { count: 'exact', head: true })
        .eq('teacher_acknowledged', false);

      return {
        pendingInsights: insightsRes.count ?? 0,
        pendingPlans: plansRes.count ?? 0,
      };
    },
    enabled: isPlatformOwner || !!isSuperAdmin,
  });

  // Check access - must be authenticated platform owner or super admin
  const isLoading = authLoading || loadingOwner || loadingSuperAdmin;
  const hasAccess = isPlatformOwner || isSuperAdmin;
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Skeleton className="h-12 w-64 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  // Require authentication
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // Only platform owners and super admins can access this page
  if (!hasAccess) {
    return <Navigate to="/teacher" replace />;
  }

  const handleResetDemoData = async () => {
    toast.info('Reset demo data functionality coming soon');
  };

  const handleClearDemoAnalytics = async () => {
    toast.info('Clear demo analytics functionality coming soon');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Platform Owner Banner */}
      <PlatformOwnerBanner />
      
      {/* Super Admin Banner (only if not platform owner) */}
      {!isPlatformOwner && (
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-3">
          <div className="container mx-auto flex items-center gap-3">
            <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
              <Shield className="h-3 w-3 mr-1" />
              SUPER ADMIN
            </Badge>
            <span className="text-sm text-primary">
              Full platform access as <strong>{user?.email}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Platform Administration</h1>
              <p className="text-muted-foreground">Manage system settings and monitor platform health</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-6 space-y-6">
        {/* Demo Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Demo Controls
            </CardTitle>
            <CardDescription>
              Manage demo environment data and analytics
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Button 
              variant="outline" 
              onClick={handleResetDemoData}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset Demo Data
            </Button>
            <Button 
              variant="outline" 
              onClick={handleClearDemoAnalytics}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear Demo Analytics
            </Button>
          </CardContent>
        </Card>

        {/* Pending Reviews */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Pending Reviews
            </CardTitle>
            <CardDescription>
              Items awaiting teacher acknowledgment or approval
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary Row - Clickable Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                className="flex items-center justify-between p-4 border rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                onClick={() => navigate('/platform-admin/pending/parent-insights')}
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Pending Parent Insights</p>
                    <p className="text-sm text-muted-foreground">Click to review and approve</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {loadingCounts ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      {pendingCounts?.pendingInsights ?? 0}
                    </Badge>
                  )}
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>

              <div 
                className="flex items-center justify-between p-4 border rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                onClick={() => navigate('/platform-admin/pending/adaptive-support')}
              >
                <div className="flex items-center gap-3">
                  <Brain className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Pending Adaptive Support Plans</p>
                    <p className="text-sm text-muted-foreground">Click to review and acknowledge</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {loadingCounts ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      {pendingCounts?.pendingPlans ?? 0}
                    </Badge>
                  )}
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </div>

            {/* Pending Parent Insights by Class */}
            {(pendingCounts?.pendingInsights ?? 0) > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Parent Insights by Class</h4>
                {loadingPendingByClass ? (
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <Skeleton key={i} className="h-14 w-full rounded-lg" />
                    ))}
                  </div>
                ) : pendingByClass.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No pending insights found.</p>
                ) : (
                  <div className="space-y-2">
                    {pendingByClass.map((item) => (
                      <div
                        key={item.classId}
                        className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => navigate(`/teacher/classes/${item.classId}/parent-insights`)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                            <BookOpen className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{item.className}</p>
                            {item.grade && item.section && (
                              <p className="text-xs text-muted-foreground">
                                {terminology.singular} {item.grade} • Section {item.section}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200">
                            {item.pendingCount} pending
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              System Status
            </CardTitle>
            <CardDescription>
              Current platform configuration and safety indicators
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Super Admin Indicator */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Access Level</p>
                    <p className="text-sm text-muted-foreground">Platform-wide permissions</p>
                  </div>
                </div>
                <Badge variant="default" className="bg-primary">
                  SUPER ADMIN
                </Badge>
              </div>

              {/* Notifications Disabled Indicator */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <BellOff className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Notifications Disabled</p>
                    <p className="text-sm text-muted-foreground">No external messages sent in demo</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-green-600 border-green-600">
                  SAFE
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
