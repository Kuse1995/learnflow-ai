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
  Brain, 
  Check,
  Shield,
  User,
  BookOpen
} from 'lucide-react';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';
import { useTerminologyConfig } from '@/hooks/useClassLevelTerminology';

interface PendingPlan {
  id: string;
  student_id: string;
  focus_areas: unknown;
  support_strategies: unknown;
  confidence_support_notes: string | null;
  teacher_acknowledged: boolean;
  created_at: string;
  student: {
    id: string;
    name: string;
    class_id: string;
  } | null;
  class: {
    id: string;
    name: string;
    grade: string | null;
    section: string | null;
  } | null;
}

export default function PendingAdaptiveSupportPlans() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthContext();
  const { isPlatformOwner, isLoading: loadingOwner } = usePlatformOwner();
  const { data: isSuperAdmin, isLoading: loadingSuperAdmin } = useIsSuperAdmin();
  const terminology = useTerminologyConfig(); // Default terminology for platform admin

  // Fetch all pending adaptive support plans
  const { data: pendingPlans = [], isLoading: loadingPlans } = useQuery({
    queryKey: ['pending-adaptive-support-plans-all'],
    queryFn: async (): Promise<PendingPlan[]> => {
      // First get the plans - try adaptive_support_plans first, fallback to student_intervention_plans
      const { data: plans, error } = await supabase
        .from('adaptive_support_plans')
        .select('id, student_id, focus_areas, support_strategies, confidence_support_notes, teacher_acknowledged, created_at')
        .eq('teacher_acknowledged', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!plans || plans.length === 0) return [];

      // Get unique student IDs
      const studentIds = [...new Set(plans.map(p => p.student_id))];

      // Fetch students
      const { data: students } = await supabase
        .from('students')
        .select('id, name, class_id')
        .in('id', studentIds);

      const studentsMap = new Map((students || []).map(s => [s.id, s]));

      // Get unique class IDs from students
      const classIds = [...new Set((students || []).map(s => s.class_id).filter(Boolean))];

      // Fetch classes
      const { data: classes } = await supabase
        .from('classes')
        .select('id, name, grade, section')
        .in('id', classIds);

      const classesMap = new Map((classes || []).map(c => [c.id, c]));

      return plans.map(plan => {
        const student = studentsMap.get(plan.student_id);
        return {
          ...plan,
          student: student ? { id: student.id, name: student.name, class_id: student.class_id } : null,
          class: student?.class_id ? classesMap.get(student.class_id) || null : null,
        };
      });
    },
    enabled: isPlatformOwner || !!isSuperAdmin,
  });

  // Acknowledge mutation
  const acknowledgeMutation = useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await supabase
        .from('adaptive_support_plans')
        .update({ 
          teacher_acknowledged: true,
          teacher_acknowledged_at: new Date().toISOString()
        })
        .eq('id', planId);
      
      if (error) throw error;
      return planId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-adaptive-support-plans-all'] });
      queryClient.invalidateQueries({ queryKey: ['platform-admin-pending-counts'] });
      toast.success('Adaptive Support Plan acknowledged');
    },
    onError: (error) => {
      toast.error('Failed to acknowledge plan: ' + (error as Error).message);
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
            <Brain className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Pending Adaptive Support Plans</h1>
              <p className="text-muted-foreground">Review and acknowledge AI-generated support plans</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-6">
        {loadingPlans ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : pendingPlans.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Pending Plans</h3>
              <p className="text-muted-foreground">All adaptive support plans have been acknowledged.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingPlans.map((plan) => (
              <Card key={plan.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{plan.student?.name || 'Unknown Student'}</CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          <BookOpen className="h-3 w-3" />
                          {plan.class?.name || 'Unknown Class'}
                          {plan.class?.grade && ` • ${terminology.singular} ${plan.class.grade}`}
                          {plan.class?.section && ` • Section ${plan.class.section}`}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      Pending Acknowledgment
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Focus Areas</h4>
                      <div className="flex flex-wrap gap-1">
                        {Array.isArray(plan.focus_areas) && plan.focus_areas.slice(0, 3).map((area, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {String(area)}
                          </Badge>
                        ))}
                        {Array.isArray(plan.focus_areas) && plan.focus_areas.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{plan.focus_areas.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-2">Support Strategies</h4>
                      <div className="flex flex-wrap gap-1">
                        {Array.isArray(plan.support_strategies) && plan.support_strategies.slice(0, 2).map((strategy, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {String(strategy).substring(0, 40)}...
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {plan.confidence_support_notes && (
                    <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                      <h4 className="text-sm font-medium mb-1">Confidence Support Notes</h4>
                      <p className="text-sm text-muted-foreground">{plan.confidence_support_notes}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t">
                    <span className="text-xs text-muted-foreground">
                      Generated {new Date(plan.created_at).toLocaleDateString()}
                    </span>
                    <Button 
                      size="sm" 
                      onClick={() => acknowledgeMutation.mutate(plan.id)}
                      disabled={acknowledgeMutation.isPending}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      {acknowledgeMutation.isPending ? 'Acknowledging...' : 'Acknowledge Plan'}
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
