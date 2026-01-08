import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle, ArrowRight, Clock, Users, Bell } from 'lucide-react';

/**
 * Visual documentation of the rule evaluation flow
 * This component shows how rules are evaluated deterministically
 */
export function RuleEvaluationFlow() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Rule Evaluation Flow</CardTitle>
          <CardDescription>
            How notifications are triggered and processed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Flow Steps */}
            <div className="space-y-8">
              {/* Step 1: Event Trigger */}
              <FlowStep
                number={1}
                title="Event Triggered"
                description="An event occurs in the system (e.g., student marked absent)"
                icon={AlertTriangle}
                color="bg-orange-100 text-orange-800"
              >
                <div className="text-sm space-y-1">
                  <p>• Attendance marked</p>
                  <p>• Late arrival recorded</p>
                  <p>• Emergency declared</p>
                  <p>• Announcement created</p>
                </div>
              </FlowStep>

              <FlowArrow />

              {/* Step 2: Rule Matching */}
              <FlowStep
                number={2}
                title="Rule Matching"
                description="Rules are evaluated in priority order (0 = highest)"
                icon={CheckCircle2}
                color="bg-blue-100 text-blue-800"
              >
                <div className="text-sm space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">1. Check trigger event</Badge>
                    <span className="text-muted-foreground">→ Must match exactly</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">2. Check conditions</Badge>
                    <span className="text-muted-foreground">→ All must pass</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">3. Check school</Badge>
                    <span className="text-muted-foreground">→ Must be in scope</span>
                  </div>
                </div>
              </FlowStep>

              <FlowArrow />

              {/* Step 3: Human Override Check */}
              <FlowStep
                number={3}
                title="Override Check"
                description="Human override is always checked before queuing"
                icon={Users}
                color="bg-purple-100 text-purple-800"
              >
                <div className="text-sm space-y-1">
                  <p>• Teacher can override (if allowed)</p>
                  <p>• Admin can override (if allowed)</p>
                  <p>• Emergency notices: No override allowed</p>
                </div>
              </FlowStep>

              <FlowArrow />

              {/* Step 4: Queue & Delay */}
              <FlowStep
                number={4}
                title="Queue with Delay"
                description="Notification is queued locally first (offline-first)"
                icon={Clock}
                color="bg-yellow-100 text-yellow-800"
              >
                <div className="text-sm space-y-1">
                  <p>• Stored in local storage immediately</p>
                  <p>• Delay window applied (e.g., 30 min)</p>
                  <p>• Cancellable during delay period</p>
                  <p>• Synced to server when online</p>
                </div>
              </FlowStep>

              <FlowArrow />

              {/* Step 5: Send & Escalate */}
              <FlowStep
                number={5}
                title="Send & Escalate"
                description="Notification is sent after delay, with optional escalation"
                icon={Bell}
                color="bg-green-100 text-green-800"
              >
                <div className="text-sm space-y-1">
                  <p>• Sent to target audience</p>
                  <p>• Escalates if no acknowledgment</p>
                  <p>• Logged for audit trail</p>
                </div>
              </FlowStep>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Principles */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-100">
                <CheckCircle2 className="h-4 w-4 text-blue-800" />
              </div>
              Deterministic
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No AI decisions. Same input always produces same output. 
              Rules are evaluated in priority order with explicit conditions.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-2 rounded-lg bg-green-100">
                <AlertTriangle className="h-4 w-4 text-green-800" />
              </div>
              Offline-First
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Rules and queue stored locally. Works without network.
              Syncs automatically when connection is restored.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-2 rounded-lg bg-purple-100">
                <Users className="h-4 w-4 text-purple-800" />
              </div>
              Human Override
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Teachers and admins can always suppress or force-send.
              Override actions are logged for compliance.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FlowStep({ 
  number, 
  title, 
  description, 
  icon: Icon, 
  color, 
  children 
}: {
  number: number;
  title: string;
  description: string;
  icon: typeof CheckCircle2;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${color}`}>
          {number}
        </div>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-2">
          <Icon className="h-5 w-5" />
          <h3 className="font-semibold">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-3">{description}</p>
        <div className="pl-4 border-l-2 border-muted">
          {children}
        </div>
      </div>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="flex justify-center pl-5">
      <ArrowRight className="h-5 w-5 text-muted-foreground rotate-90" />
    </div>
  );
}
