import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { RoleSidebar } from '@/components/navigation';
import { FeeStructureManager } from '@/components/fees';

/**
 * Admin Fees Setup Page
 * 
 * Allows school administrators to:
 * - Define fee structures by academic year, term, and grade
 * - View existing fee items
 * - Create new fee categories
 * 
 * Read-only for non-admins.
 */
export default function AdminFeesSetup() {
  const navigate = useNavigate();

  // TODO: Get from auth context
  const schoolId = 'demo-school-id';

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
            Fee Structure Setup
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure school fees by academic year and term
          </p>
        </header>

        {/* Content */}
        <FeeStructureManager schoolId={schoolId} />
      </main>
    </div>
  );
}
