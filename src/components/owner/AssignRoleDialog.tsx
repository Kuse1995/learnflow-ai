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
import { UserPlus } from 'lucide-react';
import { useAssignRole, useAllSchoolsWithPlans } from '@/hooks/useOwnerControls';

const ROLES = [
  { value: 'platform_admin', label: 'Platform Admin' },
  { value: 'school_admin', label: 'School Admin' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'parent', label: 'Parent' },
  { value: 'student', label: 'Student' },
];

export function AssignRoleDialog() {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [role, setRole] = useState('');

  const assignRole = useAssignRole();
  const { data: schools } = useAllSchoolsWithPlans();

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
          setUserId('');
          setSchoolId('');
          setRole('');
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
            Assign a role to a user for a specific school.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="user-id">User ID *</Label>
            <Input
              id="user-id"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter user UUID"
            />
            <p className="text-xs text-muted-foreground">
              The user's auth UUID from the authentication system
            </p>
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
          <Button variant="outline" onClick={() => setOpen(false)}>
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
