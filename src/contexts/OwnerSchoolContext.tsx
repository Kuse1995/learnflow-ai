import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePlatformOwner } from '@/hooks/usePlatformOwner';

interface School {
  id: string;
  name: string;
  is_demo: boolean;
  is_archived: boolean;
  billing_status: string | null;
  created_at: string;
}

interface OwnerSchoolContextValue {
  selectedSchoolId: string | null;
  setSelectedSchoolId: (id: string | null) => void;
  allSchools: School[];
  isLoading: boolean;
  selectedSchool: School | null;
}

const OwnerSchoolContext = createContext<OwnerSchoolContextValue | null>(null);

const STORAGE_KEY = 'owner-selected-school-id';

export function OwnerSchoolProvider({ children }: { children: ReactNode }) {
  const { isPlatformOwner } = usePlatformOwner();
  const [selectedSchoolId, setSelectedSchoolIdState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY);
    }
    return null;
  });

  // Fetch all non-archived schools
  const { data: allSchools = [], isLoading } = useQuery({
    queryKey: ['owner-all-schools'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name, is_demo, is_archived, billing_status, created_at')
        .eq('is_archived', false)
        .order('is_demo', { ascending: true })
        .order('name');

      if (error) throw error;
      return data as School[];
    },
    enabled: isPlatformOwner,
    staleTime: 5 * 60 * 1000,
  });

  // Set initial school if none selected
  useEffect(() => {
    if (!isLoading && allSchools.length > 0 && !selectedSchoolId) {
      // Prefer first non-demo school, otherwise first school
      const defaultSchool = allSchools.find(s => !s.is_demo) || allSchools[0];
      if (defaultSchool) {
        setSelectedSchoolIdState(defaultSchool.id);
        localStorage.setItem(STORAGE_KEY, defaultSchool.id);
      }
    }
  }, [isLoading, allSchools, selectedSchoolId]);

  // Validate selected school still exists
  useEffect(() => {
    if (selectedSchoolId && allSchools.length > 0) {
      const schoolExists = allSchools.some(s => s.id === selectedSchoolId);
      if (!schoolExists) {
        const defaultSchool = allSchools.find(s => !s.is_demo) || allSchools[0];
        if (defaultSchool) {
          setSelectedSchoolIdState(defaultSchool.id);
          localStorage.setItem(STORAGE_KEY, defaultSchool.id);
        }
      }
    }
  }, [selectedSchoolId, allSchools]);

  const setSelectedSchoolId = (id: string | null) => {
    setSelectedSchoolIdState(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const selectedSchool = useMemo(() => {
    return allSchools.find(s => s.id === selectedSchoolId) || null;
  }, [allSchools, selectedSchoolId]);

  const value = useMemo(() => ({
    selectedSchoolId,
    setSelectedSchoolId,
    allSchools,
    isLoading,
    selectedSchool,
  }), [selectedSchoolId, allSchools, isLoading, selectedSchool]);

  return (
    <OwnerSchoolContext.Provider value={value}>
      {children}
    </OwnerSchoolContext.Provider>
  );
}

export function useOwnerSchool() {
  const context = useContext(OwnerSchoolContext);
  if (!context) {
    // Return a default value for non-owner users
    return {
      selectedSchoolId: null,
      setSelectedSchoolId: () => {},
      allSchools: [],
      isLoading: false,
      selectedSchool: null,
    };
  }
  return context;
}
