import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TeacherLayout } from "@/components/navigation";
import { EmptyState } from "@/components/empty-states";
import { StudentReportView, StudentReportSkeleton } from "@/components/reports/teacher-reports-index";
import { useStudent } from "@/hooks/useStudents";
import { useStudentReport } from "@/hooks/useTeacherReports";
import { useTeacherSchool } from "@/hooks/useTeacherSchool";
/**
 * Teacher Student Report Page
 * 
 * PURPOSE: Provide a calm, narrative view of a student's learning journey.
 * 
 * CONSTRAINTS:
 * - TEACHER-ONLY: No parent or student access
 * - READ-ONLY: No edit actions
 * - NEUTRAL: No grades, rankings, or evaluative language
 * - SUPPORTIVE: This page is for understanding, not evaluation
 */
export default function TeacherStudentReport() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();

  const { data: student, isLoading: isLoadingStudent } = useStudent(studentId);
  const { data: report, isLoading: isLoadingReport } = useStudentReport(studentId);
  const { schoolName } = useTeacherSchool();

  const handleBack = () => {
    // Try to go back, or fallback to classes
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/teacher/classes");
    }
  };

  if (isLoadingStudent) {
    return (
      <TeacherLayout schoolName={schoolName}>
        <div className="p-4 space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </TeacherLayout>
    );
  }

  if (!student) {
    return (
      <TeacherLayout schoolName={schoolName}>
        <div className="p-4">
          <Button variant="ghost" onClick={handleBack} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <EmptyState
            variant="no-data"
            title="Student not found"
            description="The student you're looking for doesn't exist or you don't have access."
          />
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout schoolName={schoolName}>
      <div className="flex flex-col min-h-full pb-24 md:pb-8">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b px-4 pt-4 pb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="mb-3 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          <div className="flex items-start gap-3">
            <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <User className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{student.name}</h1>
              <p className="text-sm text-muted-foreground">
                Learning Report
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Insight summary • Read-only
              </p>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4">
          {isLoadingReport ? (
            <StudentReportSkeleton />
          ) : report ? (
            <StudentReportView report={report} />
          ) : (
            <EmptyState
              variant="no-data"
              title="Report unavailable"
              description="Unable to generate report data at this time."
            />
          )}
        </main>
      </div>
    </TeacherLayout>
  );
}
