/**
 * Admin Settings Page
 * School profile and admin preferences
 */

import { Settings, Building2, Globe, Clock, CreditCard } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useSchoolAdminSchool, useIsSchoolAdmin } from "@/hooks/useSchoolAdmin";
import { AdminLayout } from "@/components/navigation/AdminNav";
import { usePlatformOwner } from "@/hooks/usePlatformOwner";
import { useNavigate } from "react-router-dom";

export default function AdminSettings() {
  const { data: school, isLoading: schoolLoading } = useSchoolAdminSchool();
  const { data: isAdmin, isLoading: isAdminLoading } = useIsSchoolAdmin();
  const { isPlatformOwner } = usePlatformOwner();

  const isLoading = schoolLoading || isAdminLoading;
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!isAdmin && !isPlatformOwner) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>You don't have school administrator access.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No School Found</AlertTitle>
          <AlertDescription>Unable to load school information.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <AdminLayout schoolName={school.name}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            School Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage your school's configuration
          </p>
        </div>

        {/* School Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              School Profile
            </CardTitle>
            <CardDescription>
              Basic information about your school
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">School Name</p>
                <p className="text-lg">{school.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge variant="secondary">
                  {school.billing_status || "active"}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Country</p>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span>{school.country || "Zambia"}</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Timezone</p>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{school.timezone || "Africa/Lusaka"}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common settings and configuration pages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <Button
                variant="outline"
                className="justify-start h-auto py-4"
                onClick={() => navigate("/admin/fees")}
              >
                <CreditCard className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <p className="font-medium">Fee Structure</p>
                  <p className="text-sm text-muted-foreground">Configure fees by term and grade</p>
                </div>
              </Button>
              <Button
                variant="outline"
                className="justify-start h-auto py-4"
                onClick={() => navigate("/admin/teachers")}
              >
                <Building2 className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <p className="font-medium">Staff Management</p>
                  <p className="text-sm text-muted-foreground">Invite and manage teachers</p>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* System Info */}
        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
            <CardDescription>
              Technical details about your school's setup
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">School ID</span>
              <code className="text-sm bg-muted px-2 py-0.5 rounded">{school.id}</code>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Created</span>
              <span>{new Date(school.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Demo Mode</span>
              <Badge variant={school.is_demo ? "secondary" : "outline"}>
                {school.is_demo ? "Demo School" : "Production"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
