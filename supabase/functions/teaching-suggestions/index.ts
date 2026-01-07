import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { classId, uploadId } = await req.json();

    if (!classId) {
      return new Response(JSON.stringify({ error: "classId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Generating teaching suggestions for class: ${classId}`);

    // Fetch class info
    const { data: classData, error: classError } = await supabase
      .from("classes")
      .select("*")
      .eq("id", classId)
      .single();

    if (classError || !classData) {
      return new Response(JSON.stringify({ error: "Class not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch completed analyses for this class
    const { data: analyses, error: analysesError } = await supabase
      .from("upload_analyses")
      .select(`
        *,
        uploads!inner(subject, topic, upload_type, date)
      `)
      .eq("class_id", classId)
      .eq("status", "completed")
      .order("analyzed_at", { ascending: false })
      .limit(10);

    if (analysesError) throw analysesError;

    // If specific upload provided, filter to that one
    let relevantAnalyses = analyses || [];
    if (uploadId && relevantAnalyses.length > 0) {
      const specific = relevantAnalyses.find((a) => a.upload_id === uploadId);
      if (specific) {
        relevantAnalyses = [specific];
      }
    }

    // Fetch aggregated student learning profiles for this class
    const { data: students } = await supabase
      .from("students")
      .select("id")
      .eq("class_id", classId);

    const studentIds = students?.map((s) => s.id) || [];

    let profiles: any[] = [];
    if (studentIds.length > 0) {
      const { data: profileData } = await supabase
        .from("student_learning_profiles")
        .select("*")
        .in("student_id", studentIds);
      profiles = profileData || [];
    }

    // Fetch recent teacher action logs for context (last 5 entries)
    const { data: recentActions } = await supabase
      .from("teacher_action_logs")
      .select("topic, action_taken, created_at")
      .eq("class_id", classId)
      .order("created_at", { ascending: false })
      .limit(5);

    // Aggregate data for the AI
    const classSummaries = relevantAnalyses.map((a) => ({
      subject: a.uploads?.subject,
      topic: a.uploads?.topic,
      date: a.uploads?.date,
      common_errors: a.class_summary?.common_errors || [],
      topic_gaps: a.class_summary?.topic_gaps || [],
      overall_observations: a.class_summary?.overall_observations || "",
    }));

    // Aggregate error patterns across all profiles (without identifying students)
    const aggregatedPatterns = {
      conceptual: 0,
      procedural: 0,
      language: 0,
      careless: 0,
    };
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

    // Normalize to get averages
    const studentCount = profiles.length || 1;
    const avgPatterns = {
      conceptual: Math.round(aggregatedPatterns.conceptual / studentCount),
      procedural: Math.round(aggregatedPatterns.procedural / studentCount),
      language: Math.round(aggregatedPatterns.language / studentCount),
      careless: Math.round(aggregatedPatterns.careless / studentCount),
    };

    // Get subjects and topics from analyses
    const subjects = [...new Set(classSummaries.map((s) => s.subject).filter(Boolean))];
    const topics = [...new Set(classSummaries.flatMap((s) => [s.topic, ...s.topic_gaps]).filter(Boolean))];

    // Build context about recent teacher actions (topics only, no judgments)
    const recentActionTopics = recentActions?.filter((a) => a.topic).map((a) => a.topic) || [];
    const hasRecentActions = recentActions && recentActions.length > 0;

    // Build AI prompt with context-awareness
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
- Avoid repeating similar strategies unless offering a meaningful variation or extension
- Build upon prior instructional efforts rather than starting from scratch
- Do NOT critique, judge, or evaluate past actions
- Do NOT suggest what the teacher "should have" done
- Do NOT reference teacher reflections or observations
- Use prior actions only as background context to inform new suggestions` : ""}

Your role is to:
1. Identify instructional gaps affecting the class as a whole
2. Suggest practical teaching strategies
3. Provide alternative explanations or examples
4. Recommend practice activities
5. Offer pacing or sequencing suggestions if needed

Categories for suggestions:
- concept_clarification: Re-teaching approaches, alternative explanations, visual aids
- practice_reinforcement: Practice activities, worked examples, scaffolded exercises
- language_support: Vocabulary support, comprehension strategies, terminology clarification
- engagement_strategies: Active learning techniques, student involvement, motivation approaches`;

    // Build prior actions context block (neutral, no judgments)
    let priorActionsContext = "";
    if (hasRecentActions && recentActionTopics.length > 0) {
      priorActionsContext = `
Prior Instructional Context:
Recent instructional actions have been taken on the following topics: ${[...new Set(recentActionTopics)].join(", ")}.
Consider offering complementary strategies, variations, or next-step approaches rather than repeating similar interventions.
`;
    }

    const userPrompt = `Based on the following class data, provide teaching suggestions.

Class: ${classData.name} (Grade ${classData.grade || "N/A"}, Section ${classData.section || "N/A"})
Number of students: ${studentCount}

${subjects.length > 0 ? `Subjects covered: ${subjects.join(", ")}` : "No subject data available."}
${topics.length > 0 ? `Topics: ${topics.join(", ")}` : ""}
${priorActionsContext}
Recent Analysis Summaries:
${classSummaries.length > 0 
  ? classSummaries.map((s) => `
- Subject: ${s.subject || "Unknown"}, Topic: ${s.topic || "Unknown"}
  Common Errors: ${s.common_errors.length > 0 ? s.common_errors.join("; ") : "None identified"}
  Topic Gaps: ${s.topic_gaps.length > 0 ? s.topic_gaps.join("; ") : "None identified"}
  Observations: ${s.overall_observations || "No observations"}
`).join("\n")
  : "No completed analyses available yet."}

Aggregated Class Learning Patterns:
- Conceptual understanding issues: ${avgPatterns.conceptual > 5 ? "Significant" : avgPatterns.conceptual > 2 ? "Moderate" : "Low"}
- Procedural execution issues: ${avgPatterns.procedural > 5 ? "Significant" : avgPatterns.procedural > 2 ? "Moderate" : "Low"}
- Language/comprehension issues: ${avgPatterns.language > 5 ? "Significant" : avgPatterns.language > 2 ? "Moderate" : "Low"}
- Careless errors: ${avgPatterns.careless > 5 ? "Frequent" : avgPatterns.careless > 2 ? "Occasional" : "Rare"}

Commonly Weak Topics Across Class:
${allWeakTopics.size > 0 ? [...allWeakTopics].join(", ") : "No specific topics identified yet."}

Please provide teaching suggestions to help address these patterns. Focus on practical strategies the teacher can implement.`;

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
              name: "submit_teaching_suggestions",
              description: "Submit teaching strategy suggestions for the class",
              parameters: {
                type: "object",
                properties: {
                  subject: {
                    type: "string",
                    description: "Primary subject area these suggestions address",
                  },
                  topics: {
                    type: "array",
                    items: { type: "string" },
                    description: "Topics these suggestions relate to",
                  },
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        category: {
                          type: "string",
                          enum: ["concept_clarification", "practice_reinforcement", "language_support", "engagement_strategies"],
                        },
                        title: {
                          type: "string",
                          description: "Brief title for this suggestion",
                        },
                        description: {
                          type: "string",
                          description: "Explanation of why this strategy would help",
                        },
                        strategies: {
                          type: "array",
                          items: { type: "string" },
                          description: "Specific actionable strategies",
                        },
                      },
                      required: ["category", "title", "description", "strategies"],
                    },
                  },
                  pacing_notes: {
                    type: "string",
                    description: "Optional suggestions about pacing or sequencing adjustments",
                  },
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

    if (!toolCall || toolCall.function.name !== "submit_teaching_suggestions") {
      throw new Error("Invalid AI response format");
    }

    const result: TeachingSuggestionsResult = JSON.parse(toolCall.function.arguments);
    console.log("Teaching suggestions generated successfully");

    return new Response(
      JSON.stringify({
        success: true,
        class_name: classData.name,
        ...result,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Teaching suggestions error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to generate suggestions" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
