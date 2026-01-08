import { useRBACContext } from '@/contexts/RBACContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Shield, CheckCircle2, User, GraduationCap, Users, Building } from 'lucide-react';
import type { AppRole } from '@/lib/rbac-permissions';

const ROLE_CONFIG: Partial<Record<AppRole, { label: string; icon: React.ReactNode; color: string }>> = {
  platform_admin: { 
    label: 'Platform Admin', 
    icon: <Shield className="h-4 w-4" />,
    color: 'bg-red-100 text-red-700 border-red-200'
  },
  school_admin: { 
    label: 'School Admin', 
    icon: <Building className="h-4 w-4" />,
    color: 'bg-purple-100 text-purple-700 border-purple-200'
  },
  teacher: { 
    label: 'Teacher', 
    icon: <GraduationCap className="h-4 w-4" />,
    color: 'bg-blue-100 text-blue-700 border-blue-200'
  },
  parent: { 
    label: 'Parent', 
    icon: <Users className="h-4 w-4" />,
    color: 'bg-green-100 text-green-700 border-green-200'
  },
  student: { 
    label: 'Student', 
    icon: <User className="h-4 w-4" />,
    color: 'bg-amber-100 text-amber-700 border-amber-200'
  },
};

export function AccessOverridesPanel() {
  const { activeRole, setActiveRole, isPlatformOwner } = useRBACContext();

  const handleRoleChange = (role: string) => {
    setActiveRole(role as AppRole);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle>Access & Role Overrides</CardTitle>
        </div>
        <CardDescription>
          Simulate different user roles for testing. Platform Owner bypass remains active.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Access Status */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            <div>
              <p className="font-medium text-green-700 dark:text-green-400">Full Access Granted</p>
              <p className="text-sm text-green-600/80 dark:text-green-500">
                Platform Owner bypasses all RBAC, demo, and scope guards
              </p>
            </div>
          </div>
          <Badge className="bg-green-100 text-green-700 border-green-200">
            Active
          </Badge>
        </div>

        {/* Role Switcher */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Simulate Active Role</label>
          <Select
            value={activeRole || 'platform_admin'} 
            onValueChange={handleRoleChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a role to simulate" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ROLE_CONFIG).map(([role, config]) => (
                <SelectItem key={role} value={role}>
                  <div className="flex items-center gap-2">
                    {config.icon}
                    <span>{config.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            This affects UI display only. Platform Owner permissions remain unrestricted.
          </p>
        </div>

        {/* Current Role Display */}
        {activeRole && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Current simulated role:</span>
            <Badge className={ROLE_CONFIG[activeRole]?.color || ''}>
              {ROLE_CONFIG[activeRole]?.icon}
              <span className="ml-1">{ROLE_CONFIG[activeRole]?.label}</span>
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
