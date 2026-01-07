import { useState } from "react";
import { useIsSuperAdmin, useAllSchools, usePlans, useActivatePlan, useSuspendSchool, useReinstateSchool, useArchiveSchool } from "@/hooks/useSuperAdmin";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlatformAdminHeader } from "@/components/platform-admin/PlatformAdminHeader";
import { ActivatePlanDialog } from "@/components/platform-admin/ActivatePlanDialog";
import { SuspendSchoolDialog } from "@/components/platform-admin/SuspendSchoolDialog";
import { Building2, Search, Filter } from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function PlatformAdminSchools() {
  const { data: isSuperAdmin, isLoading: checkingAdmin } = useIsSuperAdmin();
  const { data: schools, isLoading: loadingSchools } = useAllSchools();
  const { data: plans } = usePlans();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedSchool, setSelectedSchool] = useState<any>(null);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  
  const reinstateSchool = useReinstateSchool();
  const archiveSchool = useArchiveSchool();

  if (checkingAdmin) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Skeleton className="h-12 w-64 mb-8" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  const filteredSchools = schools?.filter((school: any) => {
    const matchesSearch = school.name.toLowerCase().includes(search.toLowerCase());
    const subscription = school.school_subscriptions?.[0];
    const status = subscription?.status || "none";
    const matchesStatus = statusFilter === "all" || status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default">Active</Badge>;
      case "suspended":
        return <Badge variant="destructive">Suspended</Badge>;
      case "expired":
        return <Badge variant="secondary">Expired</Badge>;
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      default:
        return <Badge variant="outline">No Subscription</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PlatformAdminHeader />
      
      <main className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              School Management
            </h1>
            <p className="text-muted-foreground">
              Manage school subscriptions, plans, and access
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search schools..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="none">No Subscription</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Schools Table */}
        <Card>
          <CardContent className="pt-6">
            {loadingSchools ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>School</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSchools?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No schools found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSchools?.map((school: any) => {
                      const subscription = school.school_subscriptions?.[0];
                      const plan = subscription?.plan;

                      return (
                        <TableRow key={school.id}>
                          <TableCell className="font-medium">{school.name}</TableCell>
                          <TableCell>
                            {plan ? (
                              <Badge variant="secondary">{plan.display_name}</Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(subscription?.status || "none")}
                          </TableCell>
                          <TableCell>
                            {subscription?.expires_at ? (
                              format(new Date(subscription.expires_at), "MMM d, yyyy")
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {format(new Date(school.created_at), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedSchool(school);
                                setShowActivateDialog(true);
                              }}
                            >
                              {subscription ? "Change Plan" : "Activate"}
                            </Button>
                            
                            {subscription?.status === "active" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive"
                                onClick={() => {
                                  setSelectedSchool(school);
                                  setShowSuspendDialog(true);
                                }}
                              >
                                Suspend
                              </Button>
                            )}

                            {subscription?.status === "suspended" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => reinstateSchool.mutate(school.id)}
                                disabled={reinstateSchool.isPending}
                              >
                                Reinstate
                              </Button>
                            )}

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost" className="text-destructive">
                                  Archive
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Archive School?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will archive "{school.name}". The school will no longer appear in lists but data is preserved. This cannot be undone from the UI.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground"
                                    onClick={() => archiveSchool.mutate({ schoolId: school.id })}
                                  >
                                    Archive School
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Dialogs */}
      {selectedSchool && (
        <>
          <ActivatePlanDialog
            open={showActivateDialog}
            onOpenChange={setShowActivateDialog}
            school={selectedSchool}
            plans={plans || []}
            currentPlanId={selectedSchool.school_subscriptions?.[0]?.plan_id}
          />
          <SuspendSchoolDialog
            open={showSuspendDialog}
            onOpenChange={setShowSuspendDialog}
            school={selectedSchool}
          />
        </>
      )}
    </div>
  );
}
