import { useState } from "react";
import { TeacherLayout } from "@/components/navigation";
import { ConnectedAttendanceSheet } from "@/components/attendance";
import { useScopedClasses } from "@/hooks/useDataScope";
import { EmptyState } from "@/components/empty-states";
import { useClassLevelTerminology } from "@/hooks/useClassLevelTerminology";
import { useTeacherSchool } from "@/hooks/useTeacherSchool";
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

  const { data: classes = [], isLoading: classesLoading } = useScopedClasses();
  const { schoolName } = useTeacherSchool();
  
  // Get school ID from first class to determine terminology
  const schoolId = classes[0]?.school_id;
  const { config: terminology } = useClassLevelTerminology(schoolId);

  const formattedDate = selectedDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  if (classesLoading) {
    return (
      <TeacherLayout schoolName={schoolName}>
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
      <TeacherLayout schoolName={schoolName}>
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
    <TeacherLayout schoolName={schoolName}>
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
              {/* Date Picker */}
              <div>
                <label className="text-sm font-medium mb-2 block">Date</label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formattedDate}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        if (date) {
                          setSelectedDate(date);
                          setCalendarOpen(false);
                        }
                      }}
                      disabled={(date) => date > new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Class Selector */}
              <div>
                <label className="text-sm font-medium mb-2 block">Select Class</label>
                <Select onValueChange={setSelectedClassId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a class..." />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name} {cls.grade && `(${terminology.singular} ${cls.grade}${cls.section ? ` - ${cls.section}` : ''})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="px-4 pt-4">
              <Button variant="ghost" size="sm" onClick={() => setSelectedClassId(undefined)} className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                Change Class/Date
              </Button>
            </div>
            <ConnectedAttendanceSheet
              classId={selectedClassId}
              date={selectedDate}
              onDateChange={(date) => setSelectedDate(date)}
            />
          </div>
        )}
      </div>
    </TeacherLayout>
  );
}
