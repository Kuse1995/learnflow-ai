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
import { DemoModeBanner } from "@/components/demo";
import { useIsDemoSchool } from "@/hooks/useDemoSafety";

// Demo school ID for development
const DEMO_SCHOOL_ID = "5e508bfd-bd20-4461-8687-450a450111b8";

// Placeholder data - will be replaced with real data later
const todaysClasses = [
  { id: "1", name: "Mathematics 101", grade: "10A", time: "8:00 AM", students: 28 },
  { id: "2", name: "Mathematics 101", grade: "10B", time: "9:30 AM", students: 25 },
  { id: "3", name: "Advanced Calculus", grade: "12A", time: "11:00 AM", students: 18 },
];

const studentsNeedingAttention = [
  { id: "1", name: "Alex Thompson", reason: "Missed 3 classes this week" },
  { id: "2", name: "Sarah Chen", reason: "Grades dropping in recent tests" },
  { id: "3", name: "Marcus Johnson", reason: "Incomplete homework submissions" },
];

export default function TeacherDashboard() {
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const { data: isDemo } = useIsDemoSchool(DEMO_SCHOOL_ID);

  return (
    <TeacherLayout schoolName="Stitch Academy">
      <div className="flex flex-col min-h-full pb-24 md:pb-8">
        {/* Demo Mode Banner */}
        {isDemo && (
          <div className="px-4 pt-4">
            <DemoModeBanner schoolId={DEMO_SCHOOL_ID} context="teacher" />
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
                {studentsNeedingAttention.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between py-2 border-b border-amber-200/50 dark:border-amber-900/30 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{student.name}</p>
                      <p className="text-xs text-muted-foreground">{student.reason}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
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
