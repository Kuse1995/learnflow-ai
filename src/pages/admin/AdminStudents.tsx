/**
 * Admin Students Page
 * School-wide student roster grouped by class
 * No individual learning profiles (per RBAC rules)
 */

import { Users, School, ArrowRightLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useSchoolAdminSchool, useSchoolClassesWithDetails } from "@/hooks/useSchoolAdmin";
import { AdminLayout } from "@/components/navigation/AdminNav";

export default function AdminStudents() {
  const { data: school, isLoading: schoolLoading } = useSchoolAdminSchool();
  const { data: classes, isLoading: classesLoading } = useSchoolClassesWithDetails(school?.id);

  const isLoading = schoolLoading || classesLoading;
  const activeClasses = classes?.filter(c => !c.deleted_at) || [];
  const totalStudents = activeClasses.reduce((sum, c) => sum + (c.student_count || 0), 0);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!school) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No School Found</AlertTitle>
          <AlertDescription>Unable to load school information.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <AdminLayout schoolName={school.name}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Student Roster
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalStudents} students across {activeClasses.length} classes
          </p>
        </div>

        {/* Info Banner */}
        <div className="bg-muted/50 rounded-lg px-4 py-3 text-sm text-muted-foreground">
          <p>
            📋 This view shows student counts by class. Individual student profiles and learning data 
            are managed by teachers within their classrooms.
          </p>
        </div>

        {/* Students by Class */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activeClasses.length > 0 ? (
            activeClasses.map((classItem) => (
              <Card key={classItem.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{classItem.name}</CardTitle>
                    {classItem.grade && (
                      <Badge variant="outline">{classItem.grade}</Badge>
                    )}
                  </div>
                  <CardDescription>
                    {classItem.teacher_name || "No teacher assigned"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <span className="text-2xl font-bold">{classItem.student_count}</span>
                      <span className="text-muted-foreground">students</span>
                    </div>
                  </div>
                  {classItem.subject && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Subject: {classItem.subject}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center">
                <School className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">No classes created yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Create classes to start enrolling students
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Transfer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ArrowRightLeft className="h-5 w-5" />
              Student Transfers
            </CardTitle>
            <CardDescription>
              Need to move a student between classes?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Student transfers are managed by teachers within their class views. 
              If a teacher needs to transfer a student to another class, they can 
              initiate the transfer from the student's profile page.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
