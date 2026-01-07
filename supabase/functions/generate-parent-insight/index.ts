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
    const { studentId, classId } = await req.json();

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

    // Fetch student learning profile
    const { data: learningProfile } = await supabase
      .from("student_learning_profiles")
      .select("*")
      .eq("student_id", studentId)
      .maybeSingle();

    // Fetch recent completed analyses for this class
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: analyses } = await supabase
      .from("upload_analyses")
      .select("id, class_summary, student_diagnostics, analyzed_at")
      .eq("class_id", classId)
      .eq("status", "completed")
      .gte("analyzed_at", ninetyDaysAgo.toISOString())
      .order("analyzed_at", { ascending: false })
      .limit(5);

    // Fetch recent teacher actions for context
    const { data: teacherActions } = await supabase
      .from("teacher_action_logs")
      .select("action_taken, topic")
      .eq("class_id", classId)
      .order("created_at", { ascending: false })
      .limit(5);

    // Build context for AI
    const analysisIds = analyses?.map(a => a.id) || [];
    
    // Extract student-specific diagnostics from analyses
    const studentDiagnostics: any[] = [];
    analyses?.forEach(analysis => {
      const diagnostics = analysis.student_diagnostics as any[];
      if (diagnostics) {
        const studentData = diagnostics.find((d: any) => d.student_id === studentId);
        if (studentData) {
          studentDiagnostics.push(studentData);
        }
      }
    });

    // Prepare AI context (sanitized, no raw data exposed)
    const contextSummary = {
      hasLearningProfile: !!learningProfile,
      profileStrengths: learningProfile?.strengths || null,
      weakTopics: learningProfile?.weak_topics || [],
      confidenceTrend: learningProfile?.confidence_trend || "stable",
      recentTopicsWorkedOn: teacherActions?.map(a => a.topic).filter(Boolean) || [],
      hasAnalyses: studentDiagnostics.length > 0,
    };

    // System prompt with strict language rules
    const systemPrompt = `You are a parent communication specialist. Your role is to translate internal learning observations into warm, supportive summaries for parents.

CRITICAL LANGUAGE RULES:
- Use ONLY positive, neutral, or growth-oriented phrasing
- NEVER name subjects as "weak" or "struggling"
- NEVER mention mistakes, errors, or failures
- NEVER imply the child is lagging behind peers
- NEVER use technical or academic jargon
- NEVER mention AI, analysis, diagnostics, or algorithms

APPROVED PHRASES:
- "currently developing skills in..."
- "benefiting from continued practice with..."
- "showing engagement with..."
- "building understanding of..."
- "exploring..."
- "growing confidence in..."

OUTPUT STRUCTURE:
1. summary_text: A short paragraph (2-3 sentences max) that is warm and encouraging
2. home_support_tips: Optional array of 1-3 simple, actionable tips for parents (or empty array if not applicable)

TONE: Warm, supportive, encouraging, accessible to all parents regardless of education background.`;

    const userPrompt = `Generate a parent-safe summary for a student based on these observations:

Student first name: ${student.name.split(' ')[0]}

Learning context:
- Areas of strength: ${contextSummary.profileStrengths || "developing across multiple areas"}
- Topics currently being practiced: ${contextSummary.weakTopics.length > 0 ? contextSummary.weakTopics.slice(0, 3).join(", ") : "various topics"}
- Confidence trend: ${contextSummary.confidenceTrend === "increasing" ? "growing confidence" : contextSummary.confidenceTrend === "declining" ? "may benefit from encouragement" : "steady engagement"}
- Recent class focus areas: ${contextSummary.recentTopicsWorkedOn.slice(0, 3).join(", ") || "ongoing curriculum topics"}

Remember: This summary will be read by the student's parent. Keep it warm, brief, and encouraging.`;

    // Call AI to generate summary
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
              name: "submit_parent_summary",
              description: "Submit the parent-friendly summary",
              parameters: {
                type: "object",
                properties: {
                  summary_text: {
                    type: "string",
                    description: "A warm, encouraging 2-3 sentence summary for parents",
                  },
                  home_support_tips: {
                    type: "array",
                    items: { type: "string" },
                    description: "1-3 simple, actionable tips for home support (optional)",
                  },
                },
                required: ["summary_text"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_parent_summary" } },
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

    const generatedSummary = JSON.parse(toolCall.function.arguments);

    // Save to database as draft
    const { data: savedSummary, error: saveError } = await supabase
      .from("parent_insight_summaries")
      .insert({
        student_id: studentId,
        class_id: classId,
        source_analysis_ids: analysisIds,
        summary_text: generatedSummary.summary_text,
        home_support_tips: generatedSummary.home_support_tips || [],
        teacher_approved: false,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Save error:", saveError);
      throw new Error("Failed to save summary");
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: savedSummary,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in generate-parent-insight:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
