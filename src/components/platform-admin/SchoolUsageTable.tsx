import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, TrendingUp, ExternalLink } from "lucide-react";
import { useAllSchoolsUsageMetrics, type SchoolUsageSummary } from "@/hooks/useAdminMetrics";
import { Skeleton } from "@/components/ui/skeleton";
import { getUsageWarningLevel } from "@/lib/performance-config";
import { useState } from "react";

export function SchoolUsageTable() {
  const { data: schools, isLoading } = useAllSchoolsUsageMetrics();
  const [filter, setFilter] = useState<"all" | "warning" | "critical">("all");

  if (isLoading) {
    return <SchoolUsageTableSkeleton />;
  }

  if (!schools || schools.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No schools found
        </CardContent>
      </Card>
    );
  }

  // Filter schools based on usage status
  const filteredSchools = schools.filter((school) => {
    if (filter === "all") return true;

    const maxPercentage = Math.max(
      school.metrics.uploads_analyzed.percentage,
      school.metrics.ai_generations.percentage,
      school.metrics.parent_insights_generated.percentage,
      school.metrics.adaptive_support_plans_generated.percentage
    );

    if (filter === "critical") return maxPercentage >= 90;
    if (filter === "warning") return maxPercentage >= 70;
    return true;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>School Usage Overview</CardTitle>
            <CardDescription>
              Monitor usage across all schools (read-only)
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              All ({schools.length})
            </Button>
            <Button
              variant={filter === "warning" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("warning")}
            >
              <TrendingUp className="h-3 w-3 mr-1" />
              Near Limit
            </Button>
            <Button
              variant={filter === "critical" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("critical")}
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              Critical
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>School</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Uploads</TableHead>
              <TableHead>AI Calls</TableHead>
              <TableHead>Insights</TableHead>
              <TableHead>Students</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSchools.map((school) => (
              <SchoolRow key={school.schoolId} school={school} />
            ))}
          </TableBody>
        </Table>

        {filteredSchools.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No schools match the selected filter
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface SchoolRowProps {
  school: SchoolUsageSummary;
}

function SchoolRow({ school }: SchoolRowProps) {
  const getStatusBadge = () => {
    switch (school.billingStatus) {
      case "active":
        return <Badge variant="default">Active</Badge>;
      case "trial":
        return <Badge variant="secondary">Trial</Badge>;
      case "suspended":
        return <Badge variant="destructive">Suspended</Badge>;
      default:
        return <Badge variant="outline">{school.billingStatus}</Badge>;
    }
  };

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{school.schoolName}</div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="capitalize">
          {school.plan}
        </Badge>
      </TableCell>
      <TableCell>{getStatusBadge()}</TableCell>
      <TableCell>
        <UsageCell
          current={school.metrics.uploads_analyzed.current}
          limit={school.metrics.uploads_analyzed.limit}
          percentage={school.metrics.uploads_analyzed.percentage}
        />
      </TableCell>
      <TableCell>
        <UsageCell
          current={school.metrics.ai_generations.current}
          limit={school.metrics.ai_generations.limit}
          percentage={school.metrics.ai_generations.percentage}
        />
      </TableCell>
      <TableCell>
        <UsageCell
          current={school.metrics.parent_insights_generated.current}
          limit={school.metrics.parent_insights_generated.limit}
          percentage={school.metrics.parent_insights_generated.percentage}
        />
      </TableCell>
      <TableCell>
        <span className="text-sm">{school.totalStudents}</span>
      </TableCell>
    </TableRow>
  );
}

interface UsageCellProps {
  current: number;
  limit: number;
  percentage: number;
}

function UsageCell({ current, limit, percentage }: UsageCellProps) {
  const level = getUsageWarningLevel(percentage);

  if (limit === -1) {
    return <span className="text-sm text-muted-foreground">{current} / ∞</span>;
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Progress
          value={percentage}
          className={`h-1.5 w-12 ${
            level === "warning"
              ? "[&>div]:bg-yellow-500"
              : level === "critical"
              ? "[&>div]:bg-orange-500"
              : level === "exceeded"
              ? "[&>div]:bg-destructive"
              : ""
          }`}
        />
        <span className="text-xs text-muted-foreground">
          {current}/{limit}
        </span>
      </div>
    </div>
  );
}

function SchoolUsageTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-60" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
