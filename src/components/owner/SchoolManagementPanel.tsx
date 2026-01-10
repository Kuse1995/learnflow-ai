import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Building2, ExternalLink, MoreVertical, Archive, Trash2, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  useAllSchoolsWithPlans, 
  useSuspendSchool, 
  useReinstateSchool,
  useDeleteSchool,
  useHardDeleteSchool,
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
  const hardDeleteSchool = useHardDeleteSchool();
  const activatePlan = useActivatePlan();
  const [changingPlanForSchool, setChangingPlanForSchool] = useState<string | null>(null);
  const [schoolToArchive, setSchoolToArchive] = useState<{ id: string; name: string } | null>(null);
  const [schoolToHardDelete, setSchoolToHardDelete] = useState<{ id: string; name: string } | null>(null);
  const [confirmationText, setConfirmationText] = useState('');

  const handlePlanChange = (schoolId: string, planId: string) => {
    activatePlan.mutate({
      schoolId,
      planId,
      superAdminOverride: true,
    }, {
      onSuccess: () => setChangingPlanForSchool(null),
    });
  };

  const handleHardDelete = () => {
    if (schoolToHardDelete && confirmationText === schoolToHardDelete.name) {
      hardDeleteSchool.mutate(schoolToHardDelete.id);
      setSchoolToHardDelete(null);
      setConfirmationText('');
    }
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
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => setSchoolToArchive({ id: school.id, name: school.name })}
                          >
                            <Archive className="mr-2 h-4 w-4" />
                            Archive School
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive"
                            onClick={() => setSchoolToHardDelete({ id: school.id, name: school.name })}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Permanently Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

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

        {/* Archive Confirmation Dialog */}
        <AlertDialog open={!!schoolToArchive} onOpenChange={() => setSchoolToArchive(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Archive className="h-5 w-5" />
                Archive School
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to archive <strong>{schoolToArchive?.name}</strong>? 
                This will archive the school along with all its classes, students, user roles, and related data. 
                The data will be hidden from the system but preserved for recovery.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-amber-600 text-white hover:bg-amber-700"
                onClick={() => {
                  if (schoolToArchive) {
                    deleteSchool.mutate({ schoolId: schoolToArchive.id });
                    setSchoolToArchive(null);
                  }
                }}
              >
                Archive School
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Hard Delete Confirmation Dialog */}
        <AlertDialog 
          open={!!schoolToHardDelete} 
          onOpenChange={(open) => {
            if (!open) {
              setSchoolToHardDelete(null);
              setConfirmationText('');
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Permanently Delete School
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>
                  <strong className="text-destructive">WARNING: This action is irreversible!</strong>
                </p>
                <p>
                  You are about to permanently delete <strong>{schoolToHardDelete?.name}</strong> and ALL associated data including:
                </p>
                <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                  <li>All students and their records</li>
                  <li>All classes and attendance</li>
                  <li>All fee payments and financial records</li>
                  <li>All learning profiles and AI analyses</li>
                  <li>All guardian links and communications</li>
                  <li>All user roles and permissions</li>
                  <li>All uploads and documents</li>
                </ul>
                <div className="pt-2">
                  <Label htmlFor="confirm-name" className="text-sm font-medium">
                    Type <strong>{schoolToHardDelete?.name}</strong> to confirm:
                  </Label>
                  <Input
                    id="confirm-name"
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                    placeholder="Enter school name"
                    className="mt-2"
                  />
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={confirmationText !== schoolToHardDelete?.name || hardDeleteSchool.isPending}
                onClick={handleHardDelete}
              >
                {hardDeleteSchool.isPending ? 'Deleting...' : 'Permanently Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}