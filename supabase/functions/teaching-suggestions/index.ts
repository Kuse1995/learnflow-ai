import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, createDemoPlaceholderResponse, createDemoSafeErrorResponse } from "../_shared/safety-validator.ts";

interface TeachingSuggestion {
  category: "concept_clarification" | "practice_reinforcement" | "language_support" | "engagement_strategies";
  title: string;
  description: string;
  strategies: string[];
}

interface TeachingSuggestionsResult {
  subject: string;
  topics: string[];
  suggestions: TeachingSuggestion[];
  pacing_notes: string | null;
}

// Demo fallback suggestions
function getDemoFallbackSuggestions(): TeachingSuggestionsResult {
  return {
    subject: "General",
    topics: ["Demo topic"],
    suggestions: [
      {
        category: "concept_clarification",
        title: "Demo Suggestion",
        description: "Teaching suggestions will be generated based on class analysis data.",
        strategies: [
          "Upload and analyze student work to receive personalized suggestions",
          "The AI will consider class-wide patterns to provide relevant strategies",
        ],
      },
    ],
    pacing_notes: "Suggestions are generated based on accumulated class data.",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const context = "teaching-suggestions";

  try {
    const { classId, uploadId } = await req.json();

    if (!classId) {
      console.log(`[${context}] Missing classId`);
      return createDemoPlaceholderResponse({ ...getDemoFallbackSuggestions() }, "Class ID is required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error(`[${context}] Missing Supabase configuration`);
      return createDemoPlaceholderResponse({ ...getDemoFallbackSuggestions() }, "Database configuration not available");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[${context}] Generating teaching suggestions for class: ${classId}`);

    // Fetch class info
    const { data: classData, error: classError } = await supabase
      .from("classes")
      .select("*")
      .eq("id", classId)
      .single();

    if (classError || !classData) {
      console.error(`[${context}] Class not found:`, classError);
      return createDemoPlaceholderResponse({ ...getDemoFallbackSuggestions() }, "Class not found");
    }

    // Fetch completed analyses
    const { data: analyses, error: analysesError } = await supabase
      .from("upload_analyses")
      .select(`*, uploads!inner(subject, topic, upload_type, date)`)
      .eq("class_id", classId)
      .eq("status", "completed")
      .order("analyzed_at", { ascending: false })
      .limit(10);

    if (analysesError) {
      console.error(`[${context}] Analyses fetch error:`, analysesError);
    }

    let relevantAnalyses = analyses || [];
    if (uploadId && relevantAnalyses.length > 0) {
      const specific = relevantAnalyses.find((a) => a.upload_id === uploadId);
      if (specific) relevantAnalyses = [specific];
    }

    // Fetch student learning profiles
    const { data: students } = await supabase.from("students").select("id").eq("class_id", classId);
    const studentIds = students?.map((s) => s.id) || [];

    let profiles: any[] = [];
    if (studentIds.length > 0) {
      const { data: profileData } = await supabase
        .from("student_learning_profiles")
        .select("*")
        .in("student_id", studentIds);
      profiles = profileData || [];
    }

    // Fetch recent teacher actions
    const { data: recentActions } = await supabase
      .from("teacher_action_logs")
      .select("topic, action_taken, created_at")
      .eq("class_id", classId)
      .order("created_at", { ascending: false })
      .limit(5);

    // Check for AI API key
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      console.log(`[${context}] LOVABLE_API_KEY not configured, using demo fallback`);
      return new Response(
        JSON.stringify({
          success: true,
          isDemoGenerated: true,
          message: "AI service not configured",
          class_name: classData.name,
          ...getDemoFallbackSuggestions(),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Aggregate data
    const classSummaries = relevantAnalyses.map((a) => ({
      subject: a.uploads?.subject,
      topic: a.uploads?.topic,
      date: a.uploads?.date,
      common_errors: a.class_summary?.common_errors || [],
      topic_gaps: a.class_summary?.topic_gaps || [],
      overall_observations: a.class_summary?.overall_observations || "",
    }));

    const aggregatedPatterns = { conceptual: 0, procedural: 0, language: 0, careless: 0 };
    const allWeakTopics = new Set<string>();

    profiles.forEach((p) => {
      if (p.error_patterns) {
        aggregatedPatterns.conceptual += p.error_patterns.conceptual || 0;
        aggregatedPatterns.procedural += p.error_patterns.procedural || 0;
        aggregatedPatterns.language += p.error_patterns.language || 0;
        aggregatedPatterns.careless += p.error_patterns.careless || 0;
      }
      (p.weak_topics || []).forEach((t: string) => allWeakTopics.add(t));
    });

    const studentCount = profiles.length || 1;
    const avgPatterns = {
      conceptual: Math.round(aggregatedPatterns.conceptual / studentCount),
      procedural: Math.round(aggregatedPatterns.procedural / studentCount),
      language: Math.round(aggregatedPatterns.language / studentCount),
      careless: Math.round(aggregatedPatterns.careless / studentCount),
    };

    const subjects = [...new Set(classSummaries.map((s) => s.subject).filter(Boolean))];
    const topics = [...new Set(classSummaries.flatMap((s) => [s.topic, ...s.topic_gaps]).filter(Boolean))];
    const recentActionTopics = recentActions?.filter((a) => a.topic).map((a) => a.topic) || [];
    const hasRecentActions = recentActions && recentActions.length > 0;

    const systemPrompt = `You are an experienced instructional coach helping teachers improve their teaching effectiveness.

IMPORTANT RULES:
- Do NOT mention individual students by name
- Do NOT reference specific student confidence trends
- Do NOT suggest labeling or grouping students
- Do NOT generate detailed lesson plans
- Keep suggestions optional and flexible, not prescriptive
- Focus on actionable teaching strategies
${hasRecentActions ? `
CONTEXT-AWARENESS RULES:
- The teacher has already taken some instructional actions recently
- Avoid repeating similar strategies
- Build upon prior instructional efforts
- Do NOT critique or evaluate past actions` : ""}

Categories for suggestions:
- concept_clarification: Re-teaching approaches, alternative explanations, visual aids
- practice_reinforcement: Practice activities, worked examples, scaffolded exercises
- language_support: Vocabulary support, comprehension strategies
- engagement_strategies: Active learning techniques, student involvement`;

    let priorActionsContext = "";
    if (hasRecentActions && recentActionTopics.length > 0) {
      priorActionsContext = `
Prior Instructional Context:
Recent instructional actions on topics: ${[...new Set(recentActionTopics)].join(", ")}.
Consider complementary strategies rather than repeating similar interventions.`;
    }

    const userPrompt = `Based on the following class data, provide teaching suggestions.

Class: ${classData.name} (Grade ${classData.grade || "N/A"}, Section ${classData.section || "N/A"})
Number of students: ${studentCount}

${subjects.length > 0 ? `Subjects: ${subjects.join(", ")}` : "No subject data available."}
${topics.length > 0 ? `Topics: ${topics.join(", ")}` : ""}
${priorActionsContext}

Aggregated Class Learning Patterns:
- Conceptual: ${avgPatterns.conceptual > 5 ? "Significant" : avgPatterns.conceptual > 2 ? "Moderate" : "Low"}
- Procedural: ${avgPatterns.procedural > 5 ? "Significant" : avgPatterns.procedural > 2 ? "Moderate" : "Low"}
- Language: ${avgPatterns.language > 5 ? "Significant" : avgPatterns.language > 2 ? "Moderate" : "Low"}
- Careless: ${avgPatterns.careless > 5 ? "Frequent" : avgPatterns.careless > 2 ? "Occasional" : "Rare"}

Common Topics: ${allWeakTopics.size > 0 ? [...allWeakTopics].join(", ") : "No specific topics identified yet."}

Provide practical teaching strategies.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
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
              name: "submit_teaching_suggestions",
              description: "Submit teaching strategy suggestions",
              parameters: {
                type: "object",
                properties: {
                  subject: { type: "string" },
                  topics: { type: "array", items: { type: "string" } },
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        category: { type: "string", enum: ["concept_clarification", "practice_reinforcement", "language_support", "engagement_strategies"] },
                        title: { type: "string" },
                        description: { type: "string" },
                        strategies: { type: "array", items: { type: "string" } },
                      },
                      required: ["category", "title", "description", "strategies"],
                    },
                  },
                  pacing_notes: { type: "string" },
                },
                required: ["subject", "topics", "suggestions"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_teaching_suggestions" } },
      }),
    });

    if (!aiResponse.ok) {
      console.error(`[${context}] AI Gateway error:`, aiResponse.status);
      
      // Demo-safe: return fallback
      return new Response(
        JSON.stringify({
          success: true,
          isDemoGenerated: true,
          message: "AI service temporarily unavailable",
          class_name: classData.name,
          ...getDemoFallbackSuggestions(),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall || toolCall.function.name !== "submit_teaching_suggestions") {
      console.error(`[${context}] Invalid AI response format`);
      return createDemoSafeErrorResponse(new Error("Invalid AI response"), { class_name: classData.name }, context);
    }

    const result: TeachingSuggestionsResult = JSON.parse(toolCall.function.arguments);
    console.log(`[${context}] Teaching suggestions generated successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        class_name: classData.name,
        informed_by_prior_actions: hasRecentActions && recentActionTopics.length > 0,
        ...result,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`[${context}] Error:`, error);
    return createDemoSafeErrorResponse(error, { ...getDemoFallbackSuggestions() }, context);
  }
});
