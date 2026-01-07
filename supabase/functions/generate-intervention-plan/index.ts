import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { studentId, classId, sourceWindowDays = 30 } = await req.json();

    if (!studentId || !classId) {
      return new Response(
        JSON.stringify({ success: false, error: "studentId and classId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch student info
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id, name")
      .eq("id", studentId)
      .single();

    if (studentError || !student) {
      console.error("Student fetch error:", studentError);
      return new Response(
        JSON.stringify({ success: false, error: "Student not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate date threshold
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - sourceWindowDays);

    // Fetch student learning profile
    const { data: learningProfile } = await supabase
      .from("student_learning_profiles")
      .select("*")
      .eq("student_id", studentId)
      .maybeSingle();

    // Fetch recent completed analyses for this class
    const { data: analyses } = await supabase
      .from("upload_analyses")
      .select("id, class_summary, student_diagnostics, analyzed_at")
      .eq("class_id", classId)
      .eq("status", "completed")
      .gte("analyzed_at", dateThreshold.toISOString())
      .order("analyzed_at", { ascending: false })
      .limit(5);

    // Fetch recent teacher actions for context
    const { data: teacherActions } = await supabase
      .from("teacher_action_logs")
      .select("action_taken, topic, reflection_notes")
      .eq("class_id", classId)
      .gte("created_at", dateThreshold.toISOString())
      .order("created_at", { ascending: false })
      .limit(10);

    // Extract student-specific diagnostics from analyses
    const studentDiagnostics: any[] = [];
    analyses?.forEach(analysis => {
      const diagnostics = analysis.student_diagnostics as any[];
      if (diagnostics) {
        const studentData = diagnostics.find((d: any) => d.student_id === studentId);
        if (studentData) {
          studentDiagnostics.push({
            date: analysis.analyzed_at,
            ...studentData,
          });
        }
      }
    });

    // Build teaching context
    const recentTopics = teacherActions?.map(a => a.topic).filter(Boolean) || [];
    const recentActions = teacherActions?.map(a => a.action_taken).slice(0, 5) || [];

    // System prompt with strict rules
    const systemPrompt = `You are an instructional support assistant helping teachers adapt learning opportunities for individual students.

CRITICAL RULES:
- Do NOT label students by ability or performance
- Do NOT compare students to peers
- Do NOT assign levels, stages, or difficulty ratings
- Do NOT use deficit language (e.g., weak, struggling, behind, poor, failing)
- Do NOT make predictions about future performance
- Do NOT use evaluative terms (excellent, good, bad, poor)

ALLOWED LANGUAGE:
- "currently practicing..."
- "benefits from continued exposure to..."
- "responds well to..."
- "shows engagement when..."
- "ready to extend understanding in..."
- "may find it helpful to..."
- "could explore..."

TONE:
- Neutral, supportive, and practical
- Focus on opportunities, not deficits
- Actionable suggestions for the teacher

OUTPUT IS FOR TEACHER USE ONLY.`;

    const userPrompt = `Generate an intervention plan for a student based on recent learning evidence.

STUDENT CONTEXT:
${learningProfile ? `
- Areas of strength: ${learningProfile.strengths || "developing across multiple areas"}
- Topics for continued practice: ${(learningProfile.weak_topics as string[] || []).join(", ") || "various topics"}
- Error pattern tendencies: ${JSON.stringify(learningProfile.error_patterns || {})}
- Engagement trend: ${learningProfile.confidence_trend || "stable"}
` : "- No prior learning profile available"}

RECENT LEARNING EVIDENCE (last ${sourceWindowDays} days):
${studentDiagnostics.length > 0 ? studentDiagnostics.map(d => `
- Date: ${d.date}
- Topics: ${d.topics_attempted?.join(", ") || "not recorded"}
- Observations: ${d.summary || "no summary"}
`).join("\n") : "- No recent diagnostic data available"}

RECENT CLASS CONTEXT:
- Recent topics covered: ${recentTopics.slice(0, 5).join(", ") || "not recorded"}
- Recent teaching approaches: ${recentActions.join("; ") || "not recorded"}

Based on this evidence, provide practical instructional suggestions. Remember: focus on opportunities and support strategies, not deficits.`;

    // Call AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_intervention_plan",
              description: "Submit the student intervention plan",
              parameters: {
                type: "object",
                properties: {
                  focus_areas: {
                    type: "array",
                    items: { type: "string" },
                    description: "Topics or skills for continued practice (2-4 items)",
                  },
                  recommended_practice_types: {
                    type: "array",
                    items: { type: "string" },
                    description: "Types of practice that may support learning (2-4 items, e.g., 'worked examples', 'guided practice', 'oral explanation')",
                  },
                  support_strategies: {
                    type: "array",
                    items: { type: "string" },
                    description: "Instructional support strategies (2-4 items, e.g., 'visual aids', 'step-by-step prompts')",
                  },
                  confidence_support_notes: {
                    type: "string",
                    description: "Optional notes about supporting student confidence and engagement",
                  },
                },
                required: ["focus_areas", "recommended_practice_types", "support_strategies"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_intervention_plan" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "Usage credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    
    // Extract from tool call
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("Invalid AI response structure");
    }

    const plan = JSON.parse(toolCall.function.arguments);

    // Save to database
    const { data: savedPlan, error: saveError } = await supabase
      .from("student_intervention_plans")
      .insert({
        student_id: studentId,
        class_id: classId,
        focus_areas: plan.focus_areas || [],
        recommended_practice_types: plan.recommended_practice_types || [],
        support_strategies: plan.support_strategies || [],
        confidence_support_notes: plan.confidence_support_notes || null,
        source_window_days: sourceWindowDays,
        teacher_acknowledged: false,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Save error:", saveError);
      throw new Error("Failed to save intervention plan");
    }

    return new Response(
      JSON.stringify({
        success: true,
        plan: savedPlan,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in generate-intervention-plan:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
