import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, FileText } from "lucide-react";
import { TeacherLayout } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-states";
import { useDraftParentInsights } from "@/hooks/useParentInsights";
import { useStudentsByClass } from "@/hooks/useStudents";
import { ParentInsightReview, ParentInsightGenerator } from "@/components/parent-insights";

export default function TeacherParentInsights() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();

  const { data: students = [], isLoading: isLoadingStudents } = useStudentsByClass(classId);
  const { data: drafts = [], isLoading: isLoadingDrafts } = useDraftParentInsights(classId);

  const isLoading = isLoadingStudents || isLoadingDrafts;

  // Map student IDs to names
  const studentNameMap = new Map(students.map(s => [s.id, s.name]));

  return (
    <TeacherLayout>
      <div className="container max-w-4xl py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/teacher/classes/${classId}`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold">Parent Insights</h1>
            <p className="text-sm text-muted-foreground">
              Review and approve summaries before sharing with parents
            </p>
          </div>
          <ParentInsightGenerator
            classId={classId!}
            students={students.map(s => ({ id: s.id, name: s.name }))}
          />
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : drafts.length === 0 ? (
          <EmptyState
            variant="no-data"
            title="No draft insights"
            description="Generate parent insights for students in this class. You'll review and approve them before they're shared."
            hideAction
          />
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {drafts.length} draft{drafts.length !== 1 ? "s" : ""} pending review
            </p>
            {drafts.map((draft) => (
              <ParentInsightReview
                key={draft.id}
                insight={draft}
                studentName={studentNameMap.get(draft.student_id) || "Unknown Student"}
              />
            ))}
          </div>
        )}
      </div>
    </TeacherLayout>
  );
}
