import { useNavigate } from "react-router-dom";
import { useIsSuperAdmin, useAllSchools } from "@/hooks/useSuperAdmin";
import { PlatformAdminHeader } from "@/components/platform-admin";
import { AuditLogViewer, AuditIntegrityPanel, ComplianceSettingsPanel } from "@/components/audit";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";

export default function PlatformAdminCompliance() {
  const navigate = useNavigate();
  const { data: isSuperAdmin, isLoading: adminLoading } = useIsSuperAdmin();
  const { data: schools, isLoading: schoolsLoading } = useAllSchools();
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");

  useEffect(() => {
    if (!adminLoading && !isSuperAdmin) {
      navigate("/");
    }
  }, [isSuperAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (schools?.length && !selectedSchoolId) {
      setSelectedSchoolId(schools[0].id);
    }
  }, [schools, selectedSchoolId]);

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

      <Tabs defaultValue="logs" className="space-y-6">
        <TabsList>
          <TabsTrigger value="logs">Activity Logs</TabsTrigger>
          <TabsTrigger value="integrity">Integrity</TabsTrigger>
          <TabsTrigger value="settings">School Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="logs">
          <AuditLogViewer />
        </TabsContent>

        <TabsContent value="integrity">
          <AuditIntegrityPanel />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Select School:</label>
            {schoolsLoading ? (
              <Skeleton className="h-10 w-64" />
            ) : (
              <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select a school" />
                </SelectTrigger>
                <SelectContent>
                  {schools?.map((school) => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          
          {selectedSchoolId && (
            <ComplianceSettingsPanel schoolId={selectedSchoolId} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
