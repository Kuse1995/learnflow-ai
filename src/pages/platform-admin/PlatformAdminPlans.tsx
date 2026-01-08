import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { usePlatformOwner } from '@/hooks/usePlatformOwner';
import { usePlans, useArchivePlan, useRestorePlan, Plan } from '@/hooks/usePlanManagement';
import { PlatformOwnerBanner } from '@/components/platform-owner';
import { PlanCard } from '@/components/platform-admin/PlanCard';
import { PlanEditorDialog } from '@/components/platform-admin/PlanEditorDialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Plus, CreditCard, Layers, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function PlatformAdminPlans() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuthContext();
  const { isPlatformOwner, isLoading: loadingOwner } = usePlatformOwner();
  const { data: plans, isLoading: loadingPlans } = usePlans();
  const archivePlan = useArchivePlan();
  const restorePlan = useRestorePlan();

  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [planToArchive, setPlanToArchive] = useState<Plan | null>(null);

  const isLoading = authLoading || loadingOwner;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Skeleton className="h-12 w-64 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-96" />
          ))}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (!isPlatformOwner) {
    return <Navigate to="/teacher" replace />;
  }

  const activePlans = plans?.filter(p => p.is_active) ?? [];
  const archivedPlans = plans?.filter(p => !p.is_active) ?? [];

  const handleEdit = (plan: Plan) => {
    setSelectedPlan(plan);
    setEditorOpen(true);
  };

  const handleCreate = () => {
    setSelectedPlan(null);
    setEditorOpen(true);
  };

  const handleArchive = (plan: Plan) => {
    setPlanToArchive(plan);
    setArchiveDialogOpen(true);
  };

  const confirmArchive = async () => {
    if (planToArchive) {
      await archivePlan.mutateAsync(planToArchive.id);
    }
    setArchiveDialogOpen(false);
    setPlanToArchive(null);
  };

  const handleRestore = async (plan: Plan) => {
    await restorePlan.mutateAsync(plan.id);
  };

  return (
    <div className="min-h-screen bg-background">
      <PlatformOwnerBanner />

      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/platform-admin')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <CreditCard className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Plans & Pricing</h1>
                <p className="text-muted-foreground">Manage subscription tiers and features</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={handleCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Plan
              </Button>
              <Button 
                variant="outline" 
                onClick={async () => { 
                  await supabase.auth.signOut(); 
                  navigate('/auth'); 
                }} 
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-6">
        <Tabs defaultValue="active" className="space-y-6">
          <TabsList>
            <TabsTrigger value="active" className="gap-2">
              <Layers className="h-4 w-4" />
              Active Plans
              <Badge variant="secondary" className="ml-1">{activePlans.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="archived" className="gap-2">
              Archived
              {archivedPlans.length > 0 && (
                <Badge variant="secondary" className="ml-1">{archivedPlans.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {loadingPlans ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-96" />
                ))}
              </div>
            ) : activePlans.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No active plans</h3>
                <p className="text-muted-foreground mb-4">Create your first subscription plan</p>
                <Button onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Plan
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {activePlans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    onEdit={handleEdit}
                    onArchive={handleArchive}
                    onRestore={handleRestore}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="archived">
            {archivedPlans.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No archived plans
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {archivedPlans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    onEdit={handleEdit}
                    onArchive={handleArchive}
                    onRestore={handleRestore}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Plan Editor Dialog */}
      <PlanEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        plan={selectedPlan}
      />

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive <strong>{planToArchive?.display_name}</strong>?
              Schools currently on this plan will remain on it, but no new schools can subscribe.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmArchive}>
              Archive Plan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
