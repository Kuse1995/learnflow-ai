import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, X, CheckCircle2 } from "lucide-react";
import type { TrainingModule } from "@/hooks/useTeacherTraining";
import { useCompleteTrainingModule } from "@/hooks/useTeacherTraining";
import { toast } from "sonner";

interface TrainingModuleViewerProps {
  module: TrainingModule;
  onClose: () => void;
}

export function TrainingModuleViewer({ module, onClose }: TrainingModuleViewerProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const completeModule = useCompleteTrainingModule();

  const steps = module.content?.steps || [];
  const totalSteps = steps.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const currentStepData = steps[currentStep];

  const handleNext = async () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete the module
      try {
        await completeModule.mutateAsync(module.id);
        toast.success("Training completed!", {
          description: "Great job! This module is now marked as complete.",
        });
        onClose();
      } catch {
        toast.error("Failed to save progress");
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isLastStep = currentStep === totalSteps - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="mx-4 w-full max-w-lg shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{module.title}</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-2">
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>Step {currentStep + 1} of {totalSteps}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>

        <CardContent className="py-8">
          {currentStepData && (
            <div className="text-center">
              <h3 className="mb-4 text-xl font-semibold">{currentStepData.title}</h3>
              <p className="text-muted-foreground">{currentStepData.content}</p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>

          <Button onClick={handleNext} disabled={completeModule.isPending}>
            {isLastStep ? (
              <>
                <CheckCircle2 className="mr-1 h-4 w-4" />
                Complete
              </>
            ) : (
              <>
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
