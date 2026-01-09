import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Building2, ExternalLink, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  useAllSchoolsWithPlans, 
  useSuspendSchool, 
  useReinstateSchool,
  useDeleteSchool,
  useAvailablePlans,
} from '@/hooks/useOwnerControls';
import { useActivatePlan } from '@/hooks/useSuperAdmin';
import { CreateSchoolDialog } from './CreateSchoolDialog';

export function SchoolManagementPanel() {
  const { data: schools, isLoading } = useAllSchoolsWithPlans();
  const { data: plans } = useAvailablePlans();
  const suspendSchool = useSuspendSchool();
  const reinstateSchool = useReinstateSchool();
  const deleteSchool = useDeleteSchool();
  const activatePlan = useActivatePlan();
  const [changingPlanForSchool, setChangingPlanForSchool] = useState<string | null>(null);
  const [schoolToDelete, setSchoolToDelete] = useState<{ id: string; name: string } | null>(null);

  const handlePlanChange = (schoolId: string, planId: string) => {
    activatePlan.mutate({
      schoolId,
      planId,
      superAdminOverride: true,
    }, {
      onSuccess: () => setChangingPlanForSchool(null),
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            School Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          School Management
        </CardTitle>
        <CreateSchoolDialog />
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schools?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No schools found. Create one to get started.
                  </TableCell>
                </TableRow>
              )}
              {schools?.map((school) => (
                <TableRow key={school.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{school.name}</span>
                      {school.is_demo && (
                        <Badge variant="outline" className="w-fit text-xs mt-1">Demo</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {changingPlanForSchool === school.id ? (
                      <Select
                        defaultValue={school.subscription?.plan?.id || ''}
                        onValueChange={(value) => handlePlanChange(school.id, value)}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="Select plan" />
                        </SelectTrigger>
                        <SelectContent>
                          {plans?.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id}>
                              {plan.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto py-1 px-2"
                        onClick={() => setChangingPlanForSchool(school.id)}
                      >
                        {school.subscription?.plan?.name ? (
                          <Badge variant="secondary">{school.subscription.plan.name}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">+ Assign plan</span>
                        )}
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={school.billing_status === 'active' ? 'default' : 
                               school.billing_status === 'suspended' ? 'destructive' : 'secondary'}
                    >
                      {school.billing_status || 'unknown'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {school.billing_status === 'suspended' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => reinstateSchool.mutate(school.id)}
                          disabled={reinstateSchool.isPending}
                        >
                          Reinstate
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => suspendSchool.mutate(school.id)}
                          disabled={suspendSchool.isPending}
                        >
                          Suspend
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setSchoolToDelete({ id: school.id, name: school.name })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" asChild>
                        <Link to={`/platform-admin/schools`}>
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!schoolToDelete} onOpenChange={() => setSchoolToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Archive School</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to archive <strong>{schoolToDelete?.name}</strong>? 
                This will archive the school along with all its classes, students, user roles, and related data. 
                The data will be hidden from the system but preserved for recovery.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (schoolToDelete) {
                    deleteSchool.mutate({ schoolId: schoolToDelete.id });
                    setSchoolToDelete(null);
                  }
                }}
              >
                Archive School
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
