import { useState } from "react";
import { AttendanceSheet, type Student } from "@/components/attendance";
import { EmptyState } from "@/components/empty-states";
import { TeacherNav } from "@/components/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Demo data
const demoStudents: Student[] = [
  { id: "1", name: "Liam Wilson", studentId: "482910" },
  { id: "2", name: "Emma Davis", studentId: "482911" },
  { id: "3", name: "Noah Brown", studentId: "482912" },
  { id: "4", name: "Olivia Jones", studentId: "482913" },
  { id: "5", name: "William Taylor", studentId: "482914" },
];

const Index = () => {
  const [activeTab, setActiveTab] = useState("attendance");

  const handleSaveAttendance = (attendance: { studentId: string; present: boolean }[]) => {
    console.log("Saving attendance:", attendance);
    // TODO: Integrate with backend
  };

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto relative">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
        <TabsList className="grid w-full grid-cols-3 mx-4 mt-4 max-w-[calc(100%-2rem)]">
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="empty-states">Empty States</TabsTrigger>
          <TabsTrigger value="design">Design</TabsTrigger>
        </TabsList>

        {/* Attendance Demo */}
        <TabsContent value="attendance" className="mt-0 h-full">
          <AttendanceSheet
            classId="class-5a"
            className="Grade 5 - Science (Per 2)"
            date={new Date()}
            students={demoStudents}
            initialAttendance={[
              { studentId: "1", present: true },
              { studentId: "2", present: false },
              { studentId: "3", present: true },
              { studentId: "4", present: true },
              { studentId: "5", present: true },
            ]}
            onSave={handleSaveAttendance}
          />
        </TabsContent>

        {/* Empty States Demo */}
        <TabsContent value="empty-states" className="mt-4 px-4 space-y-8 pb-24">
          <div>
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">
              No Data Yet
            </h3>
            <div className="bg-card rounded-2xl border">
              <EmptyState
                variant="no-data"
                onAction={() => console.log("Get started clicked")}
              />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">
              Upload First Script
            </h3>
            <div className="bg-card rounded-2xl border">
              <EmptyState
                variant="upload-first"
                onAction={() => console.log("Upload clicked")}
              />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">
              No Lessons Today
            </h3>
            <div className="bg-card rounded-2xl border">
              <EmptyState
                variant="no-lessons"
                onAction={() => console.log("Plan lesson clicked")}
              />
            </div>
          </div>
        </TabsContent>

        {/* Design System Demo */}
        <TabsContent value="design" className="mt-4 px-4 space-y-6 pb-24">
          <div>
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">
              Color Palette
            </h3>
            <div className="grid grid-cols-4 gap-2">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-lg bg-primary" />
                <span className="text-xs mt-1">Primary</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-lg bg-accent" />
                <span className="text-xs mt-1">Accent</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-lg bg-destructive" />
                <span className="text-xs mt-1">Destructive</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-lg bg-muted" />
                <span className="text-xs mt-1">Muted</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">
              Typography (Lexend)
            </h3>
            <div className="space-y-2 bg-card p-4 rounded-xl border">
              <p className="text-2xl font-bold">Heading Bold</p>
              <p className="text-lg font-semibold">Subheading Semibold</p>
              <p className="text-base">Body text regular</p>
              <p className="text-sm text-muted-foreground">Muted caption text</p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">
              Status Colors
            </h3>
            <div className="flex gap-3">
              <div className="flex-1 bg-primary/10 border border-primary/20 rounded-xl p-4 text-center">
                <span className="text-2xl font-bold text-primary">24</span>
                <p className="text-xs text-muted-foreground mt-1">Present</p>
              </div>
              <div className="flex-1 bg-absent-bg border border-absent/20 rounded-xl p-4 text-center">
                <span className="text-2xl font-bold text-absent">2</span>
                <p className="text-xs text-muted-foreground mt-1">Absent</p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Teacher Nav Demo */}
      <TeacherNav />
    </div>
  );
};

export default Index;
