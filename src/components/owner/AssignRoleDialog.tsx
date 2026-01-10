import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserPlus, Search, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useAssignRole, useAllSchoolsWithPlans } from '@/hooks/useOwnerControls';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const ROLES = [
  { value: 'platform_admin', label: 'Platform Admin' },
  { value: 'school_admin', label: 'School Admin' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'parent', label: 'Parent' },
  { value: 'student', label: 'Student' },
];

export function AssignRoleDialog() {
  const [open, setOpen] = useState(false);
  const [emailSearch, setEmailSearch] = useState('');
  const [userId, setUserId] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [role, setRole] = useState('');

  const assignRole = useAssignRole();
  const { data: schools } = useAllSchoolsWithPlans();

  // Search for user by email
  const { data: foundUser, isLoading: isSearching, isFetching } = useQuery({
    queryKey: ['user-search', emailSearch],
    queryFn: async () => {
      if (!emailSearch.trim() || emailSearch.length < 3) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .ilike('email', `%${emailSearch.trim()}%`)
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: emailSearch.length >= 3,
    staleTime: 1000,
  });

  // When user is found, auto-fill the userId
  const handleSelectUser = () => {
    if (foundUser) {
      setUserId(foundUser.id);
    }
  };

  const handleSubmit = () => {
    if (!userId.trim() || !schoolId || !role) return;

    assignRole.mutate(
      {
        userId: userId.trim(),
        schoolId,
        role: role as any,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setEmailSearch('');
          setUserId('');
          setSchoolId('');
          setRole('');
        },
      }
    );
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setEmailSearch('');
      setUserId('');
      setSchoolId('');
      setRole('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="h-4 w-4 mr-1" />
          Assign Role
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Role to User</DialogTitle>
          <DialogDescription>
            Search for a user by email or enter their ID directly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Email Search */}
          <div className="space-y-2">
            <Label htmlFor="email-search">Search by Email</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email-search"
                value={emailSearch}
                onChange={(e) => setEmailSearch(e.target.value)}
                placeholder="Type email to search..."
                className="pl-9"
              />
              {isFetching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            
            {/* Search Result */}
            {emailSearch.length >= 3 && !isFetching && (
              <div className="mt-2">
                {foundUser ? (
                  <div 
                    className="flex items-center justify-between p-3 rounded-lg border bg-green-500/5 border-green-500/20 cursor-pointer hover:bg-green-500/10 transition-colors"
                    onClick={handleSelectUser}
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-sm font-medium">{foundUser.email}</p>
                        {foundUser.full_name && (
                          <p className="text-xs text-muted-foreground">{foundUser.full_name}</p>
                        )}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={handleSelectUser}>
                      Select
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 rounded-lg border bg-amber-500/5 border-amber-500/20">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <p className="text-sm text-muted-foreground">
                      No user found with this email
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Direct User ID Input */}
          <div className="space-y-2">
            <Label htmlFor="user-id">User ID</Label>
            <Input
              id="user-id"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Auto-filled from search or enter manually"
              className={userId ? 'border-green-500/50 bg-green-500/5' : ''}
            />
            {userId && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                User ID set
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="school">School *</Label>
            <Select value={schoolId} onValueChange={setSchoolId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a school" />
              </SelectTrigger>
              <SelectContent>
                {schools?.map((school) => (
                  <SelectItem key={school.id} value={school.id}>
                    {school.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!userId.trim() || !schoolId || !role || assignRole.isPending}
          >
            {assignRole.isPending ? 'Assigning...' : 'Assign Role'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
