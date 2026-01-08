import { RoleSidebar } from "@/components/navigation";
import { TEACHER_SIDEBAR_ITEMS } from "@/components/navigation/navigation-config";
import { TrainingCenter, QuickFeedbackButton } from "@/components/training";

export default function TeacherTraining() {
  return (
    <RoleSidebar role="teacher" items={TEACHER_SIDEBAR_ITEMS}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Training</h1>
            <p className="text-muted-foreground">
              Quick guides to help you get the most out of the system
            </p>
          </div>
          <QuickFeedbackButton featureArea="training" />
        </div>

        {/* Training Center */}
        <TrainingCenter />

        {/* Trust messaging */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <h3 className="mb-2 font-medium text-primary">You're in Control</h3>
          <p className="text-sm text-muted-foreground">
            This system is designed to support your professional judgment, not replace it. 
            All AI suggestions are optional, and nothing is shared without your approval. 
            Take your time learning at your own pace.
          </p>
        </div>
      </div>
    </RoleSidebar>
  );
}
