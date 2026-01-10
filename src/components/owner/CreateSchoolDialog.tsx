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
import { Plus, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useCreateSchool, useAvailablePlans, useAllRegisteredUsers } from '@/hooks/useOwnerControls';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

const COUNTRIES = [
  { code: 'ZM', name: 'Zambia', timezone: 'Africa/Lusaka' },
  { code: 'ZW', name: 'Zimbabwe', timezone: 'Africa/Harare' },
  { code: 'MW', name: 'Malawi', timezone: 'Africa/Blantyre' },
  { code: 'BW', name: 'Botswana', timezone: 'Africa/Gaborone' },
  { code: 'TZ', name: 'Tanzania', timezone: 'Africa/Dar_es_Salaam' },
  { code: 'KE', name: 'Kenya', timezone: 'Africa/Nairobi' },
  { code: 'UG', name: 'Uganda', timezone: 'Africa/Kampala' },
  { code: 'ZA', name: 'South Africa', timezone: 'Africa/Johannesburg' },
  { code: 'NG', name: 'Nigeria', timezone: 'Africa/Lagos' },
  { code: 'GH', name: 'Ghana', timezone: 'Africa/Accra' },
];

const BILLING_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'trial', label: 'Trial' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'pending', label: 'Pending' },
];

const BILLING_PERIODS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'termly', label: 'Termly (10% off)' },
  { value: 'annual', label: 'Annual (20% off)' },
] as const;

export function CreateSchoolDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [country, setCountry] = useState('Zambia');
  const [planId, setPlanId] = useState('');
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'termly' | 'annual'>('monthly');
  const [isDemo, setIsDemo] = useState(false);
  const [billingStatus, setBillingStatus] = useState('active');
  const [adminEmail, setAdminEmail] = useState('');
  const [selectedAdmins, setSelectedAdmins] = useState<{ id: string; email: string }[]>([]);

  const createSchool = useCreateSchool();
  const { data: plans } = useAvailablePlans();
  const { data: registeredUsers } = useAllRegisteredUsers();

  // All registered users available for admin selection
  const availableUsers = registeredUsers?.map(u => ({
    id: u.id,
    email: u.email || 'Unknown email',
  })) || [];

  // Check if email exists in registered users
  const emailLookupResult = adminEmail.trim() 
    ? availableUsers.find(u => u.email.toLowerCase() === adminEmail.toLowerCase().trim())
    : null;
  const emailNotFound = adminEmail.trim().length > 0 && !emailLookupResult;

  const handleAddAdmin = () => {
    if (emailLookupResult && !selectedAdmins.find(a => a.id === emailLookupResult.id)) {
      setSelectedAdmins([...selectedAdmins, emailLookupResult]);
      setAdminEmail('');
    }
  };

  const handleRemoveAdmin = (userId: string) => {
    setSelectedAdmins(selectedAdmins.filter(a => a.id !== userId));
  };

  const selectedCountry = COUNTRIES.find(c => c.name === country);

  const handleSubmit = () => {
    if (!name.trim()) return;

    createSchool.mutate(
      {
        name: name.trim(),
        planId: planId || undefined,
        billingPeriod: planId ? billingPeriod : undefined,
        isDemo,
        billingStatus,
        country,
        timezone: selectedCountry?.timezone || 'Africa/Lusaka',
        adminUserIds: selectedAdmins.map(a => a.id),
      },
      {
        onSuccess: () => {
          setOpen(false);
          setName('');
          setCountry('Zambia');
          setPlanId('');
          setBillingPeriod('monthly');
          setIsDemo(false);
          setBillingStatus('active');
          setAdminEmail('');
          setSelectedAdmins([]);
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New School</DialogTitle>
          <DialogDescription>
            Add a new school to the platform. You can assign admins who will manage the school.
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
            <Label htmlFor="country">Country *</Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger>
                <SelectValue placeholder="Select a country" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan">Subscription Plan</Label>
            <Select value={planId || 'none'} onValueChange={(v) => setPlanId(v === 'none' ? '' : v)}>
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

          {/* Billing Period - only show when a plan is selected */}
          {planId && (
            <div className="space-y-2">
              <Label htmlFor="billing-period">Billing Period</Label>
              <div className="flex gap-2">
                {BILLING_PERIODS.map((period) => (
                  <button
                    key={period.value}
                    type="button"
                    onClick={() => setBillingPeriod(period.value)}
                    className={`flex-1 px-3 py-2 text-sm rounded-md border transition-colors ${
                      billingPeriod === period.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-input hover:bg-muted'
                    }`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="billing-status">Billing Status</Label>
            <Select value={billingStatus} onValueChange={setBillingStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select billing status" />
              </SelectTrigger>
              <SelectContent>
                {BILLING_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Assign School Admins</Label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="Enter user email"
                  list="user-emails"
                  className={emailLookupResult ? 'pr-8 border-green-500' : emailNotFound ? 'pr-8 border-amber-500' : ''}
                />
                {emailLookupResult && (
                  <CheckCircle2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                )}
                {emailNotFound && (
                  <AlertCircle className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500" />
                )}
              </div>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={handleAddAdmin}
                disabled={!emailLookupResult}
              >
                Add
              </Button>
            </div>
            <datalist id="user-emails">
              {availableUsers.map((user) => (
                <option key={user.id} value={user.email} />
              ))}
            </datalist>
            
            {/* Email lookup feedback */}
            {emailNotFound && (
              <Alert variant="default" className="py-2 border-amber-500/50 bg-amber-500/10">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <AlertDescription className="text-xs">
                  User not registered yet. They must sign up at /auth before they can be assigned as admin.
                </AlertDescription>
              </Alert>
            )}
            
            {selectedAdmins.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedAdmins.map((admin) => (
                  <Badge key={admin.id} variant="secondary" className="flex items-center gap-1">
                    {admin.email}
                    <button
                      type="button"
                      onClick={() => handleRemoveAdmin(admin.id)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              These users will be assigned as school admins and can manage classes, teachers, and students.
            </p>
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
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || createSchool.isPending}
          >
            {createSchool.isPending ? 'Creating...' : 'Create School'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
