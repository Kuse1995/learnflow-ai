import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { ParentInsightView } from "@/components/parent-insights";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export default function ParentDashboard() {
  const { studentId } = useParams<{ studentId: string }>();

  // Fetch the specific student
  const { data: student, isLoading } = useQuery({
    queryKey: ["student", studentId],
    queryFn: async () => {
      if (!studentId) return null;
      const { data, error } = await supabase
        .from("students")
        .select("id, name")
        .eq("id", studentId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!studentId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl py-8 px-4">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold">
            {student?.name ? `${student.name}'s Learning` : "Learning Updates"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Updates from your child's teacher
          </p>
        </header>

        {studentId && (
          <ParentInsightView
            studentId={studentId}
            studentName={student?.name || "Your child"}
          />
        )}
      </div>
    </div>
  );
}
