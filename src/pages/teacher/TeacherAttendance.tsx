import { useState } from "react";
import { TeacherLayout } from "@/components/navigation";
import { ConnectedAttendanceSheet } from "@/components/attendance";
import { useClasses } from "@/hooks/useClasses";
import { EmptyState } from "@/components/empty-states";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function TeacherAttendance() {
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);

  const { data: classes = [], isLoading: classesLoading } = useClasses();

  const formattedDate = selectedDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  if (classesLoading) {
    return (
      <TeacherLayout schoolName="Omanut Academy">
        <div className="p-4 space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </TeacherLayout>
    );
  }

  if (classes.length === 0) {
    return (
      <TeacherLayout schoolName="Omanut Academy">
        <div className="flex items-center justify-center h-full p-4">
          <EmptyState 
            variant="no-data"
            title="No classes found"
            description="Classes will appear here once they're set up by an administrator."
          />
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout schoolName="Omanut Academy">
      <div className="flex flex-col h-full">
        {/* Class & Date Selector */}
        {!selectedClassId ? (
          <div className="flex flex-col h-full">
            <header className="px-4 pt-6 pb-4 border-b">
              <h1 className="text-xl font-bold">Take Attendance</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Select a class and date to begin
              </p>
            </header>

            <div className="flex-1 p-4 space-y-4">
              {/* Date Selector */}
              <div>
                <label className="text-sm font-medium mb-2 block">Date</label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal h-12 rounded-xl"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                      {formattedDate}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        if (date) setSelectedDate(date);
                        setCalendarOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Class Selector */}
              <div>
                <label className="text-sm font-medium mb-2 block">Select Class</label>
                <div className="space-y-2">
                  {classes.map((cls) => (
                    <Button
                      key={cls.id}
                      variant="outline"
                      className="w-full justify-start h-14 rounded-xl text-left"
                      onClick={() => setSelectedClassId(cls.id)}
                    >
                      <div>
                        <p className="font-semibold">{cls.name}</p>
                        {cls.grade && cls.section && (
                          <p className="text-xs text-muted-foreground">
                            Grade {cls.grade} - Section {cls.section}
                          </p>
                        )}
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Attendance Sheet
          <div className="flex flex-col h-full">
            <div className="px-4 pt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedClassId(undefined)}
                className="mb-2 -ml-2"
              >
                ← Back to classes
              </Button>
            </div>
            <ConnectedAttendanceSheet
              classId={selectedClassId}
              date={selectedDate}
              onDateChange={(date) => {
                setSelectedDate(date);
                setCalendarOpen(true);
              }}
              onSaveSuccess={() => {
                // Could navigate back or show success state
              }}
            />
          </div>
        )}
      </div>
    </TeacherLayout>
  );
}
