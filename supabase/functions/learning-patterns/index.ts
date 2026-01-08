import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, createDemoPlaceholderResponse, createDemoSafeErrorResponse } from "../_shared/safety-validator.ts";

interface LearningPatternsResult {
  insights: string[];
  data_coverage: {
    analyses_count: number;
    profiles_count: number;
    actions_count: number;
    earliest_date: string | null;
  };
}

// Demo fallback patterns
function getDemoFallbackPatterns(): { insights: string[]; data_coverage: LearningPatternsResult["data_coverage"] } {
  return {
    insights: [
      "Learning pattern analysis will be available once more class data is collected.",
      "Upload and analyze student work to see longitudinal insights here.",
    ],
    data_coverage: {
      analyses_count: 0,
      profiles_count: 0,
      actions_count: 0,
      earliest_date: null,
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const context = "learning-patterns";

  try {
    const { classId } = await req.json();

    if (!classId) {
      console.log(`[${context}] Missing classId`);
      return createDemoPlaceholderResponse(getDemoFallbackPatterns(), "Class ID is required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error(`[${context}] Missing Supabase configuration`);
      return createDemoPlaceholderResponse(getDemoFallbackPatterns(), "Database configuration not available");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[${context}] Generating learning patterns for class: ${classId}`);

    // Calculate 90-day window
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const dateThreshold = ninetyDaysAgo.toISOString();

    // Fetch completed analyses
    const { data: analyses, error: analysesError } = await supabase
      .from("upload_analyses")
      .select(`*, uploads!inner(subject, topic, date)`)
      .eq("class_id", classId)
      .eq("status", "completed")
      .gte("analyzed_at", dateThreshold)
      .order("analyzed_at", { ascending: true });

    if (analysesError) {
      console.error(`[${context}] Analyses fetch error:`, analysesError);
      return createDemoPlaceholderResponse(getDemoFallbackPatterns(), "Unable to fetch analysis data");
    }

    // Fetch students in class
    const { data: students } = await supabase
      .from("students")
      .select("id")
      .eq("class_id", classId);

    const studentIds = students?.map((s) => s.id) || [];

    // Fetch learning profiles
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
      .select("topic, created_at")
      .eq("class_id", classId)
      .gte("created_at", dateThreshold)
      .order("created_at", { ascending: true });

    // Build data coverage info
    const dataCoverage = {
      analyses_count: analyses?.length || 0,
      profiles_count: profiles.length,
      actions_count: recentActions?.length || 0,
      earliest_date: analyses?.[0]?.analyzed_at || null,
    };

    // If insufficient data, return early with minimal response
    if (!analyses || analyses.length < 2) {
      console.log(`[${context}] Insufficient data for pattern analysis`);
      return new Response(
        JSON.stringify({
          success: true,
          insights: ["Not enough data collected yet. Upload and analyze more student work to see patterns."],
          data_coverage: dataCoverage,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for AI API key
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      console.log(`[${context}] LOVABLE_API_KEY not configured, using demo response`);
      return new Response(
        JSON.stringify({
          success: true,
          isDemoGenerated: true,
          message: "AI service not configured",
          insights: ["Pattern analysis requires AI service configuration. Data is being collected."],
          data_coverage: dataCoverage,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Aggregate patterns for AI
    const analysisSummaries = analyses.map((a) => ({
      date: a.uploads?.date,
      subject: a.uploads?.subject,
      topic: a.uploads?.topic,
      common_errors: a.class_summary?.common_errors || [],
      topic_gaps: a.class_summary?.topic_gaps || [],
    }));

    const allTopics = [...new Set(analysisSummaries.flatMap((a) => [a.topic, ...a.topic_gaps]).filter(Boolean))];
    const actionTopics = [...new Set(recentActions?.filter((a) => a.topic).map((a) => a.topic) || [])];

    // Aggregate error patterns
    const aggregatedPatterns = { conceptual: 0, procedural: 0, language: 0, careless: 0 };
    profiles.forEach((p) => {
      if (p.error_patterns) {
        aggregatedPatterns.conceptual += p.error_patterns.conceptual || 0;
        aggregatedPatterns.procedural += p.error_patterns.procedural || 0;
        aggregatedPatterns.language += p.error_patterns.language || 0;
        aggregatedPatterns.careless += p.error_patterns.careless || 0;
      }
    });

    const systemPrompt = `You are an educational data analyst providing observational insights about classroom learning patterns over time.

CRITICAL RULES:
- Use ONLY observational, tentative language
- Do NOT use numbers, percentages, or specific counts
- Do NOT use success/failure or improvement/decline language
- Do NOT attribute changes to specific teacher actions
- Do NOT evaluate effectiveness of any interventions
- Do NOT mention individual students
- Keep insights brief (1-2 sentences each)
- Maximum 3-4 insights total
- Use phrases like "appears to", "may indicate", "seems to", "observations suggest"

TONE:
- Neutral and supportive
- Tentative, not definitive
- Descriptive, not evaluative`;

    const userPrompt = `Based on the following longitudinal class data, provide 3-4 brief observational insights about learning patterns over time.

Time Window: Last 90 days
Number of analyses available: ${analyses.length}
Topics observed: ${allTopics.join(", ") || "Various topics"}
${actionTopics.length > 0 ? `Topics with instructional attention: ${actionTopics.join(", ")}` : ""}

Aggregated error pattern observations:
- Conceptual: ${aggregatedPatterns.conceptual > 10 ? "Notable" : aggregatedPatterns.conceptual > 3 ? "Present" : "Limited"}
- Procedural: ${aggregatedPatterns.procedural > 10 ? "Notable" : aggregatedPatterns.procedural > 3 ? "Present" : "Limited"}
- Language: ${aggregatedPatterns.language > 10 ? "Notable" : aggregatedPatterns.language > 3 ? "Present" : "Limited"}
- Attention: ${aggregatedPatterns.careless > 10 ? "Notable" : aggregatedPatterns.careless > 3 ? "Present" : "Limited"}

Provide observational insights only. Do not evaluate or recommend.`;

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
              name: "submit_learning_patterns",
              description: "Submit observational insights about learning patterns",
              parameters: {
                type: "object",
                properties: {
                  insights: { type: "array", items: { type: "string" }, maxItems: 4 },
                },
                required: ["insights"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_learning_patterns" } },
      }),
    });

    if (!aiResponse.ok) {
      console.error(`[${context}] AI Gateway error:`, aiResponse.status);
      
      // Demo-safe: return placeholder
      return new Response(
        JSON.stringify({
          success: true,
          isDemoGenerated: true,
          message: "AI service temporarily unavailable",
          insights: ["Pattern analysis is being processed. Check back soon."],
          data_coverage: dataCoverage,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall || toolCall.function.name !== "submit_learning_patterns") {
      console.error(`[${context}] Invalid AI response format`);
      return createDemoSafeErrorResponse(new Error("Invalid AI response"), { data_coverage: dataCoverage }, context);
    }

    const result: { insights: string[] } = JSON.parse(toolCall.function.arguments);
    console.log(`[${context}] Learning patterns generated successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        insights: result.insights.slice(0, 4),
        data_coverage: dataCoverage,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`[${context}] Error:`, error);
    return createDemoSafeErrorResponse(error, getDemoFallbackPatterns(), context);
  }
});
