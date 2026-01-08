import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, createDemoPlaceholderResponse, createDemoSafeErrorResponse } from "../_shared/safety-validator.ts";

// Demo fallback learning path
function getDemoFallbackPath() {
  return {
    focus_topics: [
      "Continued exploration of current curriculum topics",
      "Building confidence through varied practice activities",
    ],
    suggested_activities: [
      "Work through guided examples at your own pace",
      "Partner activities for collaborative learning",
      "Visual representations to reinforce concepts",
      "Reflection exercises to consolidate understanding",
    ],
    pacing_notes: "Demo-generated path - actual learning paths are personalized based on student data.",
    is_demo_generated: true,
  };
}

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

  if (learningProfile) {
    context += "## Student Learning Profile\n";
    if (learningProfile.strengths) context += `- Strengths: ${learningProfile.strengths}\n`;
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
      if (notable.length > 0) context += `- Pattern tendencies: ${notable.join(", ")}\n`;
    }
    context += "\n";
  } else {
    context += "## Student Learning Profile\nNo profile data available yet.\n\n";
  }

  if (recentAnalyses?.length > 0) {
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

  if (actionLogs?.length > 0) {
    context += "## Recent Teaching Actions\n";
    for (const log of actionLogs.slice(0, 5)) {
      context += `- ${log.topic || "General"}: ${log.action_taken}\n`;
    }
    context += "\n";
  }

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const context = "generate-learning-path";

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error(`[${context}] Missing Supabase configuration`);
      return createDemoPlaceholderResponse({ path: getDemoFallbackPath() }, "Database configuration not available");
    }

    const { studentId, classId, sourceWindowDays = 30 } = await req.json();

    if (!studentId || !classId) {
      console.log(`[${context}] Missing required parameters`);
      return createDemoPlaceholderResponse({ path: getDemoFallbackPath() }, "Student and class information required");
    }

    console.log(`[${context}] Generating learning path for:`, { studentId, classId, sourceWindowDays });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check for existing unacknowledged path
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
      console.log(`[${context}] Unacknowledged path already exists:`, existingPath.id);
      return new Response(
        JSON.stringify({
          success: true,
          message: "An unacknowledged learning path already exists. Please review it first.",
          path: existingPath,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for AI API key - use demo fallback if not available
    if (!LOVABLE_API_KEY) {
      console.log(`[${context}] LOVABLE_API_KEY not configured, using demo fallback`);
      
      const demoPath = getDemoFallbackPath();
      
      const { data: savedPath, error: insertError } = await supabase
        .from("student_learning_paths")
        .insert({
          student_id: studentId,
          class_id: classId,
          focus_topics: demoPath.focus_topics,
          suggested_activities: demoPath.suggested_activities,
          pacing_notes: demoPath.pacing_notes,
          teacher_acknowledged: false,
        })
        .select()
        .single();

      if (insertError) {
        console.error(`[${context}] Demo path save error:`, insertError);
        return createDemoPlaceholderResponse({ path: demoPath }, "Demo path generated (not saved)");
      }

      return new Response(
        JSON.stringify({
          success: true,
          isDemoGenerated: true,
          message: "Demo learning path generated - AI service not configured",
          path: savedPath,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch learning profile
    const { data: learningProfile } = await supabase
      .from("student_learning_profiles")
      .select("*")
      .eq("student_id", studentId)
      .maybeSingle();

    console.log(`[${context}] Learning profile found:`, !!learningProfile);

    // Fetch recent analyses
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

    console.log(`[${context}] Recent analyses found:`, recentAnalyses?.length || 0);

    // Fetch action logs
    const { data: actionLogs } = await supabase
      .from("teacher_action_logs")
      .select("*")
      .eq("class_id", classId)
      .gte("created_at", windowDate.toISOString())
      .order("created_at", { ascending: false })
      .limit(10);

    console.log(`[${context}] Action logs found:`, actionLogs?.length || 0);

    // Fetch support plan
    const { data: supportPlan } = await supabase
      .from("student_intervention_plans")
      .select("*")
      .eq("student_id", studentId)
      .eq("class_id", classId)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    console.log(`[${context}] Support plan found:`, !!supportPlan);

    // Build context
    const promptContext = buildContext(learningProfile, recentAnalyses || [], actionLogs || [], supportPlan);

    // Call AI
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
          { role: "user", content: promptContext },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      console.error(`[${context}] AI API error:`, aiResponse.status);
      
      // Demo-safe: return fallback
      const demoPath = getDemoFallbackPath();
      
      const { data: savedPath } = await supabase
        .from("student_learning_paths")
        .insert({
          student_id: studentId,
          class_id: classId,
          focus_topics: demoPath.focus_topics,
          suggested_activities: demoPath.suggested_activities,
          pacing_notes: demoPath.pacing_notes,
          teacher_acknowledged: false,
        })
        .select()
        .single();

      return new Response(
        JSON.stringify({
          success: true,
          isDemoGenerated: true,
          message: "Demo learning path generated - AI service temporarily unavailable",
          path: savedPath || demoPath,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const generatedContent = JSON.parse(aiData.choices[0].message.content);

    console.log(`[${context}] AI generated learning path`);

    const focusTopics = generatedContent.focus_topics || [];
    const suggestedActivities = generatedContent.suggested_activities || [];
    const pacingNotes = generatedContent.pacing_notes || null;

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
      console.error(`[${context}] Insert error:`, insertError);
      return createDemoSafeErrorResponse(insertError, { path: generatedContent }, context);
    }

    console.log(`[${context}] Learning path saved:`, newPath.id);

    // Append timeline entry
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
      console.error(`[${context}] Timeline append failed:`, timelineError);
    }

    return new Response(
      JSON.stringify({ success: true, path: newPath }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`[${context}] Error:`, error);
    return createDemoSafeErrorResponse(error, { path: getDemoFallbackPath() }, context);
  }
});
