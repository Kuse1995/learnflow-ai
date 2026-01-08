import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GraduationCap, CheckCircle2 } from "lucide-react";
import {
  useTrainingModules,
  useTrainingProgress,
  useStartTrainingModule,
  type TrainingModule,
} from "@/hooks/useTeacherTraining";
import { TrainingModuleCard } from "./TrainingModuleCard";
import { TrainingModuleViewer } from "./TrainingModuleViewer";

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'uploads', label: 'Uploads' },
  { key: 'analysis', label: 'Analysis' },
  { key: 'suggestions', label: 'Suggestions' },
  { key: 'actions', label: 'Actions' },
  { key: 'support', label: 'Support' },
  { key: 'parents', label: 'Parents' },
];

export function TrainingCenter() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewingModule, setViewingModule] = useState<TrainingModule | null>(null);

  const { data: modules, isLoading: modulesLoading } = useTrainingModules();
  const { data: progress } = useTrainingProgress();
  const startModule = useStartTrainingModule();

  const filteredModules = selectedCategory === 'all'
    ? modules
    : modules?.filter((m) => m.category === selectedCategory);

  const completedCount = progress?.filter((p) => p.completed_at)?.length || 0;
  const totalModules = modules?.length || 0;
  const overallProgress = totalModules > 0 ? (completedCount / totalModules) * 100 : 0;

  const handleStartModule = async (moduleId: string) => {
    await startModule.mutateAsync(moduleId);
    const module = modules?.find((m) => m.id === moduleId);
    if (module) {
      setViewingModule(module);
    }
  };

  const getProgressForModule = (moduleId: string) => {
    return progress?.find((p) => p.module_id === moduleId);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Training Center</CardTitle>
                <CardDescription>Short guides to help you use the system</CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {completedCount}/{totalModules} complete
            </Badge>
          </div>

          {/* Overall progress */}
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-muted-foreground">Your progress</span>
              <span className="font-medium">{Math.round(overallProgress)}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="mb-4 flex-wrap">
              {CATEGORIES.map((cat) => (
                <TabsTrigger key={cat.key} value={cat.key} className="text-xs">
                  {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={selectedCategory} className="mt-0">
              {modulesLoading ? (
                <div className="py-8 text-center text-muted-foreground">
                  Loading modules...
                </div>
              ) : filteredModules && filteredModules.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredModules.map((module) => (
                    <TrainingModuleCard
                      key={module.id}
                      module={module}
                      progress={getProgressForModule(module.id)}
                      onStart={handleStartModule}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No modules in this category
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Module Viewer Modal */}
      {viewingModule && (
        <TrainingModuleViewer
          module={viewingModule}
          onClose={() => setViewingModule(null)}
        />
      )}
    </>
  );
}
