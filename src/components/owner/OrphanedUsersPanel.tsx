import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Trash2, UserX, RefreshCw, AlertTriangle } from 'lucide-react';
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
import { format } from 'date-fns';

interface OrphanedUser {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

export function OrphanedUsersPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userToDelete, setUserToDelete] = useState<OrphanedUser | null>(null);

  // Fetch users who have profiles but no roles in any school
  const { data: orphanedUsers, isLoading, refetch } = useQuery({
    queryKey: ['orphaned-users'],
    queryFn: async () => {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at');
      
      if (profilesError) throw profilesError;

      // Get all user_ids that have roles
      const { data: usersWithRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id');
      
      if (rolesError) throw rolesError;

      // Get all user_ids that are guardians
      const { data: guardians, error: guardiansError } = await supabase
        .from('guardians')
        .select('user_id')
        .not('user_id', 'is', null);
      
      if (guardiansError) throw guardiansError;

      // Create sets of users with associations
      const usersWithRolesSet = new Set(usersWithRoles?.map(r => r.user_id) || []);
      const guardiansSet = new Set(guardians?.map(g => g.user_id) || []);

      // Filter to users with no associations (excluding platform owner)
      const PLATFORM_OWNER_EMAIL = 'abkanyanta@gmail.com';
      const orphaned = (profiles || []).filter(p => 
        !usersWithRolesSet.has(p.id) && 
        !guardiansSet.has(p.id) &&
        p.email?.toLowerCase() !== PLATFORM_OWNER_EMAIL.toLowerCase()
      );

      return orphaned as OrphanedUser[];
    },
  });

  // Delete orphaned user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Call edge function to delete the auth user
      const { data, error } = await supabase.functions.invoke('delete-school-users', {
        body: { 
          school_id: 'orphaned-cleanup',
          user_ids_override: [userId]
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'User deleted',
        description: 'The orphaned user account has been removed.',
      });
      queryClient.invalidateQueries({ queryKey: ['orphaned-users'] });
      setUserToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Delete failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasOrphanedUsers = orphanedUsers && orphanedUsers.length > 0;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserX className="h-5 w-5 text-amber-500" />
              Orphaned Users
              {hasOrphanedUsers && (
                <Badge variant="secondary" className="ml-2">
                  {orphanedUsers.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Users with accounts but no school associations
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {!hasOrphanedUsers ? (
            <div className="text-center py-6 text-muted-foreground">
              <UserX className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>No orphaned users found</p>
              <p className="text-xs">All registered users have school associations</p>
            </div>
          ) : (
            <div className="space-y-2">
              {orphanedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{user.email}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {user.full_name && <span>{user.full_name}</span>}
                      <span>•</span>
                      <span>Registered {format(new Date(user.created_at), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setUserToDelete(user)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              <p className="text-xs text-muted-foreground pt-2">
                <AlertTriangle className="h-3 w-3 inline mr-1" />
                Deleting a user frees up their email for re-registration
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Orphaned User?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the account for <strong>{userToDelete?.email}</strong>.
              <br /><br />
              The email will become available for new registrations. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => userToDelete && deleteUserMutation.mutate(userToDelete.id)}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? 'Deleting...' : 'Delete User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
