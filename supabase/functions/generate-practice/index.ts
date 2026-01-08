import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, createDemoPlaceholderResponse, createDemoSafeErrorResponse } from "../_shared/safety-validator.ts";

interface PracticeActivity {
  type: "guided_example" | "try_it" | "explain" | "visual_match" | "reflection";
  content: string;
  prompt: string;
  hint?: string;
}

// Demo fallback practice
function getDemoFallbackPractice(): {
  welcome_message: string;
  activities: PracticeActivity[];
  closing_message: string;
} {
  return {
    welcome_message: "Welcome! Let's explore some learning activities together. Take your time - there's no rush!",
    activities: [
      {
        type: "guided_example",
        content: "This is a sample guided activity. In the full version, activities will be personalized based on your class topics.",
        prompt: "Follow along with the steps shown above.",
        hint: "Don't worry about getting it perfect - this is just practice!",
      },
      {
        type: "try_it",
        content: "Here's a simple prompt to try on your own.",
        prompt: "Think about what you learned recently and try applying it here.",
        hint: "Remember, it's okay to take your time.",
      },
      {
        type: "reflection",
        content: "Learning is a journey, not a race.",
        prompt: "What's one thing you're curious to learn more about?",
      },
    ],
    closing_message: "Great job exploring today! You can come back anytime to practice more.",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const context = "generate-practice";

  try {
    const { studentId, classId } = await req.json();

    if (!studentId || !classId) {
      console.log(`[${context}] Missing required fields`);
      return createDemoPlaceholderResponse({
        welcomeMessage: "Welcome to practice mode!",
        activities: [],
        closingMessage: "Please select a class to begin.",
      }, "Student and class information required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      console.error(`[${context}] Missing Supabase configuration`);
      const demo = getDemoFallbackPractice();
      return new Response(
        JSON.stringify({
          success: true,
          isDemoGenerated: true,
          message: "Demo practice generated",
          welcomeMessage: demo.welcome_message,
          activities: demo.activities,
          closingMessage: demo.closing_message,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check for AI API key - use demo fallback if not available
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.log(`[${context}] LOVABLE_API_KEY not configured, using demo fallback`);
      const demo = getDemoFallbackPractice();
      return new Response(
        JSON.stringify({
          success: true,
          isDemoGenerated: true,
          message: "Demo practice generated - AI service not configured",
          welcomeMessage: demo.welcome_message,
          activities: demo.activities,
          closingMessage: demo.closing_message,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch adaptive support plan for focus areas
    const { data: supportPlan } = await supabase
      .from("student_intervention_plans")
      .select("focus_areas, support_strategies")
      .eq("student_id", studentId)
      .eq("class_id", classId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch recent lesson topics
    const { data: recentLessons } = await supabase
      .from("lesson_differentiation_suggestions")
      .select("lesson_topic, lesson_objective, support_strategies")
      .eq("class_id", classId)
      .order("created_at", { ascending: false })
      .limit(3);

    // Fetch recent uploads for topic context
    const { data: recentUploads } = await supabase
      .from("uploads")
      .select("topic, subject")
      .eq("class_id", classId)
      .order("created_at", { ascending: false })
      .limit(5);

    // Build context
    const focusAreas = supportPlan?.focus_areas || [];
    const supportStrategies = supportPlan?.support_strategies || [];
    const lessonTopics = recentLessons?.map(l => l.lesson_topic) || [];
    const classTopics = recentUploads?.map(u => u.topic) || [];

    const selectedFocusAreas = focusAreas.length > 0 
      ? focusAreas.slice(0, Math.min(2, focusAreas.length))
      : classTopics.slice(0, Math.min(2, classTopics.length));

    const lessonContext = recentLessons?.[0]?.lesson_objective || 
      `Exploring concepts related to ${selectedFocusAreas.join(" and ") || "recent class topics"}`;

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

    console.log(`[${context}] Generating practice activities for student:`, studentId);

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
                  welcome_message: { type: "string" },
                  activities: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", enum: ["guided_example", "try_it", "explain", "visual_match", "reflection"] },
                        content: { type: "string" },
                        prompt: { type: "string" },
                        hint: { type: "string" },
                      },
                      required: ["type", "content", "prompt"],
                    },
                  },
                  closing_message: { type: "string" },
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
      console.error(`[${context}] AI gateway error:`, response.status);
      
      // Demo-safe: return fallback
      const demo = getDemoFallbackPractice();
      return new Response(
        JSON.stringify({
          success: true,
          isDemoGenerated: true,
          message: "Demo practice generated - AI service temporarily unavailable",
          welcomeMessage: demo.welcome_message,
          activities: demo.activities,
          closingMessage: demo.closing_message,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    console.log(`[${context}] AI response received`);

    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error(`[${context}] No practice activities generated`);
      const demo = getDemoFallbackPractice();
      return new Response(
        JSON.stringify({
          success: true,
          isDemoGenerated: true,
          welcomeMessage: demo.welcome_message,
          activities: demo.activities,
          closingMessage: demo.closing_message,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const practiceData = JSON.parse(toolCall.function.arguments);

    console.log(`[${context}] Practice session generated with`, practiceData.activities?.length, "activities");

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
    console.error(`[${context}] Error:`, error);
    const demo = getDemoFallbackPractice();
    return new Response(
      JSON.stringify({
        success: true,
        isDemoGenerated: true,
        message: "Not enough demo data yet",
        welcomeMessage: demo.welcome_message,
        activities: demo.activities,
        closingMessage: demo.closing_message,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
