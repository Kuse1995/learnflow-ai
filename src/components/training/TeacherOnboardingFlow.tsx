import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Heart,
  Lightbulb,
  Shield,
  Sparkles,
  Rocket,
  ChevronRight,
  ChevronLeft,
  X,
} from "lucide-react";
import {
  useTeacherOnboarding,
  useStartOnboarding,
  useUpdateOnboardingStep,
  ONBOARDING_STEPS,
} from "@/hooks/useTeacherTraining";

const STEP_ICONS: Record<string, React.ReactNode> = {
  heart: <Heart className="h-12 w-12 text-primary" />,
  lightbulb: <Lightbulb className="h-12 w-12 text-primary" />,
  shield: <Shield className="h-12 w-12 text-primary" />,
  sparkles: <Sparkles className="h-12 w-12 text-primary" />,
  rocket: <Rocket className="h-12 w-12 text-primary" />,
};

interface TeacherOnboardingFlowProps {
  onComplete?: () => void;
  onSkip?: () => void;
}

export function TeacherOnboardingFlow({ onComplete, onSkip }: TeacherOnboardingFlowProps) {
  const { data: onboarding, isLoading } = useTeacherOnboarding();
  const startOnboarding = useStartOnboarding();
  const updateStep = useUpdateOnboardingStep();

  const [currentStep, setCurrentStep] = useState(1);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (onboarding) {
      setCurrentStep(onboarding.current_step);
      if (onboarding.completed_at || onboarding.skipped) {
        setIsVisible(false);
      }
    } else if (!isLoading) {
      // Start onboarding for new teachers
      startOnboarding.mutate();
    }
  }, [onboarding, isLoading]);

  if (!isVisible || isLoading) return null;
  if (onboarding?.completed_at || onboarding?.skipped) return null;

  const stepData = ONBOARDING_STEPS[currentStep - 1];
  const progress = (currentStep / ONBOARDING_STEPS.length) * 100;

  const handleNext = async () => {
    if (currentStep < ONBOARDING_STEPS.length) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      await updateStep.mutateAsync({ step: nextStep });
    } else {
      // Complete onboarding
      await updateStep.mutateAsync({ completed: true });
      setIsVisible(false);
      onComplete?.();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = async () => {
    await updateStep.mutateAsync({ skipped: true });
    setIsVisible(false);
    onSkip?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="mx-4 w-full max-w-lg shadow-lg">
        <CardContent className="p-6">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Step {currentStep} of {ONBOARDING_STEPS.length}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="mr-1 h-4 w-4" />
              Skip for now
            </Button>
          </div>

          {/* Progress */}
          <Progress value={progress} className="mb-6 h-2" />

          {/* Content */}
          <div className="flex flex-col items-center py-8 text-center">
            <div className="mb-6">
              {STEP_ICONS[stepData.icon]}
            </div>
            <h2 className="mb-4 text-2xl font-semibold">{stepData.title}</h2>
            <p className="text-lg text-muted-foreground">{stepData.content}</p>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Button>

            <Button onClick={handleNext}>
              {currentStep === ONBOARDING_STEPS.length ? (
                "Get Started"
              ) : (
                <>
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
