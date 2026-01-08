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
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useCreateSchool, useAvailablePlans } from '@/hooks/useOwnerControls';

export function CreateSchoolDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [planId, setPlanId] = useState<string>('');
  const [isDemo, setIsDemo] = useState(false);
  const [billingStatus, setBillingStatus] = useState<'trial' | 'active'>('trial');

  const createSchool = useCreateSchool();
  const { data: plans } = useAvailablePlans();

  const handleSubmit = () => {
    if (!name.trim()) return;

    createSchool.mutate(
      {
        name: name.trim(),
        planId: planId || undefined,
        isDemo,
        billingStatus,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setName('');
          setPlanId('');
          setIsDemo(false);
          setBillingStatus('trial');
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add School
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New School</DialogTitle>
          <DialogDescription>
            Add a new school to the platform. You can assign a plan later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="school-name">School Name *</Label>
            <Input
              id="school-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Lusaka Primary School"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan">Subscription Plan</Label>
            <Select value={planId} onValueChange={(v) => setPlanId(v === 'none' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a plan (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No plan</SelectItem>
                {plans?.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="billing-status">Billing Status</Label>
            <Select value={billingStatus} onValueChange={(v) => setBillingStatus(v as 'trial' | 'active')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="active">Active</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is-demo">Demo School</Label>
            <Switch id="is-demo" checked={isDemo} onCheckedChange={setIsDemo} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || createSchool.isPending}>
            {createSchool.isPending ? 'Creating...' : 'Create School'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
