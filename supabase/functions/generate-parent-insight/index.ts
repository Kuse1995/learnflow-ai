import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, createDemoPlaceholderResponse, createDemoSafeErrorResponse } from "../_shared/safety-validator.ts";

// Demo fallback insight
function getDemoFallbackInsight(studentFirstName: string) {
  return {
    summary_text: `${studentFirstName} is continuing to engage with classroom activities and building understanding across various topics. We appreciate your support at home!`,
    home_support_tips: [
      "Encourage regular reading for 15-20 minutes daily",
      "Celebrate effort and persistence, not just outcomes",
      "Ask open-ended questions about what they're learning",
    ],
    is_demo_generated: true,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const context = "generate-parent-insight";

  try {
    const { studentId, classId } = await req.json();

    if (!studentId || !classId) {
      console.log(`[${context}] Missing required fields`);
      return createDemoPlaceholderResponse({}, "Student and class information required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error(`[${context}] Missing Supabase configuration`);
      return createDemoPlaceholderResponse({}, "Database configuration not available");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch student info
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id, name")
      .eq("id", studentId)
      .single();

    if (studentError || !student) {
      console.error(`[${context}] Student fetch error:`, studentError);
      return createDemoPlaceholderResponse({}, "Student not found in demo data");
    }

    const studentFirstName = student.name.split(' ')[0];

    // Check for AI API key - use demo fallback if not available
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.log(`[${context}] LOVABLE_API_KEY not configured, using demo fallback`);
      
      const demoInsight = getDemoFallbackInsight(studentFirstName);
      
      const { data: savedSummary, error: saveError } = await supabase
        .from("parent_insight_summaries")
        .insert({
          student_id: studentId,
          class_id: classId,
          source_analysis_ids: [],
          summary_text: demoInsight.summary_text + " (Demo-generated)",
          home_support_tips: demoInsight.home_support_tips,
          teacher_approved: false,
        })
        .select()
        .single();

      if (saveError) {
        console.error(`[${context}] Demo insight save error:`, saveError);
        return createDemoPlaceholderResponse({ summary: demoInsight }, "Demo insight generated (not saved)");
      }

      return new Response(
        JSON.stringify({
          success: true,
          isDemoGenerated: true,
          message: "Demo insight generated - AI service not configured",
          summary: savedSummary,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch student learning profile
    const { data: learningProfile } = await supabase
      .from("student_learning_profiles")
      .select("*")
      .eq("student_id", studentId)
      .maybeSingle();

    // Fetch recent completed analyses
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

    // Fetch recent teacher actions
    const { data: teacherActions } = await supabase
      .from("teacher_action_logs")
      .select("action_taken, topic")
      .eq("class_id", classId)
      .order("created_at", { ascending: false })
      .limit(5);

    // Build context
    const analysisIds = analyses?.map(a => a.id) || [];
    const contextSummary = {
      hasLearningProfile: !!learningProfile,
      profileStrengths: learningProfile?.strengths || null,
      weakTopics: learningProfile?.weak_topics || [],
      confidenceTrend: learningProfile?.confidence_trend || "stable",
      recentTopicsWorkedOn: teacherActions?.map(a => a.topic).filter(Boolean) || [],
      hasAnalyses: analyses && analyses.length > 0,
    };

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

Student first name: ${studentFirstName}

Learning context:
- Areas of strength: ${contextSummary.profileStrengths || "developing across multiple areas"}
- Topics currently being practiced: ${contextSummary.weakTopics.length > 0 ? contextSummary.weakTopics.slice(0, 3).join(", ") : "various topics"}
- Confidence trend: ${contextSummary.confidenceTrend === "increasing" ? "growing confidence" : contextSummary.confidenceTrend === "declining" ? "may benefit from encouragement" : "steady engagement"}
- Recent class focus areas: ${contextSummary.recentTopicsWorkedOn.slice(0, 3).join(", ") || "ongoing curriculum topics"}

Remember: This summary will be read by the student's parent. Keep it warm, brief, and encouraging.`;

    console.log(`[${context}] Calling AI Gateway...`);

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
                  summary_text: { type: "string" },
                  home_support_tips: { type: "array", items: { type: "string" } },
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
      console.error(`[${context}] AI Gateway error:`, aiResponse.status);
      
      // Demo-safe: return fallback
      const demoInsight = getDemoFallbackInsight(studentFirstName);
      
      const { data: savedSummary } = await supabase
        .from("parent_insight_summaries")
        .insert({
          student_id: studentId,
          class_id: classId,
          source_analysis_ids: analysisIds,
          summary_text: demoInsight.summary_text + " (Demo-generated)",
          home_support_tips: demoInsight.home_support_tips,
          teacher_approved: false,
        })
        .select()
        .single();

      return new Response(
        JSON.stringify({
          success: true,
          isDemoGenerated: true,
          message: "Demo insight generated - AI service temporarily unavailable",
          summary: savedSummary || demoInsight,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error(`[${context}] Invalid AI response structure`);
      return createDemoSafeErrorResponse(new Error("Invalid AI response"), {}, context);
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
      console.error(`[${context}] Save error:`, saveError);
      return createDemoSafeErrorResponse(saveError, { summary: generatedSummary }, context);
    }

    return new Response(
      JSON.stringify({ success: true, summary: savedSummary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error(`[${context}] Error:`, error);
    return createDemoSafeErrorResponse(error, {}, context);
  }
});
