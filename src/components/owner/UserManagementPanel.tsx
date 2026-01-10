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
import { Users, Trash2 } from 'lucide-react';
import { useAllUsersWithRoles, useRevokeRole } from '@/hooks/useOwnerControls';
import { AssignRoleDialog } from './AssignRoleDialog';
import { format } from 'date-fns';

const ROLE_COLORS: Record<string, string> = {
  platform_admin: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  school_admin: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  teacher: 'bg-green-500/10 text-green-600 border-green-500/20',
  parent: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  student: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
};

export function UserManagementPanel() {
  const { data: userRoles, isLoading } = useAllUsersWithRoles();
  const revokeRole = useRevokeRole();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
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
          <Users className="h-5 w-5" />
          User Management
        </CardTitle>
        <AssignRoleDialog />
      </CardHeader>
      <CardContent>
        <div className="rounded-md border max-h-[300px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userRoles?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No user roles found.
                  </TableCell>
                </TableRow>
              )}
              {userRoles?.map((ur) => (
                <TableRow key={ur.id}>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium truncate max-w-[180px]">
                        {ur.user_email || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {ur.user_id.slice(0, 8)}...
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{ur.school?.name || 'Unknown'}</span>
                  </TableCell>
                  <TableCell>
                    <Badge className={ROLE_COLORS[ur.role] || ''} variant="outline">
                      {ur.role.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(ur.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => revokeRole.mutate(ur.id)}
                      disabled={revokeRole.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
