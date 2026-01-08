/**
 * Governance Dashboard for School Admins
 * Neutral, informational metrics - NO rankings or performance indicators
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, School, FileText, MessageSquare, Lightbulb } from "lucide-react";
import { useSchoolAdminMetrics } from "@/hooks/useSchoolAdmin";

interface GovernanceDashboardProps {
  schoolId: string;
  schoolName?: string;
}

interface MetricCardProps {
  title: string;
  value: number | string;
  description: string;
  icon: React.ReactNode;
  isLoading?: boolean;
}

function MetricCard({ title, value, description, icon, isLoading }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

export function GovernanceDashboard({ schoolId, schoolName }: GovernanceDashboardProps) {
  const { data: metrics, isLoading } = useSchoolAdminMetrics(schoolId);

  return (
    <div className="space-y-6">
      {/* Header with Trust Messaging */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">
          {schoolName ? `${schoolName} Overview` : "School Overview"}
        </h1>
        <p className="text-muted-foreground">
          System-wide information to help you support your school. Teachers manage their own classrooms.
        </p>
      </div>

      {/* Trust Banner */}
      <Card className="bg-muted/30 border-none">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground text-center">
            📊 These numbers show system activity, not teacher performance. 
            Every teacher uses the system differently based on their classroom needs.
          </p>
        </CardContent>
      </Card>

      {/* Metric Cards - Neutral, No Color Coding */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Active Teachers"
          value={metrics?.active_teachers_count ?? 0}
          description="Teachers with system access"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          isLoading={isLoading}
        />
        <MetricCard
          title="Active Classes"
          value={metrics?.active_classes_count ?? 0}
          description="Classes currently in the system"
          icon={<School className="h-4 w-4 text-muted-foreground" />}
          isLoading={isLoading}
        />
        <MetricCard
          title="Work Analyzed"
          value={metrics?.uploads_this_term ?? 0}
          description="Student work pieces reviewed this term"
          icon={<FileText className="h-4 w-4 text-muted-foreground" />}
          isLoading={isLoading}
        />
        <MetricCard
          title="Parent Updates Shared"
          value={metrics?.parent_insights_approved_count ?? 0}
          description="Insights approved for parents"
          icon={<MessageSquare className="h-4 w-4 text-muted-foreground" />}
          isLoading={isLoading}
        />
        <MetricCard
          title="Support Plans Created"
          value={metrics?.adaptive_plans_generated_count ?? 0}
          description="Adaptive support plans generated"
          icon={<Lightbulb className="h-4 w-4 text-muted-foreground" />}
          isLoading={isLoading}
        />
      </div>

      {/* Information Note */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">About This Dashboard</CardTitle>
          <CardDescription>
            Understanding what you see here
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            This dashboard shows aggregate system usage for your school. It helps you understand 
            how the platform is being used without comparing individual teachers.
          </p>
          <p>
            <strong>What you won't see:</strong> Individual teacher usage, rankings, performance scores, 
            or any comparisons between staff members.
          </p>
          <p>
            <strong>Why:</strong> Teachers are trusted professionals. This system supports their work 
            without creating surveillance or competition.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
