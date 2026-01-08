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
import { useTerminologyConfig } from "@/hooks/useClassLevelTerminology";
import { useTeacherSchool } from "@/hooks/useTeacherSchool";

export default function TeacherDashboard() {
  const { isDemoMode, demoSchoolId } = useDemoMode();
  const { schoolName } = useTeacherSchool();
  const terminology = useTerminologyConfig(); // Uses default 'grade' for demo
  
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

  // Fetch students needing attention for demo
  const { data: studentsNeedingAttention } = useQuery({
    queryKey: ['demo-attention-students', DEMO_CLASS_ID],
    queryFn: async () => {
      // In demo, just get students from the demo class
      const { data, error } = await supabase
        .from('students')
        .select('id, name')
        .eq('class_id', DEMO_CLASS_ID)
        .limit(3);
      if (error) throw error;
      return data?.map(s => ({
        id: s.id,
        name: s.name,
        reason: "Recent absence patterns"
      })) || [];
    },
    enabled: isDemoMode,
  });

  // Use demo data or defaults
  const displayClasses = isDemoMode && demoClasses && demoClasses.length > 0
    ? demoClasses.map(c => ({
        id: c.id,
        name: c.name || "Class",
        grade: c.grade ? `${terminology.singular} ${c.grade}` : "",
        time: "Morning",
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
    <TeacherLayout schoolName={schoolName}>
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
        <section className="px-4 grid grid-cols-2 gap-3 mb-6">
          <Link to="/teacher/attendance" className="block">
            <Card className="h-full hover:border-primary/50 transition-colors">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full min-h-[100px]">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <ClipboardCheck className="h-5 w-5 text-primary" />
                </div>
                <span className="font-medium text-sm">Take Attendance</span>
              </CardContent>
            </Card>
          </Link>

          <Link to="/teacher/uploads" className="block">
            <Card className="h-full hover:border-primary/50 transition-colors">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full min-h-[100px]">
                <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center mb-2">
                  <Upload className="h-5 w-5 text-accent" />
                </div>
                <span className="font-medium text-sm">Upload Work</span>
              </CardContent>
            </Card>
          </Link>
        </section>

        {/* Today's Classes */}
        <section className="px-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Today's Classes</h2>
            <Link to="/teacher/classes">
              <Button variant="ghost" size="sm" className="gap-1">
                View All
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="space-y-2">
            {displayClasses.map((cls) => (
              <Link key={cls.id} to={`/teacher/classes/${cls.id}`}>
                <Card className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <BookOpen className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate">{cls.name}</h3>
                      <p className="text-xs text-muted-foreground">{cls.grade}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {cls.time}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Users className="h-3 w-3" />
                        {cls.students}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Students Needing Attention */}
        <section className="px-4 mb-6">
          <Card className="border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                Students Needing Attention
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {attentionList.slice(0, 2).map((student) => (
                  <div key={student.id} className="flex items-center gap-3 p-2 rounded-lg bg-background/50">
                    <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                        {student.name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{student.name}</p>
                      <p className="text-xs text-muted-foreground">{student.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* View All Classes */}
        <section className="px-4">
          <Link to="/teacher/classes">
            <Button variant="outline" className="w-full">
              View All My Classes
            </Button>
          </Link>
        </section>
      </div>
    </TeacherLayout>
  );
}
