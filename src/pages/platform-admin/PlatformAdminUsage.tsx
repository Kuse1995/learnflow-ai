import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  PlatformAdminHeader, 
  UsageMetricsDashboard, 
  SchoolUsageTable,
  PerformanceHealthPanel 
} from "@/components/platform-admin";
import { Activity, BarChart3, School } from "lucide-react";

export default function PlatformAdminUsage() {
  return (
    <div className="min-h-screen bg-background">
      <PlatformAdminHeader />
      <main className="container mx-auto py-6 px-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Usage & Performance</h1>
          <p className="text-muted-foreground">
            Monitor platform usage, AI consumption, and system health
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="schools" className="gap-2">
              <School className="h-4 w-4" />
              By School
            </TabsTrigger>
            <TabsTrigger value="health" className="gap-2">
              <Activity className="h-4 w-4" />
              Health
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <UsageMetricsDashboard />
          </TabsContent>

          <TabsContent value="schools">
            <SchoolUsageTable />
          </TabsContent>

          <TabsContent value="health">
            <PerformanceHealthPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
