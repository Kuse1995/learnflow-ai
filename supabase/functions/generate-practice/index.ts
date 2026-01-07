import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PracticeActivity {
  type: "guided_example" | "try_it" | "explain" | "visual_match" | "reflection";
  content: string;
  prompt: string;
  hint?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { studentId, classId } = await req.json();

    if (!studentId || !classId) {
      return new Response(
        JSON.stringify({ error: "studentId and classId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch adaptive support plan for focus areas (no student profile exposure)
    const { data: supportPlan } = await supabase
      .from("student_intervention_plans")
      .select("focus_areas, support_strategies")
      .eq("student_id", studentId)
      .eq("class_id", classId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch recent lesson topics for context
    const { data: recentLessons } = await supabase
      .from("lesson_differentiation_suggestions")
      .select("lesson_topic, lesson_objective, support_strategies")
      .eq("class_id", classId)
      .order("created_at", { ascending: false })
      .limit(3);

    // Fetch recent class uploads for topic context
    const { data: recentUploads } = await supabase
      .from("uploads")
      .select("topic, subject")
      .eq("class_id", classId)
      .order("created_at", { ascending: false })
      .limit(5);

    // Build context for AI (no scores, no student profile details)
    const focusAreas = supportPlan?.focus_areas || [];
    const supportStrategies = supportPlan?.support_strategies || [];
    const lessonTopics = recentLessons?.map(l => l.lesson_topic) || [];
    const classTopics = recentUploads?.map(u => u.topic) || [];

    // Select 1-2 focus areas randomly
    const selectedFocusAreas = focusAreas.length > 0 
      ? focusAreas.slice(0, Math.min(2, focusAreas.length))
      : classTopics.slice(0, Math.min(2, classTopics.length));

    // Get lesson context
    const lessonContext = recentLessons?.[0]?.lesson_objective || 
      `Exploring concepts related to ${selectedFocusAreas.join(" and ") || "recent class topics"}`;

    // Build the AI prompt
    const systemPrompt = `You are a friendly, encouraging practice assistant for students.
Your role is to create supportive, low-pressure practice activities.

CRITICAL RULES:
- NEVER use words like "difficulty", "level", "weakness", "mistakes", "wrong", "correct", "score", "grade"
- NEVER indicate right/wrong answers
- Use encouraging, growth-focused language
- Keep activities simple and calming
- No timers, no pressure
- Use phrases like:
  - "Here's another way to think about it"
  - "Let's explore this together"
  - "Thanks for giving that a go"
  - "What do you think?"

Create practice activities that feel like gentle exploration, not testing.`;

    const userPrompt = `Create 3-5 practice activities for a student.

Focus areas to explore: ${selectedFocusAreas.length > 0 ? selectedFocusAreas.join(", ") : "general review"}
Lesson context: ${lessonContext}
Support approaches to use: ${supportStrategies.slice(0, 3).join("; ") || "guided examples, visual aids"}

Generate a mix of these activity types:
1. guided_example - Walk through an example step by step
2. try_it - A single simple prompt for the student to try
3. explain - Ask the student to explain a concept in their own words
4. visual_match - Match or order items visually
5. reflection - A gentle reflection question about learning

For each activity, provide:
- type: one of the activity types above
- content: the main content/context for the activity
- prompt: what the student should do or think about
- hint: an optional supportive hint (encouraging, not giving away answers)

Remember: This is practice for exploration and growth, not assessment.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating practice activities for student:", studentId);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              name: "create_practice_activities",
              description: "Create a set of student-friendly practice activities",
              parameters: {
                type: "object",
                properties: {
                  welcome_message: {
                    type: "string",
                    description: "A warm, encouraging welcome message for the student",
                  },
                  activities: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: {
                          type: "string",
                          enum: ["guided_example", "try_it", "explain", "visual_match", "reflection"],
                        },
                        content: { type: "string" },
                        prompt: { type: "string" },
                        hint: { type: "string" },
                      },
                      required: ["type", "content", "prompt"],
                    },
                  },
                  closing_message: {
                    type: "string",
                    description: "A gentle closing message for when the session ends",
                  },
                },
                required: ["welcome_message", "activities", "closing_message"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_practice_activities" } },
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Practice generation is busy. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Service temporarily unavailable. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log("AI response received");

    // Extract the tool call result
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("No practice activities generated");
    }

    const practiceData = JSON.parse(toolCall.function.arguments);

    console.log("Practice session generated with", practiceData.activities?.length, "activities");

    return new Response(
      JSON.stringify({
        success: true,
        welcomeMessage: practiceData.welcome_message || "Let's explore today's practice together.",
        activities: practiceData.activities || [],
        closingMessage: practiceData.closing_message || "You can come back anytime. Great job today!",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating practice:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate practice activities";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
