import { format } from "date-fns";
import { 
  User, 
  Sparkles, 
  Target, 
  Brain, 
  Zap, 
  Languages, 
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useStudentLearningProfile, type StudentLearningProfile } from "@/hooks/useStudentLearningProfile";

interface LearningProfileViewerProps {
  studentId: string | null;
  studentName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LearningProfileViewer({ 
  studentId, 
  studentName, 
  open, 
  onOpenChange 
}: LearningProfileViewerProps) {
  const { data: profile, isLoading } = useStudentLearningProfile(studentId || undefined);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b bg-background">
          <SheetTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Learning Profile
          </SheetTitle>
          {studentName && (
            <p className="text-sm text-muted-foreground">{studentName}</p>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {isLoading ? (
              <ProfileSkeleton />
            ) : !profile ? (
              <EmptyProfile studentName={studentName} />
            ) : (
              <ProfileContent profile={profile} />
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-28 w-full rounded-xl" />
    </div>
  );
}

interface EmptyProfileProps {
  studentName?: string;
}

function EmptyProfile({ studentName }: EmptyProfileProps) {
  return (
    <div className="text-center py-12">
      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
        <User className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-medium text-lg mb-2">No Profile Yet</h3>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
        {studentName ? `${studentName}'s` : "This student's"} learning profile will be created 
        once their work has been analyzed.
      </p>
    </div>
  );
}

interface ProfileContentProps {
  profile: StudentLearningProfile;
}

function ProfileContent({ profile }: ProfileContentProps) {
  return (
    <div className="space-y-6">
      {/* Last Updated */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>Last updated {format(new Date(profile.last_updated), "MMM d, yyyy")}</span>
      </div>

      {/* Strengths Section */}
      <section>
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Learning Strengths
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {profile.strengths ? (
              <p className="text-sm text-foreground">{profile.strengths}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Strengths will be identified as more work is analyzed.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Areas for Focus */}
      <section>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              Areas for Continued Growth
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {profile.weak_topics && profile.weak_topics.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.weak_topics.map((topic, idx) => (
                  <Badge key={idx} variant="secondary" className="font-normal">
                    {topic}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No specific focus areas identified yet.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* Error Pattern Tendencies */}
      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Learning Pattern Tendencies
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <PatternCard
            icon={Brain}
            label="Conceptual Understanding"
            value={profile.error_patterns?.conceptual || 0}
            description="Grasping core ideas and principles"
          />
          <PatternCard
            icon={Zap}
            label="Process & Procedure"
            value={profile.error_patterns?.procedural || 0}
            description="Following steps and methods"
          />
          <PatternCard
            icon={Languages}
            label="Language & Comprehension"
            value={profile.error_patterns?.language || 0}
            description="Understanding instructions and terms"
          />
          <PatternCard
            icon={AlertCircle}
            label="Attention to Detail"
            value={profile.error_patterns?.careless || 0}
            description="Careful checking and accuracy"
          />
        </div>
      </section>

      <Separator />

      {/* Confidence Trend */}
      <section>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overall Learning Trend</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ConfidenceTrendDisplay trend={profile.confidence_trend} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

interface PatternCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  description: string;
}

function PatternCard({ icon: Icon, label, value, description }: PatternCardProps) {
  // Convert numeric value (0-10) to relative tendency without showing numbers
  const getTendency = (v: number): { level: "low" | "moderate" | "notable"; label: string } => {
    if (v <= 3) return { level: "low", label: "Developing well" };
    if (v <= 6) return { level: "moderate", label: "Some focus needed" };
    return { level: "notable", label: "Key growth area" };
  };

  const tendency = getTendency(value);

  const bgColors = {
    low: "bg-primary/10 border-primary/20",
    moderate: "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800",
    notable: "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800",
  };

  const textColors = {
    low: "text-primary",
    moderate: "text-amber-700 dark:text-amber-400",
    notable: "text-blue-700 dark:text-blue-400",
  };

  return (
    <Card className={`${bgColors[tendency.level]} border`}>
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <Icon className={`h-4 w-4 mt-0.5 ${textColors[tendency.level]}`} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{label}</p>
            <p className={`text-xs ${textColors[tendency.level]} font-medium mt-1`}>
              {tendency.label}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ConfidenceTrendDisplayProps {
  trend: "increasing" | "stable" | "declining";
}

function ConfidenceTrendDisplay({ trend }: ConfidenceTrendDisplayProps) {
  const trendConfig = {
    increasing: {
      icon: TrendingUp,
      label: "Positive Growth",
      description: "Recent work shows improving understanding and confidence in the material.",
      color: "text-primary",
      bg: "bg-primary/10",
    },
    stable: {
      icon: Minus,
      label: "Steady Progress",
      description: "Performance has been consistent. Continued practice will support further growth.",
      color: "text-muted-foreground",
      bg: "bg-muted",
    },
    declining: {
      icon: TrendingDown,
      label: "Needs Support",
      description: "Recent work suggests some additional support may be helpful. Consider reviewing focus areas together.",
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/20",
    },
  };

  const config = trendConfig[trend] || trendConfig.stable;
  const Icon = config.icon;

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${config.bg}`}>
      <div className={`h-8 w-8 rounded-full bg-background flex items-center justify-center shrink-0`}>
        <Icon className={`h-4 w-4 ${config.color}`} />
      </div>
      <div>
        <p className={`font-medium text-sm ${config.color}`}>{config.label}</p>
        <p className="text-xs text-muted-foreground mt-1">{config.description}</p>
      </div>
    </div>
  );
}
