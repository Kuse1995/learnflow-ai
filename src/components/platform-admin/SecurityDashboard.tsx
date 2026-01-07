import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Shield, 
  ShieldAlert, 
  ShieldX, 
  AlertTriangle,
  Clock,
  Activity
} from "lucide-react";
import { 
  useSecuritySummary, 
  useSecurityEvents, 
  useAiAbuseAttempts, 
  useRateLimitViolations 
} from "@/hooks/useSecurityEvents";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

export function SecurityDashboard() {
  const { data: summary, isLoading: summaryLoading } = useSecuritySummary();
  const { data: events, isLoading: eventsLoading } = useSecurityEvents({ limit: 20 });
  const { data: abuseAttempts, isLoading: abuseLoading } = useAiAbuseAttempts({ limit: 20 });
  const { data: rateLimits, isLoading: rateLimitsLoading } = useRateLimitViolations({ limit: 20 });

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {summaryLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <SummaryCard
              title="Security Events (24h)"
              value={summary?.eventsLast24h || 0}
              icon={Shield}
              variant={summary?.criticalEvents ? "warning" : "default"}
            />
            <SummaryCard
              title="Critical Alerts"
              value={summary?.criticalEvents || 0}
              icon={ShieldAlert}
              variant={summary?.criticalEvents ? "danger" : "default"}
            />
            <SummaryCard
              title="Blocked Attempts (24h)"
              value={summary?.blockedAttempts || 0}
              icon={ShieldX}
              variant="default"
            />
            <SummaryCard
              title="Rate Limit Hits"
              value={summary?.rateLimitViolations || 0}
              icon={Clock}
              variant={summary?.rateLimitViolations ? "warning" : "default"}
            />
          </>
        )}
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="events" className="space-y-4">
        <TabsList>
          <TabsTrigger value="events" className="gap-2">
            <Activity className="h-4 w-4" />
            Security Events
          </TabsTrigger>
          <TabsTrigger value="abuse" className="gap-2">
            <ShieldX className="h-4 w-4" />
            AI Abuse Attempts
          </TabsTrigger>
          <TabsTrigger value="ratelimits" className="gap-2">
            <Clock className="h-4 w-4" />
            Rate Limits
          </TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Recent Security Events</CardTitle>
              <CardDescription>
                Security events and alerts from across the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <TableSkeleton />
              ) : events && events.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Severity</TableHead>
                      <TableHead>Event Type</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>
                          <SeverityBadge severity={event.severity} />
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatEventType(event.event_type)}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                          {JSON.stringify(event.details).slice(0, 100)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState message="No security events recorded" />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="abuse">
          <Card>
            <CardHeader>
              <CardTitle>AI Abuse Attempts</CardTitle>
              <CardDescription>
                Detected prompt injection and manipulation attempts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {abuseLoading ? (
                <TableSkeleton />
              ) : abuseAttempts && abuseAttempts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Feature</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {abuseAttempts.map((attempt) => (
                      <TableRow key={attempt.id}>
                        <TableCell>
                          {attempt.blocked ? (
                            <Badge variant="destructive">Blocked</Badge>
                          ) : (
                            <Badge variant="secondary">Allowed</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatEventType(attempt.attempt_type)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatEventType(attempt.feature_type)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(attempt.created_at), { addSuffix: true })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState message="No abuse attempts detected" icon={Shield} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ratelimits">
          <Card>
            <CardHeader>
              <CardTitle>Rate Limit Violations</CardTitle>
              <CardDescription>
                Users hitting their usage limits
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rateLimitsLoading ? (
                <TableSkeleton />
              ) : rateLimits && rateLimits.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Feature</TableHead>
                      <TableHead>Limit Type</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rateLimits.map((violation) => (
                      <TableRow key={violation.id}>
                        <TableCell className="font-medium">
                          {formatEventType(violation.feature_type)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatEventType(violation.limit_type)}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {violation.current_count} / {violation.limit_value}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(violation.created_at), { addSuffix: true })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState message="No rate limit violations" icon={Clock} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  variant?: "default" | "warning" | "danger";
}

function SummaryCard({ title, value, icon: Icon, variant = "default" }: SummaryCardProps) {
  const variantClasses = {
    default: "",
    warning: "border-yellow-500/50",
    danger: "border-destructive/50",
  };

  const iconClasses = {
    default: "text-muted-foreground",
    warning: "text-yellow-600",
    danger: "text-destructive",
  };

  return (
    <Card className={variantClasses[variant]}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${iconClasses[variant]}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${variant === "danger" ? "text-destructive" : ""}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  switch (severity) {
    case "critical":
      return <Badge variant="destructive">Critical</Badge>;
    case "warning":
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Warning</Badge>;
    case "info":
    default:
      return <Badge variant="outline">Info</Badge>;
  }
}

function formatEventType(type: string): string {
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

function EmptyState({ message, icon: Icon = AlertTriangle }: { message: string; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Icon className="h-8 w-8 text-muted-foreground mb-2" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}
