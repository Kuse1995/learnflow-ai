import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDeleteAdaptivePlan, useDeleteParentInsight } from '@/hooks/useOwnerControls';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Brain, FileText, Check, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

// =============================================================================
// ADAPTIVE SUPPORT PLANS TABLE
// =============================================================================

interface PendingPlan {
  id: string;
  student_id: string;
  focus_areas: unknown;
  created_at: string;
  student: { name: string } | null;
  class: { name: string; grade: string | null } | null;
}

export function AdaptivePlansTable() {
  const queryClient = useQueryClient();
  const deletePlan = useDeleteAdaptivePlan();

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['owner-pending-plans'],
    queryFn: async (): Promise<PendingPlan[]> => {
      const { data, error } = await supabase
        .from('adaptive_support_plans')
        .select('id, student_id, focus_areas, created_at')
        .eq('teacher_acknowledged', false)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      if (!data?.length) return [];

      const studentIds = [...new Set(data.map(p => p.student_id))];
      const { data: students } = await supabase
        .from('students')
        .select('id, name, class_id')
        .in('id', studentIds);

      const classIds = [...new Set((students || []).map(s => s.class_id).filter(Boolean))];
      const { data: classes } = await supabase
        .from('classes')
        .select('id, name, grade')
        .in('id', classIds);

      const studentsMap = new Map((students || []).map(s => [s.id, s]));
      const classesMap = new Map((classes || []).map(c => [c.id, c]));

      return data.map(plan => {
        const student = studentsMap.get(plan.student_id);
        return {
          ...plan,
          student: student ? { name: student.name } : null,
          class: student?.class_id ? classesMap.get(student.class_id) || null : null,
        };
      });
    },
  });

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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-pending-plans'] });
      queryClient.invalidateQueries({ queryKey: ['owner-pending-counts'] });
      toast.success('Plan acknowledged');
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Adaptive Support Plans</CardTitle>
        </div>
        <CardDescription>Pending AI-generated support plans</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : plans.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No pending plans</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Focus Areas</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">
                    {plan.student?.name || 'Unknown'}
                  </TableCell>
                  <TableCell>
                    {plan.class?.name || 'Unknown'}
                    {plan.class?.grade && <span className="text-muted-foreground"> G{plan.class.grade}</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap max-w-[200px]">
                      {Array.isArray(plan.focus_areas) && plan.focus_areas.slice(0, 2).map((area, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {String(area).substring(0, 15)}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(plan.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => acknowledgeMutation.mutate(plan.id)}
                        disabled={acknowledgeMutation.isPending}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Plan?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete this support plan.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deletePlan.mutate(plan.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// PARENT INSIGHTS TABLE
// =============================================================================

interface PendingInsight {
  id: string;
  student_id: string;
  summary_text: string;
  created_at: string;
  student: { name: string } | null;
  class: { name: string; grade: string | null } | null;
}

export function ParentInsightsTable() {
  const queryClient = useQueryClient();
  const deleteInsight = useDeleteParentInsight();

  const { data: insights = [], isLoading } = useQuery({
    queryKey: ['owner-pending-insights'],
    queryFn: async (): Promise<PendingInsight[]> => {
      const { data, error } = await supabase
        .from('parent_insight_summaries')
        .select('id, student_id, class_id, summary_text, created_at')
        .eq('teacher_approved', false)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      if (!data?.length) return [];

      const studentIds = [...new Set(data.map(i => i.student_id))];
      const classIds = [...new Set(data.map(i => i.class_id))];

      const [studentsRes, classesRes] = await Promise.all([
        supabase.from('students').select('id, name').in('id', studentIds),
        supabase.from('classes').select('id, name, grade').in('id', classIds),
      ]);

      const studentsMap = new Map((studentsRes.data || []).map(s => [s.id, s]));
      const classesMap = new Map((classesRes.data || []).map(c => [c.id, c]));

      return data.map(insight => ({
        ...insight,
        student: studentsMap.get(insight.student_id) || null,
        class: classesMap.get(insight.class_id) || null,
      }));
    },
  });

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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-pending-insights'] });
      queryClient.invalidateQueries({ queryKey: ['owner-pending-counts'] });
      toast.success('Insight approved');
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Parent Insights</CardTitle>
        </div>
        <CardDescription>Pending AI-generated parent summaries</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : insights.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No pending insights</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Summary Preview</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {insights.map((insight) => (
                <TableRow key={insight.id}>
                  <TableCell className="font-medium">
                    {insight.student?.name || 'Unknown'}
                  </TableCell>
                  <TableCell>
                    {insight.class?.name || 'Unknown'}
                    {insight.class?.grade && <span className="text-muted-foreground"> G{insight.class.grade}</span>}
                  </TableCell>
                  <TableCell className="max-w-[250px] truncate text-sm text-muted-foreground">
                    {insight.summary_text?.substring(0, 60)}...
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(insight.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => approveMutation.mutate(insight.id)}
                        disabled={approveMutation.isPending}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Insight?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete this parent insight.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteInsight.mutate(insight.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
