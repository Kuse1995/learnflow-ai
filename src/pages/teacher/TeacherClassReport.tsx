import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, FileBarChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TeacherLayout } from "@/components/navigation";
import { EmptyState } from "@/components/empty-states";
import { ClassReportView, ClassReportSkeleton } from "@/components/reports/teacher-reports-index";
import { useClass } from "@/hooks/useClasses";
import { useClassReport } from "@/hooks/useTeacherReports";

/**
 * Teacher Class Report Page
 * 
 * PURPOSE: Provide a calm, aggregate view of class learning patterns.
 * 
 * CONSTRAINTS:
 * - READ-ONLY: No edit actions
 * - NO RANKINGS: No student comparisons
 * - NEUTRAL LANGUAGE: Professional, supportive tone
 */
export default function TeacherClassReport() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();

  const { data: classData, isLoading: isLoadingClass } = useClass(classId);
  const { data: report, isLoading: isLoadingReport } = useClassReport(classId);

  const handleBack = () => {
    navigate(`/teacher/classes/${classId}`);
  };

  if (isLoadingClass) {
    return (
      <TeacherLayout schoolName="Stitch Academy">
        <div className="p-4 space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </TeacherLayout>
    );
  }

  if (!classData) {
    return (
      <TeacherLayout schoolName="Stitch Academy">
        <div className="p-4">
          <Button variant="ghost" onClick={() => navigate("/teacher/classes")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Classes
          </Button>
          <EmptyState
            variant="no-data"
            title="Class not found"
            description="The class you're looking for doesn't exist or you don't have access to it."
          />
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout schoolName="Stitch Academy">
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
            Back to Class
          </Button>

          <div className="flex items-start gap-3">
            <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <FileBarChart className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Class Report</h1>
              <p className="text-sm text-muted-foreground">
                {classData.name}
                {classData.grade && classData.section && (
                  <> • Grade {classData.grade}, Section {classData.section}</>
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Aggregate insights • Read-only
              </p>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4">
          {isLoadingReport ? (
            <ClassReportSkeleton />
          ) : report ? (
            <ClassReportView report={report} className={classData.name} />
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
