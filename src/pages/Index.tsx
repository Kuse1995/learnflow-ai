import { useState } from "react";
import { AttendanceSheet, type Student } from "@/components/attendance";
import { EmptyState } from "@/components/empty-states";
import { 
  AdminLayout, 
  TeacherLayout, 
  StudentLayout, 
  ParentLayout 
} from "@/components/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

// Demo data
const demoStudents: Student[] = [
  { id: "1", name: "Liam Wilson", studentId: "482910" },
  { id: "2", name: "Emma Davis", studentId: "482911" },
  { id: "3", name: "Noah Brown", studentId: "482912" },
  { id: "4", name: "Olivia Jones", studentId: "482913" },
  { id: "5", name: "William Taylor", studentId: "482914" },
];

type RoleDemo = "admin" | "teacher" | "student" | "parent";

const Index = () => {
  const [activeRole, setActiveRole] = useState<RoleDemo>("teacher");
  const [activeTab, setActiveTab] = useState("nav-demo");

  const handleSaveAttendance = (attendance: { studentId: string; present: boolean }[]) => {
    console.log("Saving attendance:", attendance);
  };

  const renderContent = () => (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
      <div className="px-4 pt-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="nav-demo">Navigation</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="empty-states">Empty States</TabsTrigger>
        </TabsList>
      </div>

      {/* Navigation Demo */}
      <TabsContent value="nav-demo" className="mt-4 px-4">
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Navigation System Demo</h2>
          <p className="text-muted-foreground text-sm">
            Switch between roles to see how navigation changes:
          </p>
          <div className="flex flex-wrap gap-2">
            {(["admin", "teacher", "student", "parent"] as RoleDemo[]).map((role) => (
              <Button
                key={role}
                variant={activeRole === role ? "default" : "outline"}
                onClick={() => setActiveRole(role)}
                className="capitalize"
              >
                {role}
              </Button>
            ))}
          </div>
          <div className="bg-card rounded-xl border p-4 mt-4">
            <h3 className="font-semibold mb-2 capitalize">{activeRole} Navigation Rules:</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              {activeRole === "admin" && (
                <>
                  <li>• <strong>Web:</strong> Left sidebar navigation</li>
                  <li>• <strong>Mobile:</strong> Bottom nav (alerts only)</li>
                </>
              )}
              {activeRole === "teacher" && (
                <>
                  <li>• <strong>Web:</strong> Left sidebar navigation</li>
                  <li>• <strong>Mobile:</strong> Bottom nav (Attendance, Classes, Uploads, Insights)</li>
                </>
              )}
              {activeRole === "student" && (
                <>
                  <li>• <strong>Web & Mobile:</strong> Bottom nav only</li>
                  <li>• Items: Learn, Homework, Tutor, Progress</li>
                </>
              )}
              {activeRole === "parent" && (
                <>
                  <li>• <strong>Web & Mobile:</strong> Bottom nav only</li>
                  <li>• Items: Overview, Attendance, Messages</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </TabsContent>

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
      <TabsContent value="empty-states" className="mt-4 px-4 space-y-6 pb-24">
        <div className="bg-card rounded-2xl border">
          <EmptyState
            variant="no-data"
            onAction={() => console.log("Get started clicked")}
          />
        </div>
        <div className="bg-card rounded-2xl border">
          <EmptyState
            variant="upload-first"
            onAction={() => console.log("Upload clicked")}
          />
        </div>
        <div className="bg-card rounded-2xl border">
          <EmptyState
            variant="no-lessons"
            onAction={() => console.log("Plan lesson clicked")}
          />
        </div>
      </TabsContent>
    </Tabs>
  );

  // Render with appropriate layout based on selected role
  switch (activeRole) {
    case "admin":
      return <AdminLayout schoolName="Demo School">{renderContent()}</AdminLayout>;
    case "teacher":
      return <TeacherLayout schoolName="Demo School">{renderContent()}</TeacherLayout>;
    case "student":
      return <StudentLayout>{renderContent()}</StudentLayout>;
    case "parent":
      return <ParentLayout>{renderContent()}</ParentLayout>;
    default:
      return <TeacherLayout>{renderContent()}</TeacherLayout>;
  }
};

export default Index;
