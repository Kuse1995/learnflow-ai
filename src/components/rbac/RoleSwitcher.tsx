import React from 'react';
import { Check, ChevronDown, Shield, Building, GraduationCap, Users, BookOpen, Briefcase, Wallet, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRBACContext } from '@/contexts/RBACContext';
import { AppRole, ROLE_CONFIG, getRoleLabel, getRoleColor } from '@/lib/rbac-permissions';

const ROLE_ICONS: Record<AppRole, React.ComponentType<{ className?: string }>> = {
  platform_admin: Shield,
  school_admin: Building,
  admin: Settings,
  bursar: Wallet,
  teacher: GraduationCap,
  parent: Users,
  student: BookOpen,
  staff: Briefcase,
};

interface RoleSwitcherProps {
  /** Show full role name instead of just icon on button */
  showLabel?: boolean;
  /** Compact mode */
  compact?: boolean;
}

/**
 * Role Switcher Component
 * 
 * Allows users with multiple roles to switch their active role.
 * The active role determines which permissions are in effect.
 */
export function RoleSwitcher({ showLabel = true, compact = false }: RoleSwitcherProps) {
  const { roles, activeRole, setActiveRole } = useRBACContext();

  // Don't show switcher if user has 0 or 1 roles
  if (roles.length <= 1) {
    if (!activeRole) return null;
    
    // Just show the current role badge
    const Icon = ROLE_ICONS[activeRole] || Shield;
    return (
      <Badge variant="outline" className="gap-1.5 px-2 py-1">
        <Icon className="h-3 w-3" />
        {showLabel && <span>{getRoleLabel(activeRole)}</span>}
      </Badge>
    );
  }

  const ActiveIcon = activeRole ? ROLE_ICONS[activeRole] || Shield : Shield;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={compact ? 'sm' : 'default'} className="gap-2">
          {activeRole && <ActiveIcon className="h-4 w-4" />}
          {showLabel && activeRole && (
            <span className="hidden sm:inline">{getRoleLabel(activeRole)}</span>
          )}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Switch Role</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {roles.map((role) => {
          const Icon = ROLE_ICONS[role] || Shield;
          const config = ROLE_CONFIG[role];
          const isActive = role === activeRole;

          return (
            <DropdownMenuItem
              key={role}
              onClick={() => setActiveRole(role)}
              className="flex items-start gap-3 py-2"
            >
              <div className={`h-8 w-8 rounded-md flex items-center justify-center ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{getRoleLabel(role)}</span>
                  {isActive && <Check className="h-3 w-3 text-primary" />}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {config?.description}
                </p>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Current Role Badge
 * 
 * Simple badge showing the current active role
 */
export function CurrentRoleBadge() {
  const { activeRole } = useRBACContext();

  if (!activeRole) return null;

  const Icon = ROLE_ICONS[activeRole] || Shield;

  return (
    <Badge className={getRoleColor(activeRole)}>
      <Icon className="h-3 w-3 mr-1" />
      {getRoleLabel(activeRole)}
    </Badge>
  );
}
