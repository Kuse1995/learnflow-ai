import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { AppRole } from '@/lib/rbac-permissions';
import { validateDemoSuperAdmin } from '@/hooks/useDemoSuperAdmin';

// Demo school and user IDs from the database (actual North Park School Demo)
export const DEMO_SCHOOL_ID = '5e508bfd-bd20-4461-8687-450a450111b8';
export const DEMO_CLASS_ID = '11111111-1111-1111-1111-111111111111';

// Demo user configurations
export const DEMO_USERS = {
  teacher: {
    id: 'demo-teacher-001',
    name: 'Ms. Mutale (Demo)',
    role: 'teacher' as AppRole,
    redirectPath: '/teacher',
  },
  school_admin: {
    id: 'demo-admin-001', 
    name: 'Mr. Phiri (Demo)',
    role: 'school_admin' as AppRole,
    redirectPath: '/admin',
  },
  parent: {
    id: 'demo-parent-001',
    name: 'Parent Demo',
    role: 'parent' as AppRole,
    redirectPath: '/parent/11111111-1111-1111-1111-111111111111',
  },
  // Super admin role for platform-level access
  super_admin: {
    id: 'demo-super-admin-001',
    name: 'Super Admin (Demo)',
    role: 'platform_admin' as AppRole,
    redirectPath: '/platform-admin',
  },
} as const;

export type DemoRole = keyof typeof DEMO_USERS;

interface DemoSuperAdminInfo {
  email: string;
  fullName: string | null;
}

interface DemoModeContextValue {
  isDemoMode: boolean;
  demoRole: DemoRole | null;
  demoUserId: string | null;
  demoUserName: string | null;
  demoSchoolId: string | null;
  isSuperAdmin: boolean;
  superAdminInfo: DemoSuperAdminInfo | null;
  enterDemoMode: (role: DemoRole) => void;
  enterAsSuperAdmin: (email: string) => Promise<boolean>;
  exitDemoMode: () => void;
}

const DEMO_STORAGE_KEY = 'stitch_demo_mode';

const DemoModeContext = createContext<DemoModeContextValue | null>(null);

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [demoRole, setDemoRole] = useState<DemoRole | null>(null);
  const [superAdminInfo, setSuperAdminInfo] = useState<DemoSuperAdminInfo | null>(null);

  // Initialize from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(DEMO_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.role && DEMO_USERS[parsed.role as DemoRole]) {
          setDemoRole(parsed.role as DemoRole);
        }
        if (parsed.superAdmin) {
          setSuperAdminInfo(parsed.superAdmin);
        }
      } catch {
        localStorage.removeItem(DEMO_STORAGE_KEY);
      }
    }
  }, []);

  const enterDemoMode = useCallback((role: DemoRole) => {
    setDemoRole(role);
    setSuperAdminInfo(null);
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify({ role }));
  }, []);

  const enterAsSuperAdmin = useCallback(async (email: string): Promise<boolean> => {
    const superAdmin = await validateDemoSuperAdmin(email);
    
    if (superAdmin) {
      const info: DemoSuperAdminInfo = {
        email: superAdmin.email,
        fullName: superAdmin.full_name,
      };
      setDemoRole('super_admin');
      setSuperAdminInfo(info);
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify({ 
        role: 'super_admin', 
        superAdmin: info 
      }));
      return true;
    }
    
    return false;
  }, []);

  const exitDemoMode = useCallback(() => {
    setDemoRole(null);
    setSuperAdminInfo(null);
    localStorage.removeItem(DEMO_STORAGE_KEY);
  }, []);

  const isDemoMode = demoRole !== null;
  const isSuperAdmin = demoRole === 'super_admin' && superAdminInfo !== null;
  const currentDemoUser = demoRole ? DEMO_USERS[demoRole] : null;

  // For super admin, use their actual info
  const displayName = isSuperAdmin 
    ? (superAdminInfo?.fullName || superAdminInfo?.email || 'Super Admin')
    : currentDemoUser?.name ?? null;

  const value: DemoModeContextValue = {
    isDemoMode,
    demoRole,
    demoUserId: currentDemoUser?.id ?? null,
    demoUserName: displayName,
    demoSchoolId: isDemoMode ? DEMO_SCHOOL_ID : null,
    isSuperAdmin,
    superAdminInfo,
    enterDemoMode,
    enterAsSuperAdmin,
    exitDemoMode,
  };

  return (
    <DemoModeContext.Provider value={value}>
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode(): DemoModeContextValue {
  const context = useContext(DemoModeContext);
  
  if (!context) {
    // Return default non-demo state when provider is missing
    return {
      isDemoMode: false,
      demoRole: null,
      demoUserId: null,
      demoUserName: null,
      demoSchoolId: null,
      isSuperAdmin: false,
      superAdminInfo: null,
      enterDemoMode: () => {},
      enterAsSuperAdmin: async () => false,
      exitDemoMode: () => {},
    };
  }
  
  return context;
}
