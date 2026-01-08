import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { AppRole } from '@/lib/rbac-permissions';

// Demo school and user IDs from the database
export const DEMO_SCHOOL_ID = '00000000-0000-0000-0000-000000000001';
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
    // Use the demo student ID for parent view
    redirectPath: '/parent/11111111-1111-1111-1111-111111111111',
  },
} as const;

type DemoRole = keyof typeof DEMO_USERS;

interface DemoModeContextValue {
  isDemoMode: boolean;
  demoRole: DemoRole | null;
  demoUserId: string | null;
  demoUserName: string | null;
  demoSchoolId: string | null;
  enterDemoMode: (role: DemoRole) => void;
  exitDemoMode: () => void;
}

const DEMO_STORAGE_KEY = 'stitch_demo_mode';

const DemoModeContext = createContext<DemoModeContextValue | null>(null);

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [demoRole, setDemoRole] = useState<DemoRole | null>(null);

  // Initialize from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(DEMO_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.role && DEMO_USERS[parsed.role as DemoRole]) {
          setDemoRole(parsed.role as DemoRole);
        }
      } catch {
        localStorage.removeItem(DEMO_STORAGE_KEY);
      }
    }
  }, []);

  const enterDemoMode = useCallback((role: DemoRole) => {
    setDemoRole(role);
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify({ role }));
  }, []);

  const exitDemoMode = useCallback(() => {
    setDemoRole(null);
    localStorage.removeItem(DEMO_STORAGE_KEY);
  }, []);

  const isDemoMode = demoRole !== null;
  const currentDemoUser = demoRole ? DEMO_USERS[demoRole] : null;

  const value: DemoModeContextValue = {
    isDemoMode,
    demoRole,
    demoUserId: currentDemoUser?.id ?? null,
    demoUserName: currentDemoUser?.name ?? null,
    demoSchoolId: isDemoMode ? DEMO_SCHOOL_ID : null,
    enterDemoMode,
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
      enterDemoMode: () => {},
      exitDemoMode: () => {},
    };
  }
  
  return context;
}
