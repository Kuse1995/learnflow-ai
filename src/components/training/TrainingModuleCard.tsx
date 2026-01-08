import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Clock, Play, Upload, BarChart3, Lightbulb, FileText, Heart, Users } from "lucide-react";
import type { TrainingModule, TrainingProgress } from "@/hooks/useTeacherTraining";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  uploads: <Upload className="h-5 w-5" />,
  analysis: <BarChart3 className="h-5 w-5" />,
  suggestions: <Lightbulb className="h-5 w-5" />,
  actions: <FileText className="h-5 w-5" />,
  support: <Heart className="h-5 w-5" />,
  parents: <Users className="h-5 w-5" />,
};

interface TrainingModuleCardProps {
  module: TrainingModule;
  progress?: TrainingProgress;
  onStart: (moduleId: string) => void;
}

export function TrainingModuleCard({ module, progress, onStart }: TrainingModuleCardProps) {
  const isCompleted = !!progress?.completed_at;
  const isInProgress = !!progress && !progress.completed_at;

  return (
    <Card className={`transition-all hover:shadow-md ${isCompleted ? 'border-primary/30 bg-primary/5' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2 ${isCompleted ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
              {CATEGORY_ICONS[module.category] || <FileText className="h-5 w-5" />}
            </div>
            <div>
              <CardTitle className="text-base">{module.title}</CardTitle>
              <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                {module.duration_minutes} min
              </div>
            </div>
          </div>
          {isCompleted && (
            <Badge variant="secondary" className="gap-1 bg-primary/20 text-primary">
              <CheckCircle2 className="h-3 w-3" />
              Done
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="mb-4">{module.description}</CardDescription>

        {isInProgress && progress && (
          <div className="mb-4">
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span>{progress.progress_percent}%</span>
            </div>
            <Progress value={progress.progress_percent} className="h-1.5" />
          </div>
        )}

        {!isCompleted && (
          <Button
            variant={isInProgress ? "default" : "outline"}
            size="sm"
            className="w-full gap-2"
            onClick={() => onStart(module.id)}
          >
            <Play className="h-4 w-4" />
            {isInProgress ? "Continue" : "Start"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
