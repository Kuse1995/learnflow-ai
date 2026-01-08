/**
 * Admin Classes Page
 * Manage classes in the school - view, create, assign teachers, archive
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { School, Plus, MoreHorizontal, UserPlus, Archive, AlertCircle, Users, GraduationCap } from "lucide-react";
import { useSchoolAdminSchool, useSchoolClassesWithDetails, useArchiveClass } from "@/hooks/useSchoolAdmin";
import { CreateSchoolClassDialog } from "@/components/school-admin/CreateSchoolClassDialog";
import { AssignTeacherToClassDialog } from "@/components/school-admin/AssignTeacherToClassDialog";
import { AdminLayout } from "@/components/navigation/AdminNav";

export default function AdminClasses() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [classToArchive, setClassToArchive] = useState<{ id: string; name: string } | null>(null);
  const [classToAssignTeacher, setClassToAssignTeacher] = useState<{ id: string; name: string; currentTeacherId?: string } | null>(null);

  const { data: school, isLoading: schoolLoading } = useSchoolAdminSchool();
  const { data: classes, isLoading: classesLoading } = useSchoolClassesWithDetails(school?.id);
  const archiveClass = useArchiveClass();

  const isLoading = schoolLoading || classesLoading;

  const activeClasses = classes?.filter(c => !c.deleted_at) || [];

  const handleArchiveClass = async () => {
    if (!classToArchive) return;
    await archiveClass.mutateAsync(classToArchive.id);
    setClassToArchive(null);
  };

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <School className="h-6 w-6" />
              Class Management
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {activeClasses.length} classes • Create and manage your school's classes
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Class
          </Button>
        </div>

        {/* Classes Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Classes</CardTitle>
            <CardDescription>
              Classes currently active in your school
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeClasses.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class Name</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeClasses.map((classItem) => (
                    <TableRow key={classItem.id}>
                      <TableCell className="font-medium">
                        {classItem.name}
                        {classItem.section && (
                          <span className="text-muted-foreground ml-1">({classItem.section})</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {classItem.grade ? (
                          <Badge variant="outline">{classItem.grade}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {classItem.subject || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {classItem.teacher_name ? (
                          <div className="flex items-center gap-2">
                            <GraduationCap className="h-4 w-4 text-muted-foreground" />
                            <span>{classItem.teacher_name}</span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-300">
                            No teacher
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{classItem.student_count}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setClassToAssignTeacher({
                                id: classItem.id,
                                name: classItem.name,
                                currentTeacherId: classItem.teacher_id || undefined,
                              })}
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              {classItem.teacher_id ? "Change Teacher" : "Assign Teacher"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setClassToArchive({ id: classItem.id, name: classItem.name })}
                            >
                              <Archive className="h-4 w-4 mr-2" />
                              Archive Class
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <School className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No classes created yet</p>
                <Button onClick={() => setShowCreateDialog(true)} variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Your First Class
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Class Dialog */}
      <CreateSchoolClassDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        schoolId={school.id}
      />

      {/* Assign Teacher Dialog */}
      {classToAssignTeacher && (
        <AssignTeacherToClassDialog
          open={!!classToAssignTeacher}
          onOpenChange={() => setClassToAssignTeacher(null)}
          classId={classToAssignTeacher.id}
          className={classToAssignTeacher.name}
          currentTeacherId={classToAssignTeacher.currentTeacherId}
          schoolId={school.id}
        />
      )}

      {/* Archive Class Confirmation */}
      <AlertDialog open={!!classToArchive} onOpenChange={() => setClassToArchive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Class</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive "{classToArchive?.name}"? 
              The class will be hidden but data will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchiveClass}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Archive Class
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
