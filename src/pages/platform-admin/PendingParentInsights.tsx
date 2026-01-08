import { useNavigate } from 'react-router-dom';
import { useIsSuperAdmin } from '@/hooks/useSuperAdmin';
import { useAuthContext } from '@/contexts/AuthContext';
import { usePlatformOwner } from '@/hooks/usePlatformOwner';
import { PlatformOwnerBanner } from '@/components/platform-owner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft,
  FileText, 
  Check,
  Shield,
  User,
  BookOpen,
  Lightbulb
} from 'lucide-react';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';
import { useTerminologyConfig } from '@/hooks/useClassLevelTerminology';

interface PendingInsight {
  id: string;
  student_id: string;
  class_id: string;
  summary_text: string;
  home_support_tips: string[];
  teacher_approved: boolean;
  created_at: string;
  student: {
    id: string;
    name: string;
  } | null;
  class: {
    id: string;
    name: string;
    grade: string | null;
    section: string | null;
  } | null;
}

export default function PendingParentInsights() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthContext();
  const { isPlatformOwner, isLoading: loadingOwner } = usePlatformOwner();
  const { data: isSuperAdmin, isLoading: loadingSuperAdmin } = useIsSuperAdmin();
  const terminology = useTerminologyConfig(); // Default terminology for platform admin

  // Fetch all pending parent insights
  const { data: pendingInsights = [], isLoading: loadingInsights } = useQuery({
    queryKey: ['pending-parent-insights-all'],
    queryFn: async (): Promise<PendingInsight[]> => {
      // First get the insight summaries
      const { data: insights, error } = await supabase
        .from('parent_insight_summaries')
        .select('id, student_id, class_id, summary_text, home_support_tips, teacher_approved, created_at')
        .eq('teacher_approved', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!insights || insights.length === 0) return [];

      // Get unique student and class IDs
      const studentIds = [...new Set(insights.map(i => i.student_id))];
      const classIds = [...new Set(insights.map(i => i.class_id))];

      // Fetch students and classes in parallel
      const [studentsRes, classesRes] = await Promise.all([
        supabase.from('students').select('id, name').in('id', studentIds),
        supabase.from('classes').select('id, name, grade, section').in('id', classIds)
      ]);

      const studentsMap = new Map((studentsRes.data || []).map(s => [s.id, s]));
      const classesMap = new Map((classesRes.data || []).map(c => [c.id, c]));

      return insights.map(insight => ({
        ...insight,
        student: studentsMap.get(insight.student_id) || null,
        class: classesMap.get(insight.class_id) || null,
      }));
    },
    enabled: isPlatformOwner || !!isSuperAdmin,
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (insightId: string) => {
      const { error } = await supabase
        .from('parent_insight_summaries')
        .update({ 
          teacher_approved: true,
          approved_at: new Date().toISOString()
        })
        .eq('id', insightId);
      
      if (error) throw error;
      return insightId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-parent-insights-all'] });
      queryClient.invalidateQueries({ queryKey: ['platform-admin-pending-counts'] });
      queryClient.invalidateQueries({ queryKey: ['pending-parent-insights-by-class'] });
      toast.success('Parent Insight approved');
    },
    onError: (error) => {
      toast.error('Failed to approve insight: ' + (error as Error).message);
    },
  });

  // Check access
  const isLoading = authLoading || loadingOwner || loadingSuperAdmin;
  const hasAccess = isPlatformOwner || isSuperAdmin;
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Skeleton className="h-12 w-64 mb-8" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (!hasAccess) {
    return <Navigate to="/teacher" replace />;
  }

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
          <Button 
            variant="ghost" 
            className="mb-4"
            onClick={() => navigate('/platform-admin')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Pending Parent Insights</h1>
              <p className="text-muted-foreground">Review and approve AI-generated parent summaries</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-6">
        {loadingInsights ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : pendingInsights.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Pending Insights</h3>
              <p className="text-muted-foreground">All parent insights have been approved.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingInsights.map((insight) => (
              <Card key={insight.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{insight.student?.name || 'Unknown Student'}</CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          <BookOpen className="h-3 w-3" />
                          {insight.class?.name || 'Unknown Class'}
                          {insight.class?.grade && ` • ${terminology.singular} ${insight.class.grade}`}
                          {insight.class?.section && ` • Section ${insight.class.section}`}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      Pending Approval
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Summary */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium mb-2">Summary for Parent</h4>
                    <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                      {insight.summary_text}
                    </p>
                  </div>
                  
                  {/* Home Support Tips */}
                  {Array.isArray(insight.home_support_tips) && insight.home_support_tips.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-amber-500" />
                        Home Support Tips
                      </h4>
                      <ul className="space-y-2">
                        {insight.home_support_tips.map((tip, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-primary">•</span>
                            {String(tip)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t">
                    <span className="text-xs text-muted-foreground">
                      Generated {new Date(insight.created_at).toLocaleDateString()}
                    </span>
                    <Button 
                      size="sm" 
                      onClick={() => approveMutation.mutate(insight.id)}
                      disabled={approveMutation.isPending}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      {approveMutation.isPending ? 'Approving...' : 'Approve for Parent'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
