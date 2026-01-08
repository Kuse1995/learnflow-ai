/**
 * Admin Reports Dashboard
 * Aggregated, read-only oversight for school administrators
 * No student names, no rankings, neutral professional language
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSchoolAdminSchool, useIsSchoolAdmin } from "@/hooks/useSchoolAdmin";
import {
  useSchoolOverview,
  useTeachingActivityOverview,
  useSupportCoverage,
  useParentCommunicationOverview,
  useAttentionIndicators,
} from "@/hooks/useAdminReports";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { AdminLayout } from "@/components/navigation/AdminNav";
import {
  AlertCircle,
  Users,
  GraduationCap,
  BookOpen,
  Upload,
  FileText,
  MessageSquare,
  Clock,
  CheckCircle2,
  TrendingUp,
  Eye,
  BarChart3,
} from "lucide-react";
import { usePlatformOwner } from "@/hooks/usePlatformOwner";

export default function AdminReportsDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: isAdmin, isLoading: isAdminLoading } = useIsSchoolAdmin();
  const { data: school, isLoading: isSchoolLoading } = useSchoolAdminSchool();
  const { isPlatformOwner } = usePlatformOwner();
  
  const schoolId = school?.id;
  const { data: overview, isLoading: overviewLoading } = useSchoolOverview(schoolId);
  const { data: activity, isLoading: activityLoading } = useTeachingActivityOverview(schoolId);
  const { data: support, isLoading: supportLoading } = useSupportCoverage(schoolId);
  const { data: communication, isLoading: commLoading } = useParentCommunicationOverview(schoolId);
  const { data: attention, isLoading: attentionLoading } = useAttentionIndicators(schoolId);

  const isLoading = isAdminLoading || isSchoolLoading;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
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
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No School Assigned</AlertTitle>
          <AlertDescription>Your account is not yet linked to a school.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-500">Active</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending Activity</Badge>;
      case "needs_review":
        return <Badge variant="outline" className="text-amber-600 border-amber-600">Needs Review</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <AdminLayout schoolName={school.name}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            School Reports
          </h1>
          <p className="text-muted-foreground mt-1">
            Aggregated system activity. All data is read-only and shows patterns, not performance.
          </p>
        </div>

        {/* School Overview Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {overviewLoading ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-bold">{overview?.totalClasses || 0}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {overviewLoading ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-bold">{overview?.totalStudents || 0}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Teachers</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {overviewLoading ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-bold">{overview?.activeTeachers || 0}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Subjects Offered</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {overviewLoading ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-bold">{overview?.subjectsOffered.length || 0}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different sections */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Activity Overview</TabsTrigger>
            <TabsTrigger value="support">Support Coverage</TabsTrigger>
            <TabsTrigger value="communication">Parent Communication</TabsTrigger>
            <TabsTrigger value="attention">Attention Needed</TabsTrigger>
          </TabsList>

          {/* Teaching Activity */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Teaching Activity by Class
                </CardTitle>
                <CardDescription>
                  Upload and activity patterns across classes. No teacher rankings or comparisons.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activityLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}
                  </div>
                ) : activity?.length ? (
                  <div className="space-y-3">
                    {activity.map(item => (
                      <div
                        key={item.classId}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => navigate(`/teacher/classes/${item.classId}/reports`)}
                      >
                        <div className="space-y-1">
                          <p className="font-medium">{item.className}</p>
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            <span>{item.uploadsAnalyzed} uploads</span>
                            <span>{item.auditActionsRecorded} actions logged</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(item.activityStatus)}
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No class activity data available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Support Coverage */}
          <TabsContent value="support" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Support Plans</CardTitle>
                </CardHeader>
                <CardContent>
                  {supportLoading ? <Skeleton className="h-8 w-16" /> : (
                    <div className="text-2xl font-bold">{support?.totalPlans || 0}</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Acknowledged</CardTitle>
                </CardHeader>
                <CardContent>
                  {supportLoading ? <Skeleton className="h-8 w-16" /> : (
                    <>
                      <div className="text-2xl font-bold flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        {support?.acknowledgedCount || 0}
                      </div>
                      <Progress value={support?.acknowledgedPercentage || 0} className="mt-2" />
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
                </CardHeader>
                <CardContent>
                  {supportLoading ? <Skeleton className="h-8 w-16" /> : (
                    <div className="text-2xl font-bold flex items-center gap-2">
                      <Clock className="h-5 w-5 text-amber-500" />
                      {support?.pendingCount || 0}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Monthly Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 items-end h-32">
                  {support?.monthlyTrend.map((item, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-primary/20 rounded-t"
                        style={{ height: `${Math.max(10, (item.count / 10) * 100)}%` }}
                      />
                      <span className="text-xs text-muted-foreground">{item.month}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Parent Communication */}
          <TabsContent value="communication" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Draft Summaries</CardTitle>
                </CardHeader>
                <CardContent>
                  {commLoading ? <Skeleton className="h-8 w-16" /> : (
                    <div className="text-2xl font-bold">{communication?.draftCount || 0}</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Approved</CardTitle>
                </CardHeader>
                <CardContent>
                  {commLoading ? <Skeleton className="h-8 w-16" /> : (
                    <div className="text-2xl font-bold text-green-600">{communication?.approvedCount || 0}</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Shared with Parents</CardTitle>
                </CardHeader>
                <CardContent>
                  {commLoading ? <Skeleton className="h-8 w-16" /> : (
                    <div className="text-2xl font-bold text-blue-600">{communication?.sharedCount || 0}</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {communication?.classesWithNoUpdates.length ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Classes Awaiting Updates
                  </CardTitle>
                  <CardDescription>These classes have no recent parent communication</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {communication.classesWithNoUpdates.map(c => (
                      <div key={c.classId} className="flex items-center justify-between p-2 border rounded">
                        <span>{c.className}</span>
                        <Badge variant="outline">Awaiting updates</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </TabsContent>

          {/* Attention Indicators */}
          <TabsContent value="attention" className="space-y-4">
            <div className="bg-muted/50 rounded-lg px-4 py-3 text-sm text-muted-foreground mb-4">
              <p>
                🔍 These indicators highlight areas that may benefit from review. 
                This is not a performance assessment — teachers manage their own classrooms.
              </p>
            </div>

            {attentionLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : attention?.length ? (
              <div className="space-y-3">
                {attention.map(item => (
                  <Card key={item.classId}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{item.className}</p>
                          <div className="flex gap-2 mt-1">
                            {item.indicators.noRecentUploads && (
                              <Badge variant="outline" className="text-xs">No recent uploads</Badge>
                            )}
                            {item.indicators.noAuditActivity && (
                              <Badge variant="outline" className="text-xs">No activity logged</Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/teacher/classes/${item.classId}/reports`)}
                        >
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
                  <p className="text-muted-foreground">All classes are showing recent activity</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
