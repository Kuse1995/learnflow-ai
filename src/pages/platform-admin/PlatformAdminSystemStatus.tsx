import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PlatformAdminHeader } from "@/components/platform-admin";
import { SystemStatusPanel } from "@/components/platform-admin/SystemStatusPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsSuperAdmin } from "@/hooks/useSuperAdmin";

export default function PlatformAdminSystemStatus() {
  const { data: isSuperAdmin, isLoading } = useIsSuperAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isSuperAdmin) {
      navigate('/');
    }
  }, [isSuperAdmin, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Skeleton className="h-12 w-64 mb-8" />
        <Skeleton className="h-96 max-w-4xl mx-auto" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <PlatformAdminHeader />
      <main className="container py-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">System Status</h1>
          <p className="text-muted-foreground">
            Monitor system health and access error codes for support
          </p>
        </div>
        <SystemStatusPanel />
      </main>
    </div>
  );
}
