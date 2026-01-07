import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BookOpen, Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StudentPracticeSession } from "@/components/student-practice";

export default function StudentPractice() {
  const { classId, studentId } = useParams<{ classId: string; studentId: string }>();
  const navigate = useNavigate();
  const [isInSession, setIsInSession] = useState(false);

  if (!classId || !studentId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Missing class or student information.</p>
            <Button variant="link" onClick={() => navigate(-1)}>
              Go back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isInSession) {
    return (
      <StudentPracticeSession
        studentId={studentId}
        classId={classId}
        onExit={() => setIsInSession(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      <header className="p-4 border-b bg-background/80 backdrop-blur-sm">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </header>

      <main className="p-6 max-w-md mx-auto">
        <div className="text-center space-y-8 py-12">
          <div className="space-y-4">
            <div className="h-20 w-20 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
              <BookOpen className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold">Practice</h1>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Explore and learn at your own pace. No pressure, no grades — just practice.
            </p>
          </div>

          <Card className="border-primary/20">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-primary" />
                <p className="font-medium">What to expect</p>
              </div>
              <ul className="text-sm text-muted-foreground space-y-2 text-left">
                <li>• A few short activities to explore</li>
                <li>• Take your time — no timer</li>
                <li>• Exit anytime you want</li>
                <li>• Your answers are just for you</li>
              </ul>
            </CardContent>
          </Card>

          <Button size="lg" className="gap-2" onClick={() => setIsInSession(true)}>
            <Sparkles className="h-4 w-4" />
            Continue Practice
          </Button>

          <p className="text-xs text-muted-foreground">
            You can come back anytime.
          </p>
        </div>
      </main>
    </div>
  );
}
