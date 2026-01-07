import { useState } from "react";
import { format } from "date-fns";
import { GraduationCap, ChevronRight, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useLessonSuggestions } from "@/hooks/useLessonDifferentiation";
import { LessonDifferentiationForm } from "./LessonDifferentiationForm";
import { DifferentiatedLessonViewer } from "./DifferentiatedLessonViewer";

interface LessonDifferentiationPanelProps {
  classId: string;
  className: string;
}

export function LessonDifferentiationPanel({
  classId,
  className,
}: LessonDifferentiationPanelProps) {
  const { data: lessons = [], isLoading, refetch } = useLessonSuggestions(classId);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Lesson Differentiation</h2>
        </div>
        <LessonDifferentiationForm
          classId={classId}
          className={className}
          trigger={
            <Button variant="outline" size="sm" className="gap-2">
              <Sparkles className="h-4 w-4" />
              New Lesson
            </Button>
          }
          onSuccess={() => refetch()}
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : lessons.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <div className="h-12 w-12 rounded-full bg-muted mx-auto flex items-center justify-center mb-3">
              <GraduationCap className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              No differentiated lessons generated yet.
            </p>
            <LessonDifferentiationForm
              classId={classId}
              className={className}
              trigger={
                <Button variant="outline" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Generate Your First Lesson
                </Button>
              }
              onSuccess={() => refetch()}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {lessons.slice(0, 5).map((lesson) => (
            <Card
              key={lesson.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setSelectedLessonId(lesson.id)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm truncate">{lesson.lesson_topic}</p>
                    {lesson.teacher_accepted && (
                      <Badge variant="outline" className="text-xs text-primary border-primary shrink-0">
                        <Check className="h-3 w-3 mr-1" />
                        Reviewed
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {lesson.lesson_objective}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(lesson.created_at), "MMM d, yyyy")}
                    {lesson.lesson_duration_minutes && ` • ${lesson.lesson_duration_minutes} min`}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Lesson Viewer Sheet */}
      <Sheet open={!!selectedLessonId} onOpenChange={(open) => !open && setSelectedLessonId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Differentiated Lesson</SheetTitle>
          </SheetHeader>
          {selectedLessonId && (
            <div className="mt-6">
              <DifferentiatedLessonViewer
                lessonId={selectedLessonId}
                classId={classId}
                onClose={() => setSelectedLessonId(null)}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}
