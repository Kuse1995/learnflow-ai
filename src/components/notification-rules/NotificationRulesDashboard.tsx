import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Bell, 
  Clock, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  WifiOff,
  RefreshCw,
  Settings,
  ChevronRight,
} from 'lucide-react';
import { useNotificationRules, useNotificationQueue, useSyncPendingNotifications, useCancelNotification } from '@/hooks/useNotificationRuleEngine';
import { NotificationRule, QueuedNotification, NotificationCategory } from '@/lib/notification-rule-engine';
import { formatDistanceToNow, format } from 'date-fns';

interface NotificationRulesDashboardProps {
  schoolId: string;
}

const CATEGORY_CONFIG: Record<NotificationCategory, { label: string; color: string; icon: typeof Bell }> = {
  attendance: { label: 'Attendance', color: 'bg-blue-100 text-blue-800', icon: CheckCircle2 },
  absence: { label: 'Absence', color: 'bg-orange-100 text-orange-800', icon: XCircle },
  late_arrival: { label: 'Late Arrival', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  early_pickup: { label: 'Early Pickup', color: 'bg-purple-100 text-purple-800', icon: Users },
  emergency_notice: { label: 'Emergency', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
  school_wide_alert: { label: 'School Alert', color: 'bg-green-100 text-green-800', icon: Bell },
};

export function NotificationRulesDashboard({ schoolId }: NotificationRulesDashboardProps) {
  const [activeTab, setActiveTab] = useState('rules');
  
  const { data: rules, isLoading: rulesLoading } = useNotificationRules(schoolId);
  const { data: queue, isLoading: queueLoading } = useNotificationQueue(schoolId);
  const { sync, isSyncing } = useSyncPendingNotifications(schoolId);
  const isOffline = !navigator.onLine;
  const cancelMutation = useCancelNotification();

  
  const pendingCount = queue?.filter(n => n.status === 'pending').length || 0;
  const unsyncedCount = queue?.filter(n => !n.syncedToServer).length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Notification Rules</h2>
          <p className="text-muted-foreground">
            Automated notifications with deterministic rules
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isOffline && (
            <Badge variant="outline" className="gap-1">
              <WifiOff className="h-3 w-3" />
              Offline Mode
            </Badge>
          )}
          {unsyncedCount > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => sync()}
              disabled={isSyncing || isOffline}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              Sync {unsyncedCount}
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Rules</CardDescription>
            <CardTitle className="text-3xl">
              {rulesLoading ? <Skeleton className="h-9 w-12" /> : rules?.length || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Notifications</CardDescription>
            <CardTitle className="text-3xl">
              {queueLoading ? <Skeleton className="h-9 w-12" /> : pendingCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Awaiting Sync</CardDescription>
            <CardTitle className="text-3xl">
              {queueLoading ? <Skeleton className="h-9 w-12" /> : unsyncedCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Status</CardDescription>
            <CardTitle className="text-lg flex items-center gap-2">
              {isOffline ? (
                <>
                  <WifiOff className="h-5 w-5 text-muted-foreground" />
                  Offline
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Online
                </>
              )}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="queue">Queue ({pendingCount})</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Rules</CardTitle>
              <CardDescription>
                Rules are evaluated deterministically in priority order
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rulesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {rules?.map((rule) => (
                      <RuleCard key={rule.id} rule={rule} />
                    ))}
                    {(!rules || rules.length === 0) && (
                      <p className="text-center text-muted-foreground py-8">
                        No rules configured
                      </p>
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Queue</CardTitle>
              <CardDescription>
                Pending notifications with cancellation options
              </CardDescription>
            </CardHeader>
            <CardContent>
              {queueLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {queue?.map((notification) => (
                      <QueuedNotificationCard 
                        key={notification.localId || notification.id} 
                        notification={notification}
                        onCancel={(reason) => {
                          cancelMutation.mutate({
                            notificationId: notification.id,
                            localId: notification.localId,
                            reason,
                          });
                        }}
                        isCancelling={cancelMutation.isPending}
                      />
                    ))}
                    {(!queue || queue.length === 0) && (
                      <p className="text-center text-muted-foreground py-8">
                        No pending notifications
                      </p>
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RuleCard({ rule }: { rule: NotificationRule }) {
  const config = CATEGORY_CONFIG[rule.category];
  const Icon = config.icon;

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-start gap-4">
        <div className={`p-2 rounded-lg ${config.color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{rule.name}</span>
            <Badge variant="outline" className="text-xs">
              Priority {rule.priority}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{rule.description}</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {rule.delayWindow.delayMinutes}min delay
            </span>
            {rule.escalationPath && (
              <span className="flex items-center gap-1">
                <ChevronRight className="h-3 w-3" />
                Escalates to {rule.escalationPath.maxLevel}
              </span>
            )}
            {rule.allowTeacherOverride && (
              <Badge variant="secondary" className="text-xs">
                Teacher override
              </Badge>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Badge className={config.color}>{config.label}</Badge>
        <Switch checked={rule.isActive} disabled />
      </div>
    </div>
  );
}

function QueuedNotificationCard({ 
  notification, 
  onCancel,
  isCancelling,
}: { 
  notification: QueuedNotification;
  onCancel: (reason: string) => void;
  isCancelling: boolean;
}) {
  const config = CATEGORY_CONFIG[notification.category];
  const Icon = config.icon;
  
  const scheduledTime = new Date(notification.scheduledFor);
  const cancellableUntil = new Date(notification.cancellableUntil);
  const canCancel = new Date() < cancellableUntil;
  const timeUntilSend = formatDistanceToNow(scheduledTime, { addSuffix: true });

  return (
    <div className="p-4 border rounded-lg space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${config.color}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Badge className={config.color}>{config.label}</Badge>
              {!notification.syncedToServer && (
                <Badge variant="outline" className="text-xs">
                  <WifiOff className="h-3 w-3 mr-1" />
                  Not synced
                </Badge>
              )}
            </div>
            <p className="text-sm mt-1">
              Template: {notification.templateId}
            </p>
          </div>
        </div>
        <div className="text-right text-sm">
          <p className="text-muted-foreground">Sends {timeUntilSend}</p>
          <p className="text-xs text-muted-foreground">
            {format(scheduledTime, 'MMM d, h:mm a')}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t">
        <div className="text-xs text-muted-foreground">
          Target: {notification.targetAudience.replace('_', ' ')}
        </div>
        {canCancel && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onCancel('Cancelled by user')}
            disabled={isCancelling}
          >
            <XCircle className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
