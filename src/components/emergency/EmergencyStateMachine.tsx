/**
 * Emergency State Machine Visualization
 * 
 * Shows the emergency notification flow and escalation rules
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Clock,
  MessageSquare,
  PhoneCall,
  RefreshCw,
  Send,
  Users,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  ESCALATION_RULES,
  FORCED_RESEND_RULES,
  EMERGENCY_PRIORITY,
} from '@/lib/emergency-notification-system';

export function EmergencyStateMachine() {
  return (
    <div className="space-y-6">
      {/* State Flow */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Emergency State Machine
          </CardTitle>
          <CardDescription>
            How emergency notifications flow through the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 justify-center">
            <StateBox label="Initiated" color="bg-blue-500" icon={<AlertTriangle />} />
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <StateBox label="Broadcasting" color="bg-yellow-500" icon={<Send />} />
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <StateBox label="Awaiting Ack" color="bg-orange-500" icon={<Clock />} />
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col gap-2">
              <StateBox label="Escalating" color="bg-red-500" icon={<Zap />} />
              <div className="text-xs text-center text-muted-foreground">↺ retry loop</div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col gap-2">
              <StateBox label="Resolved" color="bg-green-500" icon={<CheckCircle />} />
              <StateBox label="Cancelled" color="bg-muted" icon={<XCircle />} />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Escalation Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Escalation Levels
          </CardTitle>
          <CardDescription>
            Automatic escalation when acknowledgments are not received
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {ESCALATION_RULES.map((rule, index) => (
            <div key={rule.level} className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="font-bold text-primary">{rule.level}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">Level {rule.level}</span>
                  <Badge variant="outline">
                    After {rule.triggerAfterMs / 60000} min
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {rule.actions.map(action => (
                    <Badge key={action} variant="secondary" className="text-xs">
                      {formatAction(action)}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Max {rule.maxAttempts} attempts per recipient
                </p>
              </div>
              {index < ESCALATION_RULES.length - 1 && (
                <Separator className="mt-4" />
              )}
            </div>
          ))}
        </CardContent>
      </Card>
      
      {/* Priority Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Priority Queue Override
          </CardTitle>
          <CardDescription>
            Emergency messages bypass normal queues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(EMERGENCY_PRIORITY)
              .sort(([, a], [, b]) => b - a)
              .map(([severity, priority]) => (
                <div 
                  key={severity}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ 
                    backgroundColor: priority > 500 
                      ? 'hsl(var(--destructive) / 0.1)' 
                      : 'hsl(var(--muted))' 
                  }}
                >
                  <span className="font-medium capitalize">{severity}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={priority > 500 ? 'destructive' : 'secondary'}>
                      Priority: {priority}
                    </Badge>
                    {priority > 500 && (
                      <Zap className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                </div>
              ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Higher priority messages are processed first. Emergency messages (priority 800+) 
            bypass the offline queue entirely.
          </p>
        </CardContent>
      </Card>
      
      {/* Forced Resend Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Mandatory Retry Rules
          </CardTitle>
          <CardDescription>
            Forced resend logic for undelivered messages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(FORCED_RESEND_RULES).map(([severity, rules]) => (
              <div key={severity}>
                <h4 className="font-medium capitalize mb-2">{severity} Severity</h4>
                <div className="space-y-2">
                  {rules.map((rule, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                    >
                      <span className="capitalize">{rule.condition.replace('_', ' ')}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          after {rule.afterMs / 1000}s
                        </span>
                        <Badge variant="outline">{rule.maxResends}x</Badge>
                        {rule.useAlternativeChannel && (
                          <Badge variant="secondary">alt channel</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Channel Fallback */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Channel Fallback Order
          </CardTitle>
          <CardDescription>
            Delivery attempts through multiple channels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-4">
            <ChannelBox icon={<MessageSquare />} label="WhatsApp" priority={1} />
            <ArrowRight className="text-muted-foreground" />
            <ChannelBox icon={<MessageSquare />} label="SMS" priority={2} />
            <ArrowRight className="text-muted-foreground" />
            <ChannelBox icon={<MessageSquare />} label="Email" priority={3} />
            <ArrowRight className="text-muted-foreground" />
            <ChannelBox icon={<PhoneCall />} label="Phone Call" priority={4} />
          </div>
          <p className="text-xs text-muted-foreground mt-4 text-center">
            If a channel fails, the system automatically tries the next available channel.
            Phone calls are only used as a last resort in critical emergencies.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function StateBox({ 
  label, 
  color, 
  icon 
}: { 
  label: string; 
  color: string; 
  icon: React.ReactNode;
}) {
  return (
    <div className={`${color} text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium`}>
      {icon}
      {label}
    </div>
  );
}

function ChannelBox({
  icon,
  label,
  priority,
}: {
  icon: React.ReactNode;
  label: string;
  priority: number;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
        {icon}
      </div>
      <span className="text-xs font-medium">{label}</span>
      <Badge variant="outline" className="text-xs">{priority}</Badge>
    </div>
  );
}

function formatAction(action: string): string {
  return action
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
