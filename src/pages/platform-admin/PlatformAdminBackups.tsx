import { useNavigate } from "react-router-dom";
import { useIsSuperAdmin } from "@/hooks/useSuperAdmin";
import { PlatformAdminHeader } from "@/components/platform-admin";
import { BackupManager, OfflineExportPanel, RecoveryModeControl } from "@/components/backup";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react";

export default function PlatformAdminBackups() {
  const navigate = useNavigate();
  const { data: isSuperAdmin, isLoading: adminLoading } = useIsSuperAdmin();

  useEffect(() => {
    if (!adminLoading && !isSuperAdmin) {
      navigate("/");
    }
  }, [isSuperAdmin, adminLoading, navigate]);

  if (adminLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!isSuperAdmin) return null;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PlatformAdminHeader />

      <Tabs defaultValue="backups" className="space-y-6">
        <TabsList>
          <TabsTrigger value="backups">Backups</TabsTrigger>
          <TabsTrigger value="exports">Offline Exports</TabsTrigger>
          <TabsTrigger value="recovery">Recovery</TabsTrigger>
        </TabsList>

        <TabsContent value="backups">
          <BackupManager showSystemBackups />
        </TabsContent>

        <TabsContent value="exports">
          <OfflineExportPanel />
        </TabsContent>

        <TabsContent value="recovery" className="space-y-6">
          <RecoveryModeControl />
          
          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2">About Recovery Mode</h4>
            <p className="text-sm text-muted-foreground">
              Recovery mode is used during system issues or maintenance. When activated:
            </p>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1">
              <li>• Users see a clear banner explaining the situation</li>
              <li>• Read-only mode prevents data changes</li>
              <li>• Emergency admin access remains available</li>
              <li>• All actions continue to be logged</li>
            </ul>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
