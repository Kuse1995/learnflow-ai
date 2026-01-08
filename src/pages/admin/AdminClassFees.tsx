import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RoleSidebar } from '@/components/navigation';
import { ClassFeesOverview } from '@/components/fees';

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

  const handleStudentClick = (studentId: string) => {
    navigate(`/admin/students/${studentId}/fees`);
  };

  if (!classId) {
    return (
      <div className="min-h-screen bg-background">
        <RoleSidebar role="admin" />
        <main className="container mx-auto px-4 py-6">
          <p className="text-muted-foreground">Class not found</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <RoleSidebar role="admin" />

      <main className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Header */}
        <header className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin')}
            className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>

          <h1 className="text-2xl font-semibold text-foreground">
            Class Fee Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            View fee status and balances for this class
          </p>
        </header>

        {/* Content */}
        <ClassFeesOverview 
          classId={classId} 
          onStudentClick={handleStudentClick}
        />
      </main>
    </div>
  );
}
