import { CreditCard } from 'lucide-react';
import { FeeStructureManager } from '@/components/fees';
import { AdminLayout } from '@/components/navigation/AdminNav';
import { useSchoolAdminSchool } from '@/hooks/useSchoolAdmin';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Admin Fees Setup Page
 * 
 * Allows school administrators to:
 * - Define fee structures by academic year, term, and grade
 * - View existing fee items
 * - Create new fee categories
 */
export default function AdminFeesSetup() {
  const { data: school, isLoading } = useSchoolAdminSchool();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <AdminLayout schoolName={school?.name}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6" />
            Fee Structure Setup
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure school fees by academic year and term
          </p>
        </div>

        {/* Content */}
        <FeeStructureManager schoolId={school?.id || ''} />
      </div>
    </AdminLayout>
  );
}
