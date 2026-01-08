import { useParams, useNavigate } from 'react-router-dom';
import { CreditCard } from 'lucide-react';
import { ClassFeesOverview } from '@/components/fees';
import { AdminLayout } from '@/components/navigation/AdminNav';
import { useSchoolAdminSchool } from '@/hooks/useSchoolAdmin';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Admin Class Fees Page
 * 
 * Shows fee overview for a specific class:
 * - Aggregated totals
 * - Per-student balances
 * - Status breakdown
 */
export default function AdminClassFees() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { data: school, isLoading } = useSchoolAdminSchool();

  const handleStudentClick = (studentId: string) => {
    navigate(`/admin/students/${studentId}/fees`);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!classId) {
    return (
      <AdminLayout schoolName={school?.name}>
        <div className="p-6">
          <p className="text-muted-foreground">Class not found</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout schoolName={school?.name}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6" />
            Class Fee Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            View fee status and balances for this class
          </p>
        </div>

        {/* Content */}
        <ClassFeesOverview 
          classId={classId}
          schoolId={school?.id || ''}
          onStudentClick={handleStudentClick}
          canSendReminder={true}
        />
      </div>
    </AdminLayout>
  );
}
