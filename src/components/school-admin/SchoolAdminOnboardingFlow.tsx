/**
 * School Admin Onboarding Flow
 * 3-step walkthrough focused on responsibilities and boundaries
 * Trust-focused, no surveillance language
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Shield, Users, Eye, ArrowRight, ArrowLeft } from "lucide-react";
import { useUpdateSchoolAdminOnboarding } from "@/hooks/useSchoolAdmin";

interface SchoolAdminOnboardingFlowProps {
  onComplete: () => void;
  currentStep?: number;
}

const ONBOARDING_STEPS = [
  {
    id: 1,
    title: "Welcome, Administrator",
    subtitle: "Your role in supporting education",
    icon: Shield,
    content: {
      main: "As a school administrator, you oversee systems that help teachers do their best work.",
      points: [
        "You manage school-wide settings and access",
        "You support teachers without micromanaging",
        "You ensure the system serves your school's needs",
      ],
      emphasis: "Teachers are trusted professionals. Your role is to empower them, not supervise their classroom decisions.",
    },
  },
  {
    id: 2,
    title: "What You Can Do",
    subtitle: "Your administrative capabilities",
    icon: Users,
    content: {
      main: "You have oversight of school systems while respecting teacher autonomy.",
      points: [
        "View system-wide usage (not individual teacher rankings)",
        "Manage classes, subjects, and academic terms",
        "Assign subscription plans and access levels",
        "Grant teacher roles to staff members",
        "View parent insight approval counts (not content)",
      ],
      emphasis: "You see the big picture to make informed decisions for your school.",
    },
  },
  {
    id: 3,
    title: "Boundaries & Trust",
    subtitle: "What remains with teachers",
    icon: Eye,
    content: {
      main: "Some decisions belong to teachers who know their students best.",
      points: [
        "You cannot edit teacher-generated insights",
        "You cannot override teacher approvals",
        "You cannot view individual student diagnostic details",
        "You cannot compare teachers against each other",
      ],
      emphasis: "AI suggestions are advisory tools. Teachers always make the final decisions about their students.",
    },
  },
];

export function SchoolAdminOnboardingFlow({ onComplete, currentStep = 1 }: SchoolAdminOnboardingFlowProps) {
  const [step, setStep] = useState(currentStep);
  const updateOnboarding = useUpdateSchoolAdminOnboarding();

  const currentStepData = ONBOARDING_STEPS[step - 1];
  const progress = (step / ONBOARDING_STEPS.length) * 100;
  const isLastStep = step === ONBOARDING_STEPS.length;
  const Icon = currentStepData.icon;

  const handleNext = async () => {
    if (isLastStep) {
      await updateOnboarding.mutateAsync({
        current_step: step,
        completed_at: new Date().toISOString(),
        steps_completed: ONBOARDING_STEPS.map((s) => s.id.toString()),
      });
      onComplete();
    } else {
      const nextStep = step + 1;
      await updateOnboarding.mutateAsync({
        current_step: nextStep,
        steps_completed: ONBOARDING_STEPS.slice(0, step).map((s) => s.id.toString()),
      });
      setStep(nextStep);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="h-8 w-8 text-primary" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl">{currentStepData.title}</CardTitle>
            <CardDescription className="text-base mt-1">
              {currentStepData.subtitle}
            </CardDescription>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground">
            Step {step} of {ONBOARDING_STEPS.length}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <p className="text-center text-muted-foreground">
            {currentStepData.content.main}
          </p>

          <ul className="space-y-3">
            {currentStepData.content.points.map((point, index) => (
              <li key={index} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm">{point}</span>
              </li>
            ))}
          </ul>

          <div className="bg-muted/50 rounded-lg p-4 border-l-4 border-primary">
            <p className="text-sm font-medium text-foreground">
              {currentStepData.content.emphasis}
            </p>
          </div>

          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 1}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={updateOnboarding.isPending}
              className="gap-2"
            >
              {isLastStep ? "Get Started" : "Continue"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
