import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { studentId, classId, sourceWindowDays = 30 } = await req.json();

    if (!studentId || !classId) {
      console.error("Missing required parameters:", { studentId, classId });
      return new Response(
        JSON.stringify({ success: false, error: "Missing studentId or classId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Generating learning path for:", { studentId, classId, sourceWindowDays });

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Check for existing unacknowledged path (one active path per student per class)
    const { data: existingPath } = await supabase
      .from("student_learning_paths")
      .select("*")
      .eq("student_id", studentId)
      .eq("class_id", classId)
      .eq("teacher_acknowledged", false)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingPath) {
      console.log("Unacknowledged path already exists:", existingPath.id);
      return new Response(
        JSON.stringify({
          success: false,
          error: "An unacknowledged learning path already exists for this student. Please review or acknowledge it first.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch student learning profile
    const { data: learningProfile } = await supabase
      .from("student_learning_profiles")
      .select("*")
      .eq("student_id", studentId)
      .maybeSingle();

    console.log("Learning profile found:", !!learningProfile);

    // Fetch recent upload analyses
    const windowDate = new Date();
    windowDate.setDate(windowDate.getDate() - sourceWindowDays);

    const { data: recentAnalyses } = await supabase
      .from("upload_analyses")
      .select("*, uploads!inner(topic, subject, date)")
      .eq("class_id", classId)
      .eq("status", "completed")
      .gte("analyzed_at", windowDate.toISOString())
      .order("analyzed_at", { ascending: false })
      .limit(10);

    console.log("Recent analyses found:", recentAnalyses?.length || 0);

    // Fetch recent teacher action logs
    const { data: actionLogs } = await supabase
      .from("teacher_action_logs")
      .select("*")
      .eq("class_id", classId)
      .gte("created_at", windowDate.toISOString())
      .order("created_at", { ascending: false })
      .limit(10);

    console.log("Action logs found:", actionLogs?.length || 0);

    // Fetch latest adaptive support plan (if exists)
    const { data: supportPlan } = await supabase
      .from("student_intervention_plans")
      .select("*")
      .eq("student_id", studentId)
      .eq("class_id", classId)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    console.log("Support plan found:", !!supportPlan);

    // Build context for AI
    const context = buildContext(learningProfile, recentAnalyses || [], actionLogs || [], supportPlan);

    // Generate learning path using Lovable AI
    const aiResponse = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: context },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", errorText);
      throw new Error("Failed to generate learning path from AI");
    }

    const aiData = await aiResponse.json();
    const generatedContent = JSON.parse(aiData.choices[0].message.content);

    console.log("AI generated learning path:", generatedContent);

    // Validate output
    const focusTopics = generatedContent.focus_topics || [];
    const suggestedActivities = generatedContent.suggested_activities || [];
    const pacingNotes = generatedContent.pacing_notes || null;

    if (focusTopics.length < 2 || focusTopics.length > 4) {
      console.warn("Focus topics count outside 2-4 range:", focusTopics.length);
    }
    if (suggestedActivities.length < 3 || suggestedActivities.length > 5) {
      console.warn("Suggested activities count outside 3-5 range:", suggestedActivities.length);
    }

    // Save to database
    const { data: newPath, error: insertError } = await supabase
      .from("student_learning_paths")
      .insert({
        student_id: studentId,
        class_id: classId,
        focus_topics: focusTopics.slice(0, 4),
        suggested_activities: suggestedActivities.slice(0, 5),
        pacing_notes: pacingNotes,
        teacher_acknowledged: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Failed to save learning path");
    }

    console.log("Learning path saved:", newPath.id);

    // Append timeline entry (silently, no notifications)
    try {
      const topics = focusTopics.slice(0, 2).join(", ");
      await supabase.from("student_learning_timeline").insert({
        student_id: studentId,
        class_id: classId,
        event_type: "learning_path",
        event_summary: `Learning path generated${topics ? ` covering ${topics}` : ""}`,
        source_id: newPath.id,
        occurred_at: new Date().toISOString(),
      });
    } catch (timelineError) {
      console.error("Timeline append failed:", timelineError);
    }

    return new Response(
      JSON.stringify({ success: true, path: newPath }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error generating learning path:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

const SYSTEM_PROMPT = `You are an instructional support assistant helping teachers create personalized learning paths for students.

CRITICAL LANGUAGE RULES (STRICT):
- Do NOT use levels, grades, stages, rankings, or comparisons
- Do NOT use deficit or performance language (e.g., "weak", "struggling", "behind", "low")
- Do NOT predict future performance or make judgments
- Use ONLY opportunity-based phrasing

ALLOWED PHRASING:
- "Ready to explore..."
- "Would benefit from opportunities to..."
- "Shows interest in..."
- "Can extend understanding through..."
- "Responds well to..."

YOUR TASK:
Based on the student's learning profile, recent class activities, and any existing support plans, generate a personalized learning path with:

1. focus_topics (2-4 topics): Areas where the student has opportunities to grow
2. suggested_activities (3-5 activities): Concrete, practical activities the teacher can use
3. pacing_notes (optional): Brief guidance on timing or sequencing if helpful

OUTPUT FORMAT (JSON):
{
  "focus_topics": ["topic1", "topic2"],
  "suggested_activities": ["activity1", "activity2", "activity3"],
  "pacing_notes": "Optional pacing guidance or null"
}

Keep all language neutral, supportive, and practical. This is for TEACHER USE ONLY.`;

function buildContext(
  learningProfile: any,
  recentAnalyses: any[],
  actionLogs: any[],
  supportPlan: any
): string {
  let context = "Generate a personalized learning path based on the following information:\n\n";

  // Learning profile
  if (learningProfile) {
    context += "## Student Learning Profile\n";
    if (learningProfile.strengths) {
      context += `- Strengths: ${learningProfile.strengths}\n`;
    }
    if (learningProfile.weak_topics?.length > 0) {
      context += `- Growth areas: ${learningProfile.weak_topics.join(", ")}\n`;
    }
    if (learningProfile.confidence_trend) {
      context += `- Learning trend: ${learningProfile.confidence_trend}\n`;
    }
    if (learningProfile.error_patterns) {
      const patterns = learningProfile.error_patterns;
      const notable = Object.entries(patterns)
        .filter(([_, v]) => (v as number) > 5)
        .map(([k, _]) => k);
      if (notable.length > 0) {
        context += `- Pattern tendencies: ${notable.join(", ")}\n`;
      }
    }
    context += "\n";
  } else {
    context += "## Student Learning Profile\nNo profile data available yet.\n\n";
  }

  // Recent analyses
  if (recentAnalyses && recentAnalyses.length > 0) {
    context += "## Recent Class Work\n";
    for (const analysis of recentAnalyses.slice(0, 5)) {
      const upload = (analysis as any).uploads;
      context += `- ${upload?.subject || "Subject"}: ${upload?.topic || "Topic"}\n`;
      if (analysis.class_summary?.common_errors) {
        context += `  Common patterns: ${analysis.class_summary.common_errors.slice(0, 3).join(", ")}\n`;
      }
    }
    context += "\n";
  }

  // Teacher actions
  if (actionLogs && actionLogs.length > 0) {
    context += "## Recent Teaching Actions\n";
    for (const log of actionLogs.slice(0, 5)) {
      context += `- ${log.topic || "General"}: ${log.action_taken}\n`;
    }
    context += "\n";
  }

  // Existing support plan
  if (supportPlan) {
    context += "## Existing Support Plan\n";
    if (supportPlan.focus_areas?.length > 0) {
      context += `- Focus areas: ${supportPlan.focus_areas.join(", ")}\n`;
    }
    if (supportPlan.support_strategies?.length > 0) {
      context += `- Strategies in use: ${supportPlan.support_strategies.slice(0, 3).join(", ")}\n`;
    }
    context += "\n";
  }

  context += "Generate a learning path that complements existing support and builds on the student's interests and opportunities for growth.";

  return context;
}
