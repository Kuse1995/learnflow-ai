/**
 * Admin Alerts Page
 * System alerts, attendance warnings, fee reminders
 */

import { Bell, AlertTriangle, CheckCircle2, Clock, Users, CreditCard } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useSchoolAdminSchool, useIsSchoolAdmin } from "@/hooks/useSchoolAdmin";
import { AdminLayout } from "@/components/navigation/AdminNav";
import { usePlatformOwner } from "@/hooks/usePlatformOwner";

export default function AdminAlerts() {
  const { data: school, isLoading: schoolLoading } = useSchoolAdminSchool();
  const { data: isAdmin, isLoading: isAdminLoading } = useIsSchoolAdmin();
  const { isPlatformOwner } = usePlatformOwner();

  const isLoading = schoolLoading || isAdminLoading;

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

  // Placeholder data - in production this would come from hooks
  const alerts = {
    system: [],
    attendance: [],
    fees: [],
  };

  const hasAlerts = alerts.system.length > 0 || alerts.attendance.length > 0 || alerts.fees.length > 0;

  return (
    <AdminLayout schoolName={school.name}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Alerts & Notifications
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            System alerts, attendance patterns, and fee reminders
          </p>
        </div>

        {/* Alert Categories */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                System Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{alerts.system.length}</div>
              <p className="text-sm text-muted-foreground">Active alerts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                Attendance Patterns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{alerts.attendance.length}</div>
              <p className="text-sm text-muted-foreground">Flagged patterns</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-red-500" />
                Fee Reminders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{alerts.fees.length}</div>
              <p className="text-sm text-muted-foreground">Pending reminders</p>
            </CardContent>
          </Card>
        </div>

        {/* All Clear State */}
        {!hasAlerts && (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">All Clear</h3>
              <p className="text-muted-foreground">
                No active alerts or notifications at this time
              </p>
            </CardContent>
          </Card>
        )}

        {/* Alert List (when alerts exist) */}
        {hasAlerts && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Alerts</CardTitle>
              <CardDescription>
                Items requiring attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Placeholder for actual alert items */}
                <p className="text-muted-foreground text-center py-4">
                  Alert details will appear here
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5" />
              Alert Settings
            </CardTitle>
            <CardDescription>
              Configure how you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Alert preferences and notification settings will be available here. 
              You'll be able to configure thresholds for attendance warnings and 
              fee reminder schedules.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
