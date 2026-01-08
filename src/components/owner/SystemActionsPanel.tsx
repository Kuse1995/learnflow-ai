import { useState } from 'react';
import { 
  useToggleFeatureFlag, 
  useClearAnalytics, 
  useFeatureFlagsControl 
} from '@/hooks/useOwnerControls';
import { useResetDemoData } from '@/hooks/useDemoSafety';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Trash2, 
  BarChart3, 
  Bell, 
  Brain, 
  CreditCard,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function SystemActionsPanel() {
  const resetDemoData = useResetDemoData();
  const clearAnalytics = useClearAnalytics();
  const toggleFeature = useToggleFeatureFlag();
  const { data: featureFlags, isLoading: loadingFlags } = useFeatureFlagsControl();

  const getFeatureFlag = (key: string) => {
    return featureFlags?.find(f => f.key === key)?.enabled ?? false;
  };

  const handleToggleFlag = (key: string, currentValue: boolean) => {
    toggleFeature.mutate({ key, enabled: !currentValue });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          System Actions
        </CardTitle>
        <CardDescription>
          Critical system controls. These actions affect the entire platform.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Destructive Actions */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-destructive">Destructive Actions</h4>
          <div className="flex flex-wrap gap-3">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset Demo Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset All Demo Data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently reset all demo data in the system. 
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => resetDemoData.mutate()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {resetDemoData.isPending ? 'Resetting...' : 'Reset Demo Data'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Clear Analytics
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear All Analytics?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all usage metrics and adoption events.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => clearAnalytics.mutate()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {clearAnalytics.isPending ? 'Clearing...' : 'Clear Analytics'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Feature Toggles */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Feature Controls</h4>
          
          {loadingFlags ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label className="text-sm font-medium">Notifications</Label>
                    <p className="text-xs text-muted-foreground">Global notification delivery</p>
                  </div>
                </div>
                <Switch
                  checked={getFeatureFlag('notifications_enabled')}
                  onCheckedChange={() => handleToggleFlag('notifications_enabled', getFeatureFlag('notifications_enabled'))}
                  disabled={toggleFeature.isPending}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Brain className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label className="text-sm font-medium">AI Generation</Label>
                    <p className="text-xs text-muted-foreground">AI-powered features</p>
                  </div>
                </div>
                <Switch
                  checked={getFeatureFlag('ai_enabled')}
                  onCheckedChange={() => handleToggleFlag('ai_enabled', getFeatureFlag('ai_enabled'))}
                  disabled={toggleFeature.isPending}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label className="text-sm font-medium">Force Paid Features</Label>
                    <p className="text-xs text-muted-foreground">Override subscription checks</p>
                  </div>
                </div>
                <Switch
                  checked={getFeatureFlag('force_paid_features')}
                  onCheckedChange={() => handleToggleFlag('force_paid_features', getFeatureFlag('force_paid_features'))}
                  disabled={toggleFeature.isPending}
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
