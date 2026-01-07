import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  classId: string;
  lessonTopic: string;
  lessonObjective: string;
  lessonDurationMinutes?: number;
}

interface LessonOutput {
  core_lesson_flow: string[];
  optional_variations: string[];
  extension_opportunities: string[];
  support_strategies: string[];
  materials_needed?: string[];
}

const SYSTEM_PROMPT = `You are an instructional design assistant supporting teachers with lesson differentiation.

Your role is to help create ONE unified lesson that naturally accommodates diverse learners through flexible design — NOT separate lesson tracks.

STRICT RULES:
- Produce ONE lesson, not multiple versions
- Do NOT group students by ability
- Do NOT use labels (advanced, struggling, weak, behind, gifted, low, high)
- Do NOT compare students
- Do NOT prescribe mandatory actions
- Do NOT reference specific students or ability groups
- Do NOT mention confidence levels or learning difficulties

LANGUAGE TO USE:
- "Optional variations"
- "Alternative explanations"
- "Flexible entry points"
- "Extension opportunities"
- "Scaffolded examples"
- "Multiple representations"
- "Choice-based activities"

Your output should help teachers prepare a lesson that is inherently flexible, not tracked.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: RequestBody = await req.json();
    const { classId, lessonTopic, lessonObjective, lessonDurationMinutes } = body;

    if (!classId || !lessonTopic || !lessonObjective) {
      return new Response(
        JSON.stringify({ error: "classId, lessonTopic, and lessonObjective are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch class info
    const { data: classData, error: classError } = await supabase
      .from("classes")
      .select("id, name, grade, section")
      .eq("id", classId)
      .maybeSingle();

    if (classError) {
      console.error("Error fetching class:", classError);
      throw new Error("Failed to fetch class information");
    }

    if (!classData) {
      return new Response(
        JSON.stringify({ error: "Class not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch student count for the class
    const { count: studentCount } = await supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("class_id", classId);

    // Get student IDs for this class first
    const { data: classStudents } = await supabase
      .from("students")
      .select("id")
      .eq("class_id", classId);

    const studentIds = classStudents?.map((s) => s.id) || [];

    // Fetch aggregated learning profile data (class-level patterns only, no individual references)
    const { data: learningProfiles } = await supabase
      .from("student_learning_profiles")
      .select("weak_topics, error_patterns, strengths")
      .in("student_id", studentIds);

    // Aggregate weak topics across the class
    const allWeakTopics: string[] = [];
    const allStrengths: string[] = [];
    const errorPatternCounts: Record<string, number> = {
      conceptual: 0,
      procedural: 0,
      careless: 0,
      language: 0,
    };

    if (learningProfiles) {
      for (const profile of learningProfiles) {
        if (profile.weak_topics) {
          allWeakTopics.push(...profile.weak_topics);
        }
        if (profile.strengths) {
          allStrengths.push(profile.strengths);
        }
        if (profile.error_patterns && typeof profile.error_patterns === "object") {
          const patterns = profile.error_patterns as Record<string, number>;
          for (const key of Object.keys(errorPatternCounts)) {
            if (patterns[key]) {
              errorPatternCounts[key] += patterns[key];
            }
          }
        }
      }
    }

    // Get unique topics that appear more than once (common patterns)
    const topicCounts: Record<string, number> = {};
    allWeakTopics.forEach((t) => {
      topicCounts[t] = (topicCounts[t] || 0) + 1;
    });
    const commonChallenges = Object.entries(topicCounts)
      .filter(([_, count]) => count > 1)
      .map(([topic]) => topic)
      .slice(0, 5);

    // Determine predominant error patterns
    const predominantPatterns = Object.entries(errorPatternCounts)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([pattern]) => pattern);

    // Fetch recent adaptive support plan themes (class-level aggregation)
    const { data: supportPlans } = await supabase
      .from("student_intervention_plans")
      .select("focus_areas, support_strategies")
      .eq("class_id", classId)
      .order("generated_at", { ascending: false })
      .limit(10);

    const commonFocusAreas: string[] = [];
    const commonStrategies: string[] = [];
    if (supportPlans) {
      for (const plan of supportPlans) {
        commonFocusAreas.push(...(plan.focus_areas || []));
        commonStrategies.push(...(plan.support_strategies || []));
      }
    }
    const uniqueFocusAreas = [...new Set(commonFocusAreas)].slice(0, 5);
    const uniqueStrategies = [...new Set(commonStrategies)].slice(0, 5);

    // Fetch recent teaching actions
    const { data: recentActions } = await supabase
      .from("teacher_action_logs")
      .select("topic, action_taken")
      .eq("class_id", classId)
      .order("created_at", { ascending: false })
      .limit(5);

    // Build context for AI (class-level only, no individual references)
    const classContext = {
      className: classData.name,
      grade: classData.grade,
      section: classData.section,
      studentCount: studentCount || 0,
      commonChallengeAreas: commonChallenges,
      predominantErrorTypes: predominantPatterns,
      recentFocusAreas: uniqueFocusAreas,
      strategiesUsed: uniqueStrategies,
      recentTeachingActions: recentActions?.map((a) => ({
        topic: a.topic,
        action: a.action_taken,
      })) || [],
    };

    const userPrompt = `Design a differentiated lesson for the following:

CLASS CONTEXT:
- Class: ${classContext.className}${classContext.grade ? ` (Grade ${classContext.grade})` : ""}
- Number of students: ${classContext.studentCount}
${classContext.commonChallengeAreas.length > 0 ? `- Topics that may need additional scaffolding: ${classContext.commonChallengeAreas.join(", ")}` : ""}
${classContext.predominantErrorTypes.length > 0 ? `- Common error patterns observed: ${classContext.predominantErrorTypes.join(", ")}` : ""}
${classContext.recentFocusAreas.length > 0 ? `- Recent instructional focus areas: ${classContext.recentFocusAreas.join(", ")}` : ""}
${classContext.recentTeachingActions.length > 0 ? `- Recent teaching actions: ${classContext.recentTeachingActions.map((a) => a.topic || a.action).join(", ")}` : ""}

LESSON REQUEST:
- Topic: ${lessonTopic}
- Objective: ${lessonObjective}
${lessonDurationMinutes ? `- Duration: ${lessonDurationMinutes} minutes` : ""}

Please design ONE flexible lesson that accommodates diverse learners through built-in variations and scaffolding.`;

    console.log("Calling Lovable AI Gateway for lesson differentiation...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_differentiated_lesson",
              description: "Create a differentiated lesson plan with flexible components",
              parameters: {
                type: "object",
                properties: {
                  core_lesson_flow: {
                    type: "array",
                    items: { type: "string" },
                    description: "Main lesson steps that all learners will experience",
                  },
                  optional_variations: {
                    type: "array",
                    items: { type: "string" },
                    description: "Alternative ways to present or practice concepts",
                  },
                  extension_opportunities: {
                    type: "array",
                    items: { type: "string" },
                    description: "Opportunities for deeper exploration",
                  },
                  support_strategies: {
                    type: "array",
                    items: { type: "string" },
                    description: "Scaffolding strategies teachers can use flexibly",
                  },
                  materials_needed: {
                    type: "array",
                    items: { type: "string" },
                    description: "Materials required for the lesson",
                  },
                },
                required: [
                  "core_lesson_flow",
                  "optional_variations",
                  "extension_opportunities",
                  "support_strategies",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_differentiated_lesson" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      throw new Error("AI service error");
    }

    const aiData = await aiResponse.json();
    console.log("AI response received");

    // Extract tool call result
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "create_differentiated_lesson") {
      console.error("Unexpected AI response format:", JSON.stringify(aiData));
      throw new Error("Failed to generate lesson structure");
    }

    const lessonOutput: LessonOutput = JSON.parse(toolCall.function.arguments);

    // Save to database
    const { data: savedLesson, error: saveError } = await supabase
      .from("lesson_differentiation_suggestions")
      .insert({
        class_id: classId,
        lesson_topic: lessonTopic,
        lesson_objective: lessonObjective,
        lesson_duration_minutes: lessonDurationMinutes || null,
        core_lesson_flow: lessonOutput.core_lesson_flow,
        optional_variations: lessonOutput.optional_variations,
        extension_opportunities: lessonOutput.extension_opportunities,
        support_strategies: lessonOutput.support_strategies,
        materials_needed: lessonOutput.materials_needed || [],
        teacher_accepted: false,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Error saving lesson:", saveError);
      throw new Error("Failed to save lesson suggestion");
    }

    console.log("Lesson differentiation suggestion saved:", savedLesson.id);

    return new Response(
      JSON.stringify({ success: true, lesson: savedLesson }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-differentiated-lesson:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
