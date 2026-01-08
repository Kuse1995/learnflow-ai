/**
 * Admin Parents Page
 * School-wide guardian/parent management with linking to students
 */

import { useState } from "react";
import { Users2, Plus, Search, Phone, Mail, Link2, UserCheck, Trash2 } from "lucide-react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertCircle } from "lucide-react";
import { useSchoolAdminSchool, useIsSchoolAdmin } from "@/hooks/useSchoolAdmin";
import { useSchoolGuardians } from "@/hooks/useSchoolGuardians";
import { useSchoolStudents } from "@/hooks/useSchoolStudents";
import { AdminLayout } from "@/components/navigation/AdminNav";
import { usePlatformOwner } from "@/hooks/usePlatformOwner";
import { AddGuardianDialog } from "@/components/school-admin/AddGuardianDialog";
import { LinkGuardianDialog } from "@/components/school-admin/LinkGuardianDialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AdminParents() {
  const { data: school, isLoading: schoolLoading } = useSchoolAdminSchool();
  const { data: guardians, isLoading: guardiansLoading } = useSchoolGuardians(school?.id);
  const { data: students, isLoading: studentsLoading } = useSchoolStudents(school?.id);
  const { data: isAdmin, isLoading: isAdminLoading } = useIsSchoolAdmin();
  const { isPlatformOwner } = usePlatformOwner();

  const queryClient = useQueryClient();
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedGuardian, setSelectedGuardian] = useState<{
    id: string;
    display_name: string;
    linked_students: Array<{ student_id: string }>;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const deleteGuardianMutation = useMutation({
    mutationFn: async (guardianId: string) => {
      // First delete all links
      const { error: linksError } = await supabase
        .from("guardian_student_links")
        .delete()
        .eq("guardian_id", guardianId);
      
      if (linksError) throw linksError;

      // Then delete the guardian
      const { error } = await supabase
        .from("guardians")
        .delete()
        .eq("id", guardianId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Guardian deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["school-guardians"] });
      setShowDeleteDialog(false);
      setSelectedGuardian(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete guardian");
    },
  });

  const handleDeleteClick = (guardian: (typeof filteredGuardians)[0]) => {
    setSelectedGuardian({
      id: guardian.id,
      display_name: guardian.display_name,
      linked_students: guardian.linked_students,
    });
    setShowDeleteDialog(true);
  };

  const isLoading = schoolLoading || guardiansLoading || isAdminLoading || studentsLoading;

  // Filter guardians by search query
  const filteredGuardians =
    guardians?.filter(
      (g) =>
        g.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.primary_phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.linked_students.some((s) =>
          s.student_name.toLowerCase().includes(searchQuery.toLowerCase())
        )
    ) || [];

  const handleLinkClick = (guardian: (typeof filteredGuardians)[0]) => {
    setSelectedGuardian({
      id: guardian.id,
      display_name: guardian.display_name,
      linked_students: guardian.linked_students,
    });
    setShowLinkDialog(true);
  };

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

  const studentsList = students?.map((s) => ({ id: s.id, name: s.name })) || [];

  return (
    <AdminLayout schoolName={school.name}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users2 className="h-6 w-6" />
              Parents & Guardians
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {guardians?.length || 0} guardians registered
            </p>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Guardian
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, email, or student..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Guardians Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Guardians</CardTitle>
            <CardDescription>
              Manage parent and guardian records and their linked students
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredGuardians.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Linked Students</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGuardians.map((guardian) => (
                    <TableRow key={guardian.id}>
                      <TableCell className="font-medium">{guardian.display_name}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {guardian.primary_phone && (
                            <span className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              {guardian.primary_phone}
                            </span>
                          )}
                          {guardian.email && (
                            <span className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              {guardian.email}
                            </span>
                          )}
                          {!guardian.primary_phone && !guardian.email && (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {guardian.linked_students.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {guardian.linked_students.map((link) => (
                              <Badge key={link.student_id} variant="secondary" className="text-xs">
                                {link.student_name}
                                {link.relationship_label && (
                                  <span className="text-muted-foreground ml-1">
                                    ({link.relationship_label})
                                  </span>
                                )}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">No students linked</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {guardian.has_account ? (
                          <Badge variant="default" className="gap-1">
                            <UserCheck className="h-3 w-3" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline">No account</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleLinkClick(guardian)}
                            className="gap-1"
                          >
                            <Link2 className="h-3.5 w-3.5" />
                            Link
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(guardian)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-12 text-center">
                <Users2 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                {searchQuery ? (
                  <>
                    <p className="text-muted-foreground">No guardians match your search</p>
                    <Button variant="link" onClick={() => setSearchQuery("")} className="mt-2">
                      Clear search
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground">No guardians registered yet</p>
                    <Button onClick={() => setShowAddDialog(true)} className="mt-4">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Guardian
                    </Button>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Guardian Dialog */}
        <AddGuardianDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          schoolId={school.id}
          students={studentsList}
        />

        {/* Link Guardian Dialog */}
        <LinkGuardianDialog
          open={showLinkDialog}
          onOpenChange={setShowLinkDialog}
          guardian={selectedGuardian}
          students={studentsList}
          existingLinks={selectedGuardian?.linked_students.map((l) => l.student_id) || []}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Guardian</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>{selectedGuardian?.display_name}</strong>?
                This will also remove all student links. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => selectedGuardian && deleteGuardianMutation.mutate(selectedGuardian.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
