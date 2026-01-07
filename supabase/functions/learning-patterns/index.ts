import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LearningPatternsResult {
  insights: string[];
  data_coverage: {
    analyses_count: number;
    profiles_count: number;
    actions_count: number;
    earliest_date: string | null;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { classId } = await req.json();

    if (!classId) {
      return new Response(JSON.stringify({ error: "classId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Generating learning patterns for class: ${classId}`);

    // Calculate 90-day window
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const dateThreshold = ninetyDaysAgo.toISOString();

    // Fetch completed analyses within time window
    const { data: analyses, error: analysesError } = await supabase
      .from("upload_analyses")
      .select(`
        *,
        uploads!inner(subject, topic, date)
      `)
      .eq("class_id", classId)
      .eq("status", "completed")
      .gte("analyzed_at", dateThreshold)
      .order("analyzed_at", { ascending: true });

    if (analysesError) throw analysesError;

    // Fetch students in this class
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

    // Fetch recent teacher actions (for context awareness, not evaluation)
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
      return new Response(
        JSON.stringify({
          success: true,
          insights: [],
          data_coverage: dataCoverage,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Aggregate patterns for AI analysis
    const analysisSummaries = analyses.map((a) => ({
      date: a.uploads?.date,
      subject: a.uploads?.subject,
      topic: a.uploads?.topic,
      common_errors: a.class_summary?.common_errors || [],
      topic_gaps: a.class_summary?.topic_gaps || [],
    }));

    // Get unique topics from analyses
    const allTopics = [...new Set(analysisSummaries.flatMap((a) => [a.topic, ...a.topic_gaps]).filter(Boolean))];

    // Get topics from teacher actions (for context only)
    const actionTopics = [...new Set(recentActions?.filter((a) => a.topic).map((a) => a.topic) || [])];

    // Aggregate error patterns
    const aggregatedPatterns = {
      conceptual: 0,
      procedural: 0,
      language: 0,
      careless: 0,
    };

    profiles.forEach((p) => {
      if (p.error_patterns) {
        aggregatedPatterns.conceptual += p.error_patterns.conceptual || 0;
        aggregatedPatterns.procedural += p.error_patterns.procedural || 0;
        aggregatedPatterns.language += p.error_patterns.language || 0;
        aggregatedPatterns.careless += p.error_patterns.careless || 0;
      }
    });

    // Build AI prompt
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
- Descriptive, not evaluative

EXAMPLES OF GOOD INSIGHTS:
- "Focus areas appear to have shifted from foundational concepts toward application-based challenges."
- "Language-related observations seem relatively consistent across recent analyses."
- "Procedural understanding may be an emerging area of attention based on recent patterns."

EXAMPLES TO AVOID:
- "Performance has improved by 20%"
- "The teacher's intervention was successful"
- "Students are struggling with..."
- "Decline in conceptual understanding"`;

    const userPrompt = `Based on the following longitudinal class data, provide 3-4 brief observational insights about learning patterns over time.

Time Window: Last 90 days
Number of analyses available: ${analyses.length}

Topics observed across analyses: ${allTopics.join(", ") || "Various topics"}

${actionTopics.length > 0 ? `Topics where instructional attention has been documented: ${actionTopics.join(", ")}` : ""}

Aggregated error pattern observations:
- Conceptual understanding challenges: ${aggregatedPatterns.conceptual > 10 ? "Notable" : aggregatedPatterns.conceptual > 3 ? "Present" : "Limited"}
- Procedural execution challenges: ${aggregatedPatterns.procedural > 10 ? "Notable" : aggregatedPatterns.procedural > 3 ? "Present" : "Limited"}
- Language/comprehension challenges: ${aggregatedPatterns.language > 10 ? "Notable" : aggregatedPatterns.language > 3 ? "Present" : "Limited"}
- Attention-related patterns: ${aggregatedPatterns.careless > 10 ? "Notable" : aggregatedPatterns.careless > 3 ? "Present" : "Limited"}

Analysis timeline summary:
${analysisSummaries.slice(0, 5).map((a) => `- ${a.date}: ${a.subject || "Unknown"} / ${a.topic || "Unknown"}`).join("\n")}
${analyses.length > 5 ? `... and ${analyses.length - 5} more analyses` : ""}

Provide observational insights only. Do not evaluate or recommend.`;

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

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
              description: "Submit observational insights about learning patterns over time",
              parameters: {
                type: "object",
                properties: {
                  insights: {
                    type: "array",
                    items: { type: "string" },
                    description: "Array of 3-4 brief, observational insight statements",
                    maxItems: 4,
                  },
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
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall || toolCall.function.name !== "submit_learning_patterns") {
      throw new Error("Invalid AI response format");
    }

    const result: { insights: string[] } = JSON.parse(toolCall.function.arguments);
    console.log("Learning patterns generated successfully");

    return new Response(
      JSON.stringify({
        success: true,
        insights: result.insights.slice(0, 4), // Ensure max 4
        data_coverage: dataCoverage,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Learning patterns error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to generate patterns" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
