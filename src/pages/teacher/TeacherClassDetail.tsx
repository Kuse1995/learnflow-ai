import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, BookOpen, Users, Calendar, FileText, ChevronRight, Brain, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { TeacherLayout } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EmptyState } from "@/components/empty-states";
import { AttendanceSheet } from "@/components/attendance/AttendanceSheet";
import { UploadsList } from "@/components/uploads/UploadsList";
import { LearningProfileViewer } from "@/components/students/LearningProfileViewer";
import { TeachingSuggestionsViewer } from "@/components/teaching/TeachingSuggestionsViewer";
import { useClass } from "@/hooks/useClasses";
import { useStudentsByClass } from "@/hooks/useStudents";
import { useClassAttendanceHistory, type AttendanceSummary } from "@/hooks/useClassAttendanceHistory";
import { useUploadsByClass } from "@/hooks/useUploadsByClass";
import { useAttendanceByClassAndDate, useSaveAttendance } from "@/hooks/useAttendance";

export default function TeacherClassDetail() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewingProfileStudent, setViewingProfileStudent] = useState<{ id: string; name: string } | null>(null);

  const { data: classData, isLoading: isLoadingClass } = useClass(classId);
  const { data: students = [], isLoading: isLoadingStudents } = useStudentsByClass(classId);
  const { data: attendanceHistory = [], isLoading: isLoadingHistory } = useClassAttendanceHistory(classId);
  const { data: uploads = [], isLoading: isLoadingUploads } = useUploadsByClass(classId);
  const { data: dateAttendance = [] } = useAttendanceByClassAndDate(classId, selectedDate || undefined);
  const { mutateAsync: saveAttendance } = useSaveAttendance();

  const handleSaveAttendance = async (entries: { studentId: string; present: boolean }[]) => {
    if (!classId || !selectedDate) return;
    try {
      await saveAttendance({ classId, date: selectedDate, attendance: entries });
      toast.success("Attendance saved successfully");
      setSelectedDate(null);
    } catch (error) {
      console.error("Save attendance error:", error);
      toast.error("Failed to save attendance");
    }
  };

  if (isLoadingClass) {
    return (
      <TeacherLayout schoolName="Stitch Academy">
        <div className="p-4 space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
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
          <Button variant="ghost" size="sm" onClick={() => navigate("/teacher/classes")} className="mb-3 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Classes
          </Button>
          
          <div className="flex items-start gap-3">
            <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <BookOpen className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{classData.name}</h1>
              {classData.grade && classData.section && (
                <p className="text-sm text-muted-foreground">
                  Grade {classData.grade} • Section {classData.section}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {students.length} students enrolled
              </p>
            </div>
          </div>

          {/* Teaching Suggestions Button */}
          <div className="mt-4">
            <TeachingSuggestionsViewer
              classId={classData.id}
              className={classData.name}
              trigger={
                <Button variant="outline" size="sm" className="gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Get Teaching Suggestions
                </Button>
              }
            />
          </div>
        </header>

        <div className="flex-1 p-4 space-y-6">
          {/* Students Section */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Students</h2>
            </div>
            {isLoadingStudents ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : students.length === 0 ? (
              <Card>
                <CardContent className="py-6 text-center text-muted-foreground text-sm">
                  No students enrolled in this class yet.
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0 divide-y">
                  {students.map((student) => (
                    <div 
                      key={student.id} 
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setViewingProfileStudent({ id: student.id, name: student.name })}
                    >
                      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <span className="text-sm font-medium">
                          {student.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{student.name}</p>
                        <p className="text-xs text-muted-foreground">{student.student_id}</p>
                      </div>
                      <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground">
                        <Brain className="h-3 w-3" />
                        Profile
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </section>

          <Separator />

          {/* Attendance History Section */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Attendance History</h2>
            </div>
            {isLoadingHistory ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : attendanceHistory.length === 0 ? (
              <Card>
                <CardContent className="py-6 text-center text-muted-foreground text-sm">
                  No attendance records yet.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {attendanceHistory.map((record) => (
                  <AttendanceHistoryCard
                    key={record.date}
                    record={record}
                    onClick={() => setSelectedDate(record.date)}
                  />
                ))}
              </div>
            )}
          </section>

          <Separator />

          {/* Uploads Section */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Class Uploads</h2>
            </div>
            {isLoadingUploads ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-lg" />
                ))}
              </div>
            ) : uploads.length === 0 ? (
              <Card>
                <CardContent className="py-6 text-center text-muted-foreground text-sm">
                  No uploads for this class yet.
                </CardContent>
              </Card>
            ) : (
              <UploadsList uploads={uploads} classes={[{ id: classData.id, name: classData.name }]} />
            )}
          </section>
        </div>

        {/* Attendance Sheet Modal */}
        <Sheet open={!!selectedDate} onOpenChange={(open) => !open && setSelectedDate(null)}>
          <SheetContent side="bottom" className="h-[90vh] p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Attendance for {selectedDate}</SheetTitle>
            </SheetHeader>
            {selectedDate && classData && (
              <AttendanceSheet
                classId={classData.id}
                className={classData.name}
                date={new Date(selectedDate)}
                students={students.map((s) => ({
                  id: s.id,
                  name: s.name,
                  studentId: s.student_id,
                }))}
                initialAttendance={dateAttendance.map((r) => ({
                  studentId: r.student_id,
                  present: r.present,
                }))}
                onSave={handleSaveAttendance}
              />
            )}
          </SheetContent>
        </Sheet>

        {/* Learning Profile Viewer */}
        <LearningProfileViewer
          studentId={viewingProfileStudent?.id || null}
          studentName={viewingProfileStudent?.name}
          open={!!viewingProfileStudent}
          onOpenChange={(open) => !open && setViewingProfileStudent(null)}
        />
      </div>
    </TeacherLayout>
  );
}

interface AttendanceHistoryCardProps {
  record: AttendanceSummary;
  onClick: () => void;
}

function AttendanceHistoryCard({ record, onClick }: AttendanceHistoryCardProps) {
  const formattedDate = format(new Date(record.date), "EEEE, MMM d, yyyy");
  const percentage = record.total > 0 ? Math.round((record.present / record.total) * 100) : 0;

  return (
    <Card 
      className="cursor-pointer hover:border-primary/50 transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-4 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{formattedDate}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span>{record.total} students</span>
            <span className="text-primary font-medium">{record.present} present</span>
            <span className="text-destructive font-medium">{record.absent} absent</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-primary">{percentage}%</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}
