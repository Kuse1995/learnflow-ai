import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Sparkles, Heart, ChevronRight, Lightbulb, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  useGeneratePractice,
  useStartPracticeSession,
  useCompletePracticeSession,
  type PracticeActivity,
} from "@/hooks/usePractice";

interface StudentPracticeSessionProps {
  studentId: string;
  classId: string;
  onExit: () => void;
}

type SessionState = "loading" | "welcome" | "activity" | "transition" | "complete";

export function StudentPracticeSession({
  studentId,
  classId,
  onExit,
}: StudentPracticeSessionProps) {
  const [state, setState] = useState<SessionState>("loading");
  const [activities, setActivities] = useState<PracticeActivity[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [closingMessage, setClosingMessage] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [response, setResponse] = useState("");
  const startTimeRef = useRef<Date>(new Date());

  const { mutateAsync: generatePractice, isPending: isGenerating } = useGeneratePractice();
  const { mutateAsync: startSession } = useStartPracticeSession();
  const { mutateAsync: completeSession } = useCompletePracticeSession();

  useEffect(() => {
    const initSession = async () => {
      try {
        // Start session in DB
        const session = await startSession({ studentId, classId });
        setSessionId(session.id);
        startTimeRef.current = new Date();

        // Generate practice activities
        const data = await generatePractice({ studentId, classId });
        setActivities(data.activities);
        setWelcomeMessage(data.welcomeMessage);
        setClosingMessage(data.closingMessage);
        setState("welcome");
      } catch (error) {
        console.error("Failed to start practice:", error);
        toast.error("Couldn't load practice right now. Please try again later.");
        onExit();
      }
    };

    initSession();
  }, [studentId, classId]);

  const handleStartActivities = () => {
    setCurrentIndex(0);
    setState("activity");
  };

  const handleNext = async () => {
    setResponse("");
    setShowHint(false);

    if (currentIndex < activities.length - 1) {
      setState("transition");
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
        setState("activity");
      }, 1500);
    } else {
      // Session complete
      if (sessionId) {
        const minutes = Math.round(
          (new Date().getTime() - startTimeRef.current.getTime()) / 60000
        );
        await completeSession({ sessionId, sessionLengthMinutes: minutes });
      }
      setState("complete");
    }
  };

  const handleExit = async () => {
    if (sessionId && state !== "complete") {
      const minutes = Math.round(
        (new Date().getTime() - startTimeRef.current.getTime()) / 60000
      );
      await completeSession({ sessionId, sessionLengthMinutes: minutes });
    }
    onExit();
  };

  const currentActivity = activities[currentIndex];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "guided_example":
        return "📘";
      case "try_it":
        return "✏️";
      case "explain":
        return "💬";
      case "visual_match":
        return "🎯";
      case "reflection":
        return "💭";
      default:
        return "✨";
    }
  };

  const getActivityLabel = (type: string) => {
    switch (type) {
      case "guided_example":
        return "Let's walk through this together";
      case "try_it":
        return "Give this a try";
      case "explain":
        return "Share your thinking";
      case "visual_match":
        return "Match and explore";
      case "reflection":
        return "Take a moment to reflect";
      default:
        return "Let's explore";
    }
  };

  // Loading state
  if (state === "loading" || isGenerating) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex flex-col">
        <header className="p-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleExit}>
            <X className="h-4 w-4" />
          </Button>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-3 text-center">
            <Skeleton className="h-6 w-48 mx-auto" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </div>
          <p className="text-sm text-muted-foreground">Preparing your practice...</p>
        </div>
      </div>
    );
  }

  // Welcome state
  if (state === "welcome") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex flex-col">
        <header className="p-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleExit}>
            <X className="h-4 w-4" />
          </Button>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-8">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Heart className="h-10 w-10 text-primary" />
          </div>
          <div className="text-center space-y-3 max-w-md">
            <h1 className="text-2xl font-semibold">Welcome!</h1>
            <p className="text-muted-foreground leading-relaxed">{welcomeMessage}</p>
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              {activities.length} activities to explore
            </p>
            <p className="text-xs text-muted-foreground">
              Take your time. You can leave anytime.
            </p>
          </div>
          <Button size="lg" onClick={handleStartActivities} className="gap-2">
            Let's begin
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Transition state
  if (state === "transition") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex flex-col">
        <header className="p-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleExit}>
            <X className="h-4 w-4" />
          </Button>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <p className="text-lg text-muted-foreground">Nice work. Ready for the next one?</p>
        </div>
      </div>
    );
  }

  // Complete state
  if (state === "complete") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex flex-col">
        <header className="p-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleExit}>
            <X className="h-4 w-4" />
          </Button>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-8">
          <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
            <Heart className="h-12 w-12 text-primary" />
          </div>
          <div className="text-center space-y-3 max-w-md">
            <h1 className="text-2xl font-semibold">Great job today!</h1>
            <p className="text-muted-foreground leading-relaxed">{closingMessage}</p>
          </div>
          <Button size="lg" onClick={handleExit} className="gap-2">
            Finish
          </Button>
        </div>
      </div>
    );
  }

  // Activity state
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex flex-col">
      <header className="p-4 flex items-center justify-between border-b bg-background/80 backdrop-blur-sm">
        <Button variant="ghost" size="sm" onClick={handleExit}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Exit
        </Button>
        <div className="flex items-center gap-2">
          {activities.map((_, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full transition-colors ${
                i < currentIndex
                  ? "bg-primary"
                  : i === currentIndex
                  ? "bg-primary/50"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>
      </header>

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-lg mx-auto space-y-6">
          {/* Activity type label */}
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getActivityIcon(currentActivity.type)}</span>
            <p className="text-sm text-muted-foreground">
              {getActivityLabel(currentActivity.type)}
            </p>
          </div>

          {/* Content card */}
          <Card className="border-primary/20">
            <CardContent className="p-6 space-y-4">
              <p className="text-lg leading-relaxed">{currentActivity.content}</p>
              <div className="pt-4 border-t">
                <p className="font-medium">{currentActivity.prompt}</p>
              </div>
            </CardContent>
          </Card>

          {/* Response area for interactive activities */}
          {(currentActivity.type === "try_it" ||
            currentActivity.type === "explain" ||
            currentActivity.type === "reflection") && (
            <div className="space-y-3">
              <Textarea
                placeholder="Share your thoughts here... (optional)"
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-center">
                This is just for you to think through. We won't save your answers.
              </p>
            </div>
          )}

          {/* Hint section */}
          {currentActivity.hint && (
            <div className="space-y-2">
              {!showHint ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHint(true)}
                  className="gap-2 text-muted-foreground"
                >
                  <Lightbulb className="h-4 w-4" />
                  Need a hint?
                </Button>
              ) : (
                <Card className="bg-muted/50 border-dashed">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <p className="text-sm text-muted-foreground">
                        {currentActivity.hint}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </main>

      <footer className="p-6 border-t bg-background/80 backdrop-blur-sm">
        <div className="max-w-lg mx-auto">
          <Button size="lg" className="w-full gap-2" onClick={handleNext}>
            {currentIndex < activities.length - 1 ? "Continue" : "Finish"}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </footer>
    </div>
  );
}
