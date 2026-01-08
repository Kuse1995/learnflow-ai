import { useParams } from "react-router-dom";
import { 
  Loader2, 
  BookOpen, 
  Calendar, 
  Bell, 
  Home,
  RefreshCw,
  WifiOff
} from "lucide-react";
import { ParentInsightView } from "@/components/parent-insights";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useCurrentParentPermissions } from "@/hooks/useParentPermissions";
import { 
  PARENT_DASHBOARD_SECTIONS, 
  PARENT_UI_RULES,
  formatParentDate 
} from "@/lib/parent-visibility";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useEffect, useState } from "react";
import { DemoModeBanner } from "@/components/demo";

// Demo school ID for development
const DEMO_SCHOOL_ID = "5e508bfd-bd20-4461-8687-450a450111b8";

export default function ParentDashboard() {
  const { studentId } = useParams<{ studentId: string }>();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch the specific student
  const { data: student, isLoading: studentLoading, refetch } = useQuery({
    queryKey: ["parent-student", studentId],
    queryFn: async () => {
      if (!studentId) return null;
      const { data, error } = await supabase
        .from("students")
        .select("id, name, class_id")
        .eq("id", studentId)
        .single();
      if (error) throw error;
      setLastUpdated(new Date());
      return data;
    },
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });

  // Fetch recent attendance (simple summary only)
  const { data: recentAttendance } = useQuery({
    queryKey: ["parent-attendance", studentId],
    queryFn: async () => {
      if (!studentId) return null;
      const { data, error } = await supabase
        .from("attendance_records")
        .select("date, present")
        .eq("student_id", studentId)
        .order("date", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000,
  });

  const handleRefresh = async () => {
    await refetch();
    setLastUpdated(new Date());
  };

  if (studentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Offline banner */}
      {isOffline && (
        <div className="bg-muted px-4 py-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <WifiOff className="h-4 w-4" />
          <span>You're offline. Showing last available updates.</span>
        </div>
      )}

      <div className="container max-w-2xl py-6 px-4">
        {/* Header - minimal, text-first */}
        <header className="mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div>
                <h1 className="text-xl font-semibold">
                  {student?.name || "Your Child"}
                </h1>
                <p className="text-muted-foreground text-sm mt-0.5">
                  Updates from school
                </p>
              </div>
              {/* Subtle demo indicator for parent view */}
              <DemoModeBanner schoolId={DEMO_SCHOOL_ID} context="parent" />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isOffline}
              className="text-muted-foreground"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-2">
              Last updated: {formatParentDate(lastUpdated)}
            </p>
          )}
        </header>

        {/* Learning Updates Section - Primary */}
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-medium">Learning Updates</h2>
          </div>
          
          {studentId ? (
            <ParentInsightView
              studentId={studentId}
              studentName={student?.name || "Your child"}
            />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                No updates yet. Your child's teacher will share updates here.
              </CardContent>
            </Card>
          )}
        </section>

        <Separator className="my-6" />

        {/* Attendance Section - Simple text only */}
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-medium">Recent Attendance</h2>
          </div>
          
          {recentAttendance && recentAttendance.length > 0 ? (
            <div className="space-y-2">
              {recentAttendance.map((record, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span className="text-muted-foreground">
                    {formatParentDate(record.date)}
                  </span>
                  <span className={record.present ? "text-foreground" : "text-muted-foreground"}>
                    {record.present ? "Present" : "Absent"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4">
              Attendance information will appear here.
            </p>
          )}
        </section>

        <Separator className="my-6" />

        {/* School Announcements Section */}
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-medium">School News</h2>
          </div>
          
          <p className="text-sm text-muted-foreground py-4">
            No announcements at this time.
          </p>
        </section>

        <Separator className="my-6" />

        {/* Home Support Tips Section */}
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Home className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-medium">How to Help at Home</h2>
          </div>
          
          <p className="text-sm text-muted-foreground py-4">
            Tips for home support will appear here when available.
          </p>
        </section>

        {/* Footer with context */}
        <footer className="mt-8 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            All updates are reviewed and shared by your child's teacher
          </p>
        </footer>
      </div>
    </div>
  );
}
