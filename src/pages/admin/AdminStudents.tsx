/**
 * Admin Students Page
 * School-wide student management with add/edit/transfer capabilities
 */

import { useState } from "react";
import { Users, School, Plus, Search, Phone, Upload, MoreHorizontal, Pencil, ArrowRightLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertCircle } from "lucide-react";
import { useSchoolAdminSchool, useSchoolClassesWithDetails, useIsSchoolAdmin } from "@/hooks/useSchoolAdmin";
import { useSchoolStudents } from "@/hooks/useSchoolStudents";
import { AdminLayout } from "@/components/navigation/AdminNav";
import { usePlatformOwner } from "@/hooks/usePlatformOwner";
import { AddStudentDialog } from "@/components/school-admin/AddStudentDialog";
import { EditStudentDialog } from "@/components/school-admin/EditStudentDialog";
import { TransferStudentDialog } from "@/components/school-admin/TransferStudentDialog";
import { BulkStudentUploadDialog } from "@/components/school-admin/BulkStudentUploadDialog";
import { useClassLevelTerminology } from "@/hooks/useClassLevelTerminology";
import type { SchoolStudent } from "@/hooks/useSchoolStudents";

export default function AdminStudents() {
  const { data: school, isLoading: schoolLoading } = useSchoolAdminSchool();
  const { data: classes, isLoading: classesLoading } = useSchoolClassesWithDetails(school?.id);
  const { data: students, isLoading: studentsLoading } = useSchoolStudents(school?.id);
  const { data: isAdmin, isLoading: isAdminLoading } = useIsSchoolAdmin();
  const { isPlatformOwner } = usePlatformOwner();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<SchoolStudent | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { config: terminologyConfig } = useClassLevelTerminology(school?.id);

  const isLoading = schoolLoading || classesLoading || isAdminLoading || studentsLoading;
  const activeClasses = classes?.filter(c => !c.deleted_at) || [];

  // Filter students by search query
  const filteredStudents = students?.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.student_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.guardian_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.class_name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!isAdmin && !isPlatformOwner) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>You don't have school administrator access.</AlertDescription>
        </Alert>
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
              <Users className="h-6 w-6" />
              Student Roster
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {students?.length || 0} students enrolled
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowBulkDialog(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Bulk Upload
            </Button>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Student
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, ID, class, or guardian..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Students Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Students</CardTitle>
            <CardDescription>
              Manage student enrollment and guardian information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredStudents.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>{terminologyConfig.singular}</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Guardian</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="w-[70px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {student.student_id}
                        </code>
                      </TableCell>
                      <TableCell>
                        {student.grade ? (
                          <Badge variant="outline">{student.grade}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {student.class_name ? (
                          <Badge variant="secondary">{student.class_name}</Badge>
                        ) : (
                          <span className="text-yellow-600 text-sm">Not assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {student.guardian_name || (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {student.guardian_phone ? (
                          <span className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {student.guardian_phone}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedStudent(student);
                                setShowEditDialog(true);
                              }}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit Student
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedStudent(student);
                                setShowTransferDialog(true);
                              }}
                            >
                              <ArrowRightLeft className="h-4 w-4 mr-2" />
                              Transfer Class
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-12 text-center">
                <School className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                {searchQuery ? (
                  <>
                    <p className="text-muted-foreground">No students match your search</p>
                    <Button 
                      variant="link" 
                      onClick={() => setSearchQuery("")}
                      className="mt-2"
                    >
                      Clear search
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground">No students enrolled yet</p>
                    <Button 
                      onClick={() => setShowAddDialog(true)}
                      className="mt-4"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Student
                    </Button>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Student Dialog */}
        <AddStudentDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          schoolId={school.id}
          classes={activeClasses.map(c => ({
            id: c.id,
            name: c.name,
            grade: c.grade,
          }))}
        />

        {/* Bulk Upload Dialog */}
        <BulkStudentUploadDialog
          open={showBulkDialog}
          onOpenChange={setShowBulkDialog}
          schoolId={school.id}
          classes={activeClasses.map(c => ({
            id: c.id,
            name: c.name,
            grade: c.grade,
          }))}
        />

        {/* Edit Student Dialog */}
        <EditStudentDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          student={selectedStudent}
          schoolId={school.id}
          classes={activeClasses.map(c => ({
            id: c.id,
            name: c.name,
            grade: c.grade,
          }))}
        />

        {/* Transfer Student Dialog */}
        <TransferStudentDialog
          open={showTransferDialog}
          onOpenChange={setShowTransferDialog}
          student={selectedStudent}
          schoolId={school.id}
          classes={activeClasses.map(c => ({
            id: c.id,
            name: c.name,
            grade: c.grade,
          }))}
        />
      </div>
    </AdminLayout>
  );
}
