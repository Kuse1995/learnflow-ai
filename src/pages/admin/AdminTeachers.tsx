/**
 * Admin Teachers Page
 * Manage teachers in the school - view, invite, remove
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { GraduationCap, UserPlus, MoreHorizontal, Mail, Trash2, AlertCircle, Clock, CheckCircle2, XCircle } from "lucide-react";
import { useSchoolAdminSchool, useSchoolTeachersWithClasses, useTeacherInvitations, useRemoveTeacher, useCancelInvitation } from "@/hooks/useSchoolAdmin";
import { InviteTeacherDialog } from "@/components/school-admin/InviteTeacherDialog";
import { AdminLayout } from "@/components/navigation/AdminNav";
import { format } from "date-fns";

export default function AdminTeachers() {
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [teacherToRemove, setTeacherToRemove] = useState<{ id: string; name: string } | null>(null);
  const [invitationToCancel, setInvitationToCancel] = useState<string | null>(null);

  const { data: school, isLoading: schoolLoading } = useSchoolAdminSchool();
  const { data: teachers, isLoading: teachersLoading } = useSchoolTeachersWithClasses(school?.id);
  const { data: invitations, isLoading: invitationsLoading } = useTeacherInvitations(school?.id);
  const removeTeacher = useRemoveTeacher();
  const cancelInvitation = useCancelInvitation();

  const isLoading = schoolLoading || teachersLoading || invitationsLoading;

  const pendingInvitations = invitations?.filter(i => i.status === 'pending') || [];

  const handleRemoveTeacher = async () => {
    if (!teacherToRemove || !school) return;
    await removeTeacher.mutateAsync({ userId: teacherToRemove.id, schoolId: school.id });
    setTeacherToRemove(null);
  };

  const handleCancelInvitation = async () => {
    if (!invitationToCancel) return;
    await cancelInvitation.mutateAsync(invitationToCancel);
    setInvitationToCancel(null);
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
              <GraduationCap className="h-6 w-6" />
              Teacher Management
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {teachers?.length || 0} teachers • Manage your school's teaching staff
            </p>
          </div>
          <Button onClick={() => setShowInviteDialog(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Invite Teacher
          </Button>
        </div>

        {/* Pending Invitations */}
        {pendingInvitations.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                Pending Invitations
              </CardTitle>
              <CardDescription>
                Teachers who haven't accepted their invitation yet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingInvitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                        <Mail className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-medium">{invitation.full_name || invitation.email}</p>
                        <p className="text-sm text-muted-foreground">{invitation.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-amber-600 border-amber-300">
                        Expires {format(new Date(invitation.expires_at), "MMM d")}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setInvitationToCancel(invitation.id)}
                      >
                        <XCircle className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Teachers Table */}
        <Card>
          <CardHeader>
            <CardTitle>Active Teachers</CardTitle>
            <CardDescription>
              Teachers currently assigned to your school
            </CardDescription>
          </CardHeader>
          <CardContent>
            {teachers && teachers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Classes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teachers.map((teacher) => (
                    <TableRow key={teacher.user_id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {teacher.full_name?.charAt(0) || "T"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{teacher.full_name || "Unknown"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {teacher.email || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {teacher.class_count} {teacher.class_count === 1 ? "class" : "classes"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
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
                              className="text-destructive focus:text-destructive"
                              onClick={() => setTeacherToRemove({ 
                                id: teacher.user_id, 
                                name: teacher.full_name || "this teacher" 
                              })}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove from School
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
                <GraduationCap className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No teachers assigned yet</p>
                <Button onClick={() => setShowInviteDialog(true)} variant="outline" className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Invite Your First Teacher
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Invite Teacher Dialog */}
      <InviteTeacherDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        schoolId={school.id}
        schoolName={school.name}
      />

      {/* Remove Teacher Confirmation */}
      <AlertDialog open={!!teacherToRemove} onOpenChange={() => setTeacherToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Teacher</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {teacherToRemove?.name} from your school? 
              They will lose access to all classes and data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveTeacher}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Teacher
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Invitation Confirmation */}
      <AlertDialog open={!!invitationToCancel} onOpenChange={() => setInvitationToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this invitation? The teacher won't be able to use the invitation link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Invitation</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelInvitation}>
              Cancel Invitation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
