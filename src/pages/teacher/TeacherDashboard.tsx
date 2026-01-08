import { Link } from "react-router-dom";
import { TeacherLayout } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ClipboardCheck, 
  Upload, 
  Clock, 
  Users, 
  AlertCircle, 
  ChevronRight,
  BookOpen
} from "lucide-react";
import { DemoModeBanner, DemoExitButton } from "@/components/demo";
import { useDemoMode, DEMO_SCHOOL_ID, DEMO_CLASS_ID } from "@/contexts/DemoModeContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function TeacherDashboard() {
  const { isDemoMode, demoSchoolId } = useDemoMode();
  
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // Fetch demo class data when in demo mode
  const { data: demoClasses } = useQuery({
    queryKey: ['demo-classes', demoSchoolId],
    queryFn: async () => {
      if (!demoSchoolId) return [];
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, grade, section, subject')
        .eq('school_id', demoSchoolId)
        .eq('is_demo', true);
      if (error) throw error;
      return data || [];
    },
    enabled: isDemoMode && !!demoSchoolId,
  });

  // Fetch student count for demo class
  const { data: studentCount } = useQuery({
    queryKey: ['demo-student-count', DEMO_CLASS_ID],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', DEMO_CLASS_ID);
      if (error) throw error;
      return count || 0;
    },
    enabled: isDemoMode,
  });

  // Fetch students needing attention (those with adaptive support plans)
  const { data: studentsNeedingAttention } = useQuery({
    queryKey: ['demo-attention-students', DEMO_CLASS_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id, 
          name,
          adaptive_support_plans(id, focus_areas)
        `)
        .eq('class_id', DEMO_CLASS_ID)
        .eq('is_demo', true)
        .limit(3);
      if (error) throw error;
      return (data || []).map(s => ({
        id: s.id,
        name: s.name,
        reason: s.adaptive_support_plans?.[0] 
          ? 'Has adaptive support plan' 
          : 'Recent assessment data available',
      }));
    },
    enabled: isDemoMode,
  });

  // Transform demo classes to display format
  const todaysClasses = isDemoMode && demoClasses
    ? demoClasses.map((cls, idx) => ({
        id: cls.id,
        name: cls.name,
        grade: `${cls.grade}${cls.section || ''}`,
        time: idx === 0 ? '8:00 AM' : idx === 1 ? '9:30 AM' : '11:00 AM',
        students: studentCount || 0,
      }))
    : [
        { id: "1", name: "Mathematics 101", grade: "10A", time: "8:00 AM", students: 28 },
        { id: "2", name: "Mathematics 101", grade: "10B", time: "9:30 AM", students: 25 },
      ];

  const attentionList = studentsNeedingAttention || [
    { id: "1", name: "Loading...", reason: "Checking student data..." },
  ];

  return (
    <TeacherLayout schoolName={isDemoMode ? "North Park School (Demo)" : "Stitch Academy"}>
      <div className="flex flex-col min-h-full pb-24 md:pb-8">
        {/* Demo Mode Banner */}
        {isDemoMode && (
          <div className="px-4 pt-4 flex flex-col gap-2">
            <DemoModeBanner schoolId={DEMO_SCHOOL_ID} context="teacher" />
            <div className="flex justify-end">
              <DemoExitButton />
            </div>
          </div>
        )}

        {/* Header */}
        <header className="px-4 pt-6 pb-4">
          <p className="text-sm text-muted-foreground">{currentDate}</p>
          <h1 className="text-2xl font-bold tracking-tight">Good morning!</h1>
        </header>

        {/* Quick Actions */}
        <section className="px-4 mb-6">
          <div className="grid grid-cols-2 gap-3">
            <Link to="/teacher/attendance">
              <Card className="bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer h-full">
                <CardContent className="flex flex-col items-center justify-center p-4 gap-2">
                  <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                    <ClipboardCheck className="h-6 w-6" />
                  </div>
                  <span className="font-semibold text-sm text-center">Take Attendance</span>
                </CardContent>
              </Card>
            </Link>
            
            <Link to="/teacher/uploads">
              <Card className="bg-secondary hover:bg-secondary/80 transition-colors cursor-pointer h-full">
                <CardContent className="flex flex-col items-center justify-center p-4 gap-2">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                  <span className="font-semibold text-sm text-center">Upload Test</span>
                </CardContent>
              </Card>
            </Link>
          </div>
        </section>

        {/* Today's Classes */}
        <section className="px-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Today's Classes</h2>
            <Link to="/teacher/classes" className="text-primary text-sm font-medium hover:underline">
              View all
            </Link>
          </div>

          <div className="space-y-3">
            {todaysClasses.map((cls) => (
              <Card key={cls.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{cls.name}</h3>
                        <p className="text-xs text-muted-foreground">Grade {cls.grade}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="text-sm font-medium">{cls.time}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
                        <Users className="h-3.5 w-3.5" />
                        <span className="text-xs">{cls.students} students</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Students Needing Attention */}
        <section className="px-4 mb-6">
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/50">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <CardTitle className="text-base font-semibold">Students Needing Attention</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-muted-foreground mb-3">
                AI-powered insights coming soon
              </p>
              <div className="space-y-2">
                {attentionList.map((student) => (
                  <Link
                    key={student.id}
                    to={isDemoMode ? `/teacher/classes/${DEMO_CLASS_ID}/students/${student.id}` : '#'}
                    className="flex items-center justify-between py-2 border-b border-amber-200/50 dark:border-amber-900/30 last:border-0 hover:bg-amber-100/50 dark:hover:bg-amber-900/20 rounded px-1 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{student.name}</p>
                      <p className="text-xs text-muted-foreground">{student.reason}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3 border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/30"
              >
                View All Insights
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </TeacherLayout>
  );
}
