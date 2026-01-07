import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlatformAdminHeader } from "@/components/platform-admin";
import { SecurityDashboard } from "@/components/platform-admin/SecurityDashboard";
import { ShieldCheck } from "lucide-react";

export default function PlatformAdminSecurity() {
  return (
    <div className="min-h-screen bg-background">
      <PlatformAdminHeader />
      <main className="container mx-auto py-6 px-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6" />
            Security & Safety
          </h1>
          <p className="text-muted-foreground">
            Monitor security events, abuse attempts, and system protection (read-only)
          </p>
        </div>

        <SecurityDashboard />
      </main>
    </div>
  );
}
