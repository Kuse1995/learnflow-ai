import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, RefreshCw, Trash2, CheckCircle2 } from 'lucide-react';
import { format, formatDistanceToNow, addDays } from 'date-fns';
import { toast } from 'sonner';
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
} from '@/components/ui/alert-dialog';

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  school_id: string;
  school_name: string;
  invited_at: string;
  expires_at: string | null;
  claimed_at: string | null;
}

export function PendingInvitationsPanel() {
  const queryClient = useQueryClient();

  const { data: invitations, isLoading } = useQuery({
    queryKey: ['pending-admin-invitations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pending_admin_invitations')
        .select(`
          id,
          email,
          role,
          school_id,
          invited_at,
          expires_at,
          claimed_at,
          schools:school_id (name)
        `)
        .order('invited_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(inv => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        school_id: inv.school_id,
        school_name: (inv.schools as any)?.name || 'Unknown School',
        invited_at: inv.invited_at,
        expires_at: inv.expires_at,
        claimed_at: inv.claimed_at,
      })) as PendingInvitation[];
    },
  });

  const extendInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const newExpiry = addDays(new Date(), 30);
      const { error } = await supabase
        .from('pending_admin_invitations')
        .update({ expires_at: newExpiry.toISOString() })
        .eq('id', invitationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-admin-invitations'] });
      toast.success('Invitation extended by 30 days');
    },
    onError: (error) => {
      toast.error('Failed to extend invitation: ' + (error as Error).message);
    },
  });

  const cancelInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('pending_admin_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-admin-invitations'] });
      toast.success('Invitation cancelled');
    },
    onError: (error) => {
      toast.error('Failed to cancel invitation: ' + (error as Error).message);
    },
  });

  const pendingInvitations = invitations?.filter(inv => !inv.claimed_at) || [];
  const claimedInvitations = invitations?.filter(inv => inv.claimed_at) || [];

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Pending Admin Invitations
          {pendingInvitations.length > 0 && (
            <Badge variant="secondary">{pendingInvitations.length}</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Admin invitations for users who haven't registered yet. They'll automatically get access when they sign up.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pendingInvitations.length === 0 && claimedInvitations.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No pending invitations. Invitations are created when you assign an admin email that isn't registered yet.
          </p>
        ) : (
          <div className="space-y-6">
            {/* Pending Invitations */}
            {pendingInvitations.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-amber-600 flex items-center gap-1">
                  <Clock className="h-4 w-4" /> Awaiting Registration
                </h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>School</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Invited</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingInvitations.map((invitation) => (
                      <TableRow key={invitation.id}>
                        <TableCell className="font-medium">{invitation.email}</TableCell>
                        <TableCell>{invitation.school_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{invitation.role}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDistanceToNow(new Date(invitation.invited_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          {invitation.expires_at ? (
                            <span className={isExpired(invitation.expires_at) ? 'text-destructive' : 'text-muted-foreground text-sm'}>
                              {isExpired(invitation.expires_at) ? 'Expired' : format(new Date(invitation.expires_at), 'MMM d, yyyy')}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">Never</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => extendInvitation.mutate(invitation.id)}
                              disabled={extendInvitation.isPending}
                              title="Extend by 30 days"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Cancel Invitation?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will cancel the pending invitation for {invitation.email}. 
                                    They won't get automatic admin access when they sign up.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Keep Invitation</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => cancelInvitation.mutate(invitation.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Cancel Invitation
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Recently Claimed Invitations */}
            {claimedInvitations.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Recently Claimed
                </h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>School</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Claimed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {claimedInvitations.slice(0, 5).map((invitation) => (
                      <TableRow key={invitation.id}>
                        <TableCell className="font-medium">{invitation.email}</TableCell>
                        <TableCell>{invitation.school_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{invitation.role}</Badge>
                        </TableCell>
                        <TableCell className="text-green-600 text-sm">
                          {invitation.claimed_at && formatDistanceToNow(new Date(invitation.claimed_at), { addSuffix: true })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
