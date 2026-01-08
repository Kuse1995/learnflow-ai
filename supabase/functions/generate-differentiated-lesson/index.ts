import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, createDemoPlaceholderResponse, createDemoSafeErrorResponse } from "../_shared/safety-validator.ts";

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

// Demo fallback lesson
function getDemoFallbackLesson(topic: string, objective: string): LessonOutput {
  return {
    core_lesson_flow: [
      `Introduction: Review prior knowledge related to ${topic}`,
      "Main activity: Guided exploration with varied entry points",
      "Practice: Individual and partner work with flexible pacing",
      "Closure: Share observations and key takeaways",
    ],
    optional_variations: [
      "Use visual representations alongside verbal explanations",
      "Provide manipulatives for hands-on learners",
      "Offer choice in how students demonstrate understanding",
    ],
    extension_opportunities: [
      "Connect concepts to real-world applications",
      "Encourage students to create their own examples",
    ],
    support_strategies: [
      "Provide step-by-step scaffolds for complex tasks",
      "Use think-alouds to model problem-solving",
      "Offer multiple representations of key concepts",
    ],
    materials_needed: ["Demo-generated - customize based on your classroom resources"],
  };
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

  const context = "generate-differentiated-lesson";

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error(`[${context}] Missing Supabase configuration`);
      return createDemoPlaceholderResponse({}, "Database configuration not available");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: RequestBody = await req.json();
    const { classId, lessonTopic, lessonObjective, lessonDurationMinutes } = body;

    if (!classId || !lessonTopic || !lessonObjective) {
      console.log(`[${context}] Missing required fields`);
      return createDemoPlaceholderResponse({}, "Please provide class, topic, and objective");
    }

    // Fetch class info
    const { data: classData, error: classError } = await supabase
      .from("classes")
      .select("id, name, grade, section")
      .eq("id", classId)
      .maybeSingle();

    if (classError || !classData) {
      console.error(`[${context}] Class not found:`, classError);
      return createDemoPlaceholderResponse({}, "Class not found in demo data");
    }

    // Check for AI API key - use demo fallback if not available
    if (!LOVABLE_API_KEY) {
      console.log(`[${context}] LOVABLE_API_KEY not configured, using demo fallback`);
      
      const demoLesson = getDemoFallbackLesson(lessonTopic, lessonObjective);
      
      const { data: savedLesson, error: saveError } = await supabase
        .from("lesson_differentiation_suggestions")
        .insert({
          class_id: classId,
          lesson_topic: lessonTopic,
          lesson_objective: lessonObjective,
          lesson_duration_minutes: lessonDurationMinutes || null,
          core_lesson_flow: demoLesson.core_lesson_flow,
          optional_variations: demoLesson.optional_variations,
          extension_opportunities: demoLesson.extension_opportunities,
          support_strategies: demoLesson.support_strategies,
          materials_needed: demoLesson.materials_needed || [],
          teacher_accepted: false,
        })
        .select()
        .single();

      if (saveError) {
        console.error(`[${context}] Demo lesson save error:`, saveError);
        return createDemoPlaceholderResponse({ lesson: demoLesson }, "Demo lesson generated (not saved)");
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          isDemoGenerated: true,
          message: "Demo lesson generated - AI service not configured",
          lesson: savedLesson 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch student count
    const { count: studentCount } = await supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("class_id", classId);

    // Get student IDs for this class
    const { data: classStudents } = await supabase
      .from("students")
      .select("id")
      .eq("class_id", classId);

    const studentIds = classStudents?.map((s) => s.id) || [];

    // Fetch aggregated learning profile data
    const { data: learningProfiles } = await supabase
      .from("student_learning_profiles")
      .select("weak_topics, error_patterns, strengths")
      .in("student_id", studentIds);

    // Aggregate data
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
        if (profile.weak_topics) allWeakTopics.push(...profile.weak_topics);
        if (profile.strengths) allStrengths.push(profile.strengths);
        if (profile.error_patterns && typeof profile.error_patterns === "object") {
          const patterns = profile.error_patterns as Record<string, number>;
          for (const key of Object.keys(errorPatternCounts)) {
            if (patterns[key]) errorPatternCounts[key] += patterns[key];
          }
        }
      }
    }

    // Get common challenges
    const topicCounts: Record<string, number> = {};
    allWeakTopics.forEach((t) => {
      topicCounts[t] = (topicCounts[t] || 0) + 1;
    });
    const commonChallenges = Object.entries(topicCounts)
      .filter(([_, count]) => count > 1)
      .map(([topic]) => topic)
      .slice(0, 5);

    const predominantPatterns = Object.entries(errorPatternCounts)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([pattern]) => pattern);

    // Build context
    const classContext = {
      className: classData.name,
      grade: classData.grade,
      section: classData.section,
      studentCount: studentCount || 0,
      commonChallengeAreas: commonChallenges,
      predominantErrorTypes: predominantPatterns,
    };

    const userPrompt = `Design a differentiated lesson for the following:

CLASS CONTEXT:
- Class: ${classContext.className}${classContext.grade ? ` (Grade ${classContext.grade})` : ""}
- Number of students: ${classContext.studentCount}
${classContext.commonChallengeAreas.length > 0 ? `- Topics that may need additional scaffolding: ${classContext.commonChallengeAreas.join(", ")}` : ""}
${classContext.predominantErrorTypes.length > 0 ? `- Common error patterns observed: ${classContext.predominantErrorTypes.join(", ")}` : ""}

LESSON REQUEST:
- Topic: ${lessonTopic}
- Objective: ${lessonObjective}
${lessonDurationMinutes ? `- Duration: ${lessonDurationMinutes} minutes` : ""}

Please design ONE flexible lesson that accommodates diverse learners through built-in variations and scaffolding.`;

    console.log(`[${context}] Calling AI Gateway for lesson differentiation...`);

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
                  core_lesson_flow: { type: "array", items: { type: "string" } },
                  optional_variations: { type: "array", items: { type: "string" } },
                  extension_opportunities: { type: "array", items: { type: "string" } },
                  support_strategies: { type: "array", items: { type: "string" } },
                  materials_needed: { type: "array", items: { type: "string" } },
                },
                required: ["core_lesson_flow", "optional_variations", "extension_opportunities", "support_strategies"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_differentiated_lesson" } },
      }),
    });

    if (!aiResponse.ok) {
      console.error(`[${context}] AI Gateway error:`, aiResponse.status);
      
      // Demo-safe: return fallback instead of error
      const demoLesson = getDemoFallbackLesson(lessonTopic, lessonObjective);
      
      const { data: savedLesson } = await supabase
        .from("lesson_differentiation_suggestions")
        .insert({
          class_id: classId,
          lesson_topic: lessonTopic,
          lesson_objective: lessonObjective,
          lesson_duration_minutes: lessonDurationMinutes || null,
          core_lesson_flow: demoLesson.core_lesson_flow,
          optional_variations: demoLesson.optional_variations,
          extension_opportunities: demoLesson.extension_opportunities,
          support_strategies: demoLesson.support_strategies,
          materials_needed: demoLesson.materials_needed || [],
          teacher_accepted: false,
        })
        .select()
        .single();

      return new Response(
        JSON.stringify({ 
          success: true, 
          isDemoGenerated: true,
          message: "Demo lesson generated - AI service temporarily unavailable",
          lesson: savedLesson || demoLesson 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    console.log(`[${context}] AI response received`);

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "create_differentiated_lesson") {
      console.error(`[${context}] Unexpected AI response format`);
      return createDemoSafeErrorResponse(new Error("Invalid AI response"), {}, context);
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
      console.error(`[${context}] Error saving lesson:`, saveError);
      return createDemoSafeErrorResponse(saveError, { lesson: lessonOutput }, context);
    }

    console.log(`[${context}] Lesson saved:`, savedLesson.id);

    return new Response(
      JSON.stringify({ success: true, lesson: savedLesson }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`[${context}] Error:`, error);
    return createDemoSafeErrorResponse(error, {}, context);
  }
});
