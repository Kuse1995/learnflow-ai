import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StudentDiagnostic {
  student_id: string;
  student_name: string;
  error_patterns: {
    conceptual: number;
    procedural: number;
    language: number;
    careless: number;
  };
  weak_topics: string[];
  notes: string;
}

interface ClassSummary {
  common_errors: string[];
  topic_gaps: string[];
  overall_observations: string;
}

interface AnalysisResult {
  class_summary: ClassSummary;
  student_diagnostics: StudentDiagnostic[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { uploadId } = await req.json();
    
    if (!uploadId) {
      return new Response(JSON.stringify({ error: "uploadId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase client with service role for full access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Starting analysis for upload: ${uploadId}`);

    // Fetch upload details
    const { data: upload, error: uploadError } = await supabase
      .from("uploads")
      .select("*")
      .eq("id", uploadId)
      .single();

    if (uploadError || !upload) {
      console.error("Upload not found:", uploadError);
      return new Response(JSON.stringify({ error: "Upload not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if analysis already exists
    const { data: existingAnalysis } = await supabase
      .from("upload_analyses")
      .select("id, status")
      .eq("upload_id", uploadId)
      .maybeSingle();

    let analysisId: string;

    if (existingAnalysis) {
      if (existingAnalysis.status === "analyzing") {
        return new Response(JSON.stringify({ error: "Analysis already in progress" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      analysisId = existingAnalysis.id;
      // Update status to analyzing
      await supabase
        .from("upload_analyses")
        .update({ status: "analyzing", error_message: null })
        .eq("id", analysisId);
    } else {
      // Create new analysis record
      const { data: newAnalysis, error: createError } = await supabase
        .from("upload_analyses")
        .insert({ upload_id: uploadId, class_id: upload.class_id, status: "analyzing" })
        .select()
        .single();

      if (createError || !newAnalysis) {
        console.error("Failed to create analysis record:", createError);
        throw new Error("Failed to create analysis record");
      }
      analysisId = newAnalysis.id;
    }

    // Fetch students for this class
    // First check if there are specific students in upload_students
    const { data: uploadStudents } = await supabase
      .from("upload_students")
      .select("student_id")
      .eq("upload_id", uploadId);

    let students: { id: string; name: string; student_id: string }[];

    if (uploadStudents && uploadStudents.length > 0) {
      // Specific students assigned
      const studentIds = uploadStudents.map((us) => us.student_id);
      const { data: specificStudents, error: studentsError } = await supabase
        .from("students")
        .select("id, name, student_id")
        .in("id", studentIds);

      if (studentsError) throw studentsError;
      students = specificStudents || [];
    } else {
      // All students in class
      const { data: classStudents, error: studentsError } = await supabase
        .from("students")
        .select("id, name, student_id")
        .eq("class_id", upload.class_id);

      if (studentsError) throw studentsError;
      students = classStudents || [];
    }

    console.log(`Analyzing for ${students.length} students`);

    // Build the AI prompt
    const systemPrompt = `You are an educational assessment analyst. Your task is to analyze student work and identify learning patterns.

IMPORTANT RULES:
- Do NOT assign grades or scores
- Do NOT rank students or compare them to each other
- Do NOT label students as "weak" or "strong"
- Focus ONLY on identifying specific error patterns and learning gaps

ERROR CATEGORIES:
1. conceptual - Fundamental misunderstanding of concepts
2. procedural - Knows the concept but makes mistakes in execution/steps
3. language - Struggles with comprehension, reading, or terminology
4. careless - Simple mistakes like arithmetic errors, skipped steps, copying errors

For each student, identify:
- Which error categories apply (score 0-10 for frequency/severity)
- Specific topics where they struggle
- Brief neutral observation notes

For the class overall, identify:
- Common errors seen across multiple students
- Topic gaps that need reinforcement
- General observations about class performance patterns`;

    const userPrompt = `Analyze this uploaded ${upload.upload_type} for the subject "${upload.subject}", topic "${upload.topic}".

File URL: ${upload.file_url}
${upload.marking_scheme ? `Marking Scheme/Expected Answers: ${upload.marking_scheme}` : "No marking scheme provided - infer expected answers where possible."}

Students in this class:
${students.map((s) => `- ${s.name} (ID: ${s.student_id})`).join("\n")}

Please analyze the document and provide diagnostic feedback. If this appears to be a blank answer sheet or template, provide placeholder analysis indicating no student work is visible yet.

Return your analysis as a structured response for each student and the class overall.`;

    // Call Lovable AI Gateway with vision capabilities
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
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              { type: "image_url", image_url: { url: upload.file_url } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_analysis",
              description: "Submit the complete analysis results",
              parameters: {
                type: "object",
                properties: {
                  class_summary: {
                    type: "object",
                    properties: {
                      common_errors: {
                        type: "array",
                        items: { type: "string" },
                        description: "List of common errors seen across multiple students",
                      },
                      topic_gaps: {
                        type: "array",
                        items: { type: "string" },
                        description: "Topics that need reinforcement",
                      },
                      overall_observations: {
                        type: "string",
                        description: "General observations about class performance patterns",
                      },
                    },
                    required: ["common_errors", "topic_gaps", "overall_observations"],
                  },
                  student_diagnostics: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        student_id: { type: "string", description: "The student UUID" },
                        student_name: { type: "string" },
                        error_patterns: {
                          type: "object",
                          properties: {
                            conceptual: { type: "number", minimum: 0, maximum: 10 },
                            procedural: { type: "number", minimum: 0, maximum: 10 },
                            language: { type: "number", minimum: 0, maximum: 10 },
                            careless: { type: "number", minimum: 0, maximum: 10 },
                          },
                          required: ["conceptual", "procedural", "language", "careless"],
                        },
                        weak_topics: {
                          type: "array",
                          items: { type: "string" },
                        },
                        notes: { type: "string", description: "Brief neutral observation" },
                      },
                      required: ["student_id", "student_name", "error_patterns", "weak_topics", "notes"],
                    },
                  },
                },
                required: ["class_summary", "student_diagnostics"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_analysis" } },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        await supabase
          .from("upload_analyses")
          .update({ status: "failed", error_message: "Rate limit exceeded. Please try again later." })
          .eq("id", analysisId);
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        await supabase
          .from("upload_analyses")
          .update({ status: "failed", error_message: "AI credits exhausted." })
          .eq("id", analysisId);
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log("AI response received");

    // Extract the function call result
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "submit_analysis") {
      throw new Error("Invalid AI response format");
    }

    const analysisResult: AnalysisResult = JSON.parse(toolCall.function.arguments);
    console.log("Analysis parsed successfully");

    // Update the analysis record with results
    await supabase
      .from("upload_analyses")
      .update({
        status: "completed",
        class_summary: analysisResult.class_summary,
        student_diagnostics: analysisResult.student_diagnostics,
        analyzed_at: new Date().toISOString(),
      })
      .eq("id", analysisId);

    // Update student learning profiles
    for (const diagnostic of analysisResult.student_diagnostics) {
      // Check if learning profile exists
      const { data: existingProfile } = await supabase
        .from("student_learning_profiles")
        .select("*")
        .eq("student_id", diagnostic.student_id)
        .maybeSingle();

      if (existingProfile) {
        // Merge error patterns (weighted average with existing)
        const mergedPatterns = {
          conceptual: Math.round((existingProfile.error_patterns.conceptual + diagnostic.error_patterns.conceptual) / 2),
          procedural: Math.round((existingProfile.error_patterns.procedural + diagnostic.error_patterns.procedural) / 2),
          language: Math.round((existingProfile.error_patterns.language + diagnostic.error_patterns.language) / 2),
          careless: Math.round((existingProfile.error_patterns.careless + diagnostic.error_patterns.careless) / 2),
        };

        // Merge weak topics (union, keeping unique)
        const existingTopics = existingProfile.weak_topics || [];
        const mergedTopics = [...new Set([...existingTopics, ...diagnostic.weak_topics])];

        // Conservative confidence trend update
        const totalErrors = diagnostic.error_patterns.conceptual + diagnostic.error_patterns.procedural;
        let newTrend = existingProfile.confidence_trend;
        if (totalErrors < 3) {
          newTrend = "increasing";
        } else if (totalErrors > 6) {
          newTrend = "declining";
        }
        // Otherwise keep stable

        await supabase
          .from("student_learning_profiles")
          .update({
            error_patterns: mergedPatterns,
            weak_topics: mergedTopics,
            confidence_trend: newTrend,
          })
          .eq("student_id", diagnostic.student_id);
      } else {
        // Create new profile
        const totalErrors = diagnostic.error_patterns.conceptual + diagnostic.error_patterns.procedural;
        const trend = totalErrors < 3 ? "increasing" : totalErrors > 6 ? "declining" : "stable";

        await supabase.from("student_learning_profiles").insert({
          student_id: diagnostic.student_id,
          strengths: null,
          weak_topics: diagnostic.weak_topics,
          error_patterns: diagnostic.error_patterns,
          confidence_trend: trend,
        });
      }
    }

    console.log("Student learning profiles updated");

    return new Response(
      JSON.stringify({
        success: true,
        analysisId,
        class_summary: analysisResult.class_summary,
        student_count: analysisResult.student_diagnostics.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Analysis error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Analysis failed" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
