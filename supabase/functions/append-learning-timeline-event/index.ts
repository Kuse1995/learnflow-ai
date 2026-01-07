import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Append Learning Timeline Event
 * 
 * CONSTRAINTS (enforced):
 * - Append-only: no edits or deletions after creation
 * - Teacher-facing only: never expose to parents or students
 * - No evaluative language, performance indicators, predictions, or comparisons
 * - Event summaries should be neutral and factual
 */

const ALLOWED_EVENT_TYPES = [
  "analysis",
  "teaching_action",
  "support_plan",
  "learning_path",
  "parent_summary",
] as const;

type EventType = typeof ALLOWED_EVENT_TYPES[number];

interface RequestBody {
  studentId: string;
  classId: string;
  eventType: EventType;
  eventSummary: string;
  sourceId?: string;
  occurredAt: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing environment variables");
      throw new Error("Server configuration error");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: RequestBody = await req.json();
    console.log("Received append timeline request:", {
      studentId: body.studentId,
      classId: body.classId,
      eventType: body.eventType,
      sourceId: body.sourceId,
    });

    // Validate required fields
    if (!body.studentId || !body.classId || !body.eventType || !body.eventSummary || !body.occurredAt) {
      console.error("Missing required fields:", body);
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate event type
    if (!ALLOWED_EVENT_TYPES.includes(body.eventType)) {
      console.error("Invalid event type:", body.eventType);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Invalid event type. Allowed: ${ALLOWED_EVENT_TYPES.join(", ")}` 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate student exists
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id")
      .eq("id", body.studentId)
      .maybeSingle();

    if (studentError || !student) {
      console.error("Student not found:", body.studentId, studentError);
      return new Response(
        JSON.stringify({ success: false, error: "Student not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate class exists
    const { data: classData, error: classError } = await supabase
      .from("classes")
      .select("id")
      .eq("id", body.classId)
      .maybeSingle();

    if (classError || !classData) {
      console.error("Class not found:", body.classId, classError);
      return new Response(
        JSON.stringify({ success: false, error: "Class not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse occurred_at timestamp
    const occurredAt = new Date(body.occurredAt);
    if (isNaN(occurredAt.getTime())) {
      console.error("Invalid timestamp:", body.occurredAt);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid occurredAt timestamp" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert timeline entry (append-only)
    const { data: timelineEntry, error: insertError } = await supabase
      .from("student_learning_timeline")
      .insert({
        student_id: body.studentId,
        class_id: body.classId,
        event_type: body.eventType,
        event_summary: body.eventSummary,
        source_id: body.sourceId || null,
        occurred_at: occurredAt.toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to insert timeline entry:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to append timeline entry" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Timeline entry appended successfully:", timelineEntry.id);

    return new Response(
      JSON.stringify({ success: true, entry: timelineEntry }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error in append-learning-timeline-event:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
