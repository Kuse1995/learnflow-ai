/**
 * Emergency Dashboard Component
 * 
 * Displays active emergencies, delivery stats, and acknowledgment tracking
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Send,
  Shield,
  Users,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  useActiveEmergencies,
  useEmergencyState,
  useEmergencyDeliveries,
  useAcknowledgments,
  useEscalation,
  useResolveEmergency,
  useCancelEmergency,
  useForcedResend,
  useEmergencyQueueProcessor,
} from '@/hooks/useEmergencyNotifications';
import { EmergencyState, EmergencySeverity } from '@/lib/emergency-notification-system';
import { EmergencyInitiator } from './EmergencyInitiator';
import { EmergencyStateMachine } from './EmergencyStateMachine';

interface EmergencyDashboardProps {
  schoolId: string;
}

const severityConfig: Record<EmergencySeverity, { color: string; icon: React.ReactNode }> = {
  critical: { color: 'destructive', icon: <AlertTriangle className="h-4 w-4" /> },
  high: { color: 'default', icon: <Zap className="h-4 w-4" /> },
  elevated: { color: 'secondary', icon: <Shield className="h-4 w-4" /> },
};

const stateConfig: Record<EmergencyState, { label: string; color: string }> = {
  initiated: { label: 'Initiated', color: 'bg-blue-500' },
  broadcasting: { label: 'Broadcasting', color: 'bg-yellow-500' },
  awaiting_ack: { label: 'Awaiting Acknowledgments', color: 'bg-orange-500' },
  escalating: { label: 'Escalating', color: 'bg-red-500' },
  resolved: { label: 'Resolved', color: 'bg-green-500' },
  cancelled: { label: 'Cancelled', color: 'bg-muted' },
};

export function EmergencyDashboard({ schoolId }: EmergencyDashboardProps) {
  const [selectedEmergencyId, setSelectedEmergencyId] = useState<string | null>(null);
  const { data: activeEmergencies = [], isLoading } = useActiveEmergencies(schoolId);
  const { queueSize, processNow } = useEmergencyQueueProcessor();
  
  return (
    <div className="space-y-6">
      {/* Active Alerts Banner */}
      {activeEmergencies.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Active Emergencies</AlertTitle>
          <AlertDescription>
            {activeEmergencies.length} active emergency notification{activeEmergencies.length > 1 ? 's' : ''} in progress.
            All messages are being sent with highest priority.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Queue Status */}
      {queueSize > 0 && (
        <Card className="border-primary">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary animate-pulse" />
              <span className="font-medium">{queueSize} emergency messages in queue</span>
            </div>
            <Button size="sm" onClick={processNow}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Process Now
            </Button>
          </CardContent>
        </Card>
      )}
      
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active ({activeEmergencies.length})</TabsTrigger>
          <TabsTrigger value="initiate">Initiate Emergency</TabsTrigger>
          <TabsTrigger value="flow">State Machine</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="space-y-4">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">
              Loading emergencies...
            </div>
          ) : activeEmergencies.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mb-4 text-green-500" />
                <p className="text-lg font-medium">No Active Emergencies</p>
                <p className="text-sm">All systems operating normally</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {activeEmergencies.map(emergency => (
                <EmergencyCard
                  key={emergency.id}
                  emergencyId={emergency.id}
                  schoolId={schoolId}
                  isSelected={selectedEmergencyId === emergency.id}
                  onSelect={() => setSelectedEmergencyId(
                    selectedEmergencyId === emergency.id ? null : emergency.id
                  )}
                />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="initiate">
          <EmergencyInitiator schoolId={schoolId} />
        </TabsContent>
        
        <TabsContent value="flow">
          <EmergencyStateMachine />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface EmergencyCardProps {
  emergencyId: string;
  schoolId: string;
  isSelected: boolean;
  onSelect: () => void;
}

function EmergencyCard({ emergencyId, schoolId, isSelected, onSelect }: EmergencyCardProps) {
  const { emergency, isLoading } = useEmergencyState(emergencyId);
  const { stats, queue } = useEmergencyDeliveries(emergencyId);
  const { acks, ackCount } = useAcknowledgments(emergencyId);
  const { currentLevel, maxLevel, manualEscalate } = useEscalation(emergencyId);
  const resolveEmergency = useResolveEmergency();
  const cancelEmergency = useCancelEmergency();
  const forcedResend = useForcedResend(emergencyId);
  
  if (isLoading || !emergency) {
    return <Card className="animate-pulse h-32" />;
  }
  
  const severity = emergency.details.severity;
  const state = emergency.state;
  const ackProgress = emergency.totalRecipients > 0 
    ? (ackCount / emergency.totalRecipients) * 100 
    : 0;
  
  return (
    <Card className={isSelected ? 'ring-2 ring-primary' : ''}>
      <CardHeader className="cursor-pointer" onClick={onSelect}>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {severityConfig[severity].icon}
              <CardTitle className="text-lg">{emergency.details.title}</CardTitle>
            </div>
            <CardDescription>{emergency.details.description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={severityConfig[severity].color as 'default' | 'destructive' | 'secondary'}>
              {severity.toUpperCase()}
            </Badge>
            <div className={`px-2 py-1 rounded text-xs text-white ${stateConfig[state].color}`}>
              {stateConfig[state].label}
            </div>
          </div>
        </div>
      </CardHeader>
      
      {isSelected && (
        <CardContent className="space-y-6">
          {/* Delivery Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{emergency.totalRecipients}</div>
              <div className="text-xs text-muted-foreground">Recipients</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">{emergency.sentCount}</div>
              <div className="text-xs text-muted-foreground">Sent</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{emergency.deliveredCount}</div>
              <div className="text-xs text-muted-foreground">Delivered</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-500">{ackCount}</div>
              <div className="text-xs text-muted-foreground">Acknowledged</div>
            </div>
          </div>
          
          {/* Acknowledgment Progress */}
          {emergency.config.requireAcknowledgment && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Acknowledgment Progress</span>
                <span>{Math.round(ackProgress)}%</span>
              </div>
              <Progress value={ackProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {emergency.pendingAcks} guardians have not yet acknowledged
              </p>
            </div>
          )}
          
          {/* Escalation Level */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <div className="text-sm font-medium">Escalation Level</div>
              <div className="text-xs text-muted-foreground">
                Level {currentLevel} of {maxLevel}
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => manualEscalate()}
              disabled={currentLevel >= maxLevel}
            >
              Escalate
            </Button>
          </div>
          
          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => resolveEmergency.mutate({ emergencyId })}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Resolve
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => cancelEmergency.mutate({ 
                emergencyId, 
                reason: 'Admin cancelled' 
              })}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
          
          {/* Pending Queue */}
          {queue.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Pending Messages ({queue.length})</h4>
              <ScrollArea className="h-32 border rounded-lg p-2">
                {queue.slice(0, 5).map(msg => (
                  <div 
                    key={msg.id}
                    className="flex items-center justify-between py-1 text-sm"
                  >
                    <span className="text-muted-foreground">
                      {msg.channel} • Attempt {msg.attempts + 1}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => forcedResend.mutate({ 
                        recipientId: msg.recipientId,
                        useAlternativeChannel: true,
                      })}
                    >
                      Resend
                    </Button>
                  </div>
                ))}
              </ScrollArea>
            </div>
          )}
          
          {/* Timeline */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Initiated: {new Date(emergency.initiatedAt).toLocaleString()}</span>
            </div>
            {emergency.lastEscalationAt && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Zap className="h-4 w-4" />
                <span>Last escalation: {new Date(emergency.lastEscalationAt).toLocaleString()}</span>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
