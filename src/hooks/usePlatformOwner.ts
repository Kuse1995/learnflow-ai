import { useAuthContext } from '@/contexts/AuthContext';

export const PLATFORM_OWNER_EMAIL = 'abkanyanta@gmail.com';

/**
 * Check if current user is the Platform Owner.
 * Platform Owner has unrestricted access:
 * - Ignores demo mode flags
 * - Ignores approval/acknowledgment requirements
 * - Can perform all CRUD operations
 * - Can navigate to all routes
 * - Can act on behalf of teachers
 */
export function usePlatformOwner() {
  const { user, isLoading } = useAuthContext();
  
  const isPlatformOwner = isPlatformOwnerEmail(user?.email);
  
  return {
    isPlatformOwner,
    isLoading,
    email: isPlatformOwner ? user?.email : null,
  };
}

/**
 * Utility function for non-hook contexts.
 * Can be used anywhere to check if an email is the platform owner.
 */
export function isPlatformOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase() === PLATFORM_OWNER_EMAIL.toLowerCase();
}
