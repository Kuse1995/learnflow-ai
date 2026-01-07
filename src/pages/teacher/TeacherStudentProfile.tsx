import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TeacherNav } from "@/components/navigation";
import { StudentLearningTimeline } from "@/components/student-timeline";
import { AdaptiveSupportPlanViewer } from "@/components/adaptive-support";
import { useStudent } from "@/hooks/useStudents";
import { useStudentAdaptiveSupportPlan } from "@/hooks/useAdaptiveSupportPlans";

/**
 * Teacher Student Profile Page
 * 
 * PURPOSE: Provide a calm, narrative-centered view of a student's learning journey.
 * 
 * CONSTRAINTS:
 * - TEACHER-ONLY: No parent or student access
 * - READ-ONLY: No edit actions on this page
 * - NEUTRAL: No grades, rankings, or evaluative language
 * - SUPPORTIVE: This page is for understanding, not evaluation
 */
export default function TeacherStudentProfile() {
  const { classId, studentId } = useParams<{ classId: string; studentId: string }>();
  const navigate = useNavigate();

  const { data: student, isLoading: isLoadingStudent } = useStudent(studentId);
  const { data: supportPlan, isLoading: isLoadingPlan } = useStudentAdaptiveSupportPlan(
    studentId,
    classId
  );

  const handleBack = () => {
    navigate(`/teacher/classes/${classId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <TeacherNav />
      
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header Section */}
        <header className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Class
          </Button>

          {isLoadingStudent ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          ) : student ? (
            <>
              <h1 className="text-2xl font-semibold text-foreground">
                {student.name}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Learning overview for instructional support
              </p>
            </>
          ) : (
            <div className="text-muted-foreground">
              Student not found
            </div>
          )}
        </header>

        {/* Content Sections */}
        {student && studentId && classId && (
          <div className="space-y-8">
            {/* Adaptive Support Plan Section */}
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
                Adaptive Support
              </h2>
              
              {isLoadingPlan ? (
                <SupportPlanSkeleton />
              ) : supportPlan ? (
                <AdaptiveSupportPlanViewer
                  plan={supportPlan}
                  studentName={student.name}
                  showAcknowledge={true}
                />
              ) : (
                <SupportPlanEmpty />
              )}
            </section>

            <Separator />

            {/* Learning Timeline Section */}
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
                Learning Journey
              </h2>
              
              <StudentLearningTimeline
                studentId={studentId}
                classId={classId}
                studentName={student.name}
              />
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

/**
 * Empty state for missing support plan
 */
function SupportPlanEmpty() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">Adaptive Support Plan</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="py-6 text-center">
          <p className="text-sm text-muted-foreground">
            No adaptive support plan has been generated yet.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Plans are created based on accumulated learning evidence.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Loading skeleton for support plan section
 */
function SupportPlanSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </CardContent>
    </Card>
  );
}
