import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, createDemoPlaceholderResponse, createDemoSafeErrorResponse } from "../_shared/safety-validator.ts";

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

// Demo fallback analysis
function getDemoFallbackAnalysis(students: { id: string; name: string }[]): AnalysisResult {
  return {
    class_summary: {
      common_errors: ["Demo mode - upload a marked assessment to see real analysis"],
      topic_gaps: ["Analysis will be available when AI service is configured"],
      overall_observations: "This is a demo placeholder. In the full version, AI will analyze student work and provide detailed insights.",
    },
    student_diagnostics: students.map((s) => ({
      student_id: s.id,
      student_name: s.name,
      error_patterns: { conceptual: 0, procedural: 0, language: 0, careless: 0 },
      weak_topics: [],
      notes: "Demo-generated placeholder - no analysis performed",
    })),
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const context = "analyze-upload";

  try {
    const { uploadId } = await req.json();
    
    if (!uploadId) {
      // In demo mode, return safe placeholder instead of 400
      console.log(`[${context}] Missing uploadId`);
      return createDemoPlaceholderResponse({ analysisId: null }, "Upload ID is required");
    }

    // Initialize Supabase client with service role for full access
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error(`[${context}] Missing Supabase configuration`);
      return createDemoPlaceholderResponse({}, "Database configuration not available");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[${context}] Starting analysis for upload: ${uploadId}`);

    // Fetch upload details
    const { data: upload, error: uploadError } = await supabase
      .from("uploads")
      .select("*")
      .eq("id", uploadId)
      .single();

    if (uploadError || !upload) {
      console.error(`[${context}] Upload not found:`, uploadError);
      return createDemoPlaceholderResponse({ uploadId }, "Upload not found in demo data");
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
        return new Response(JSON.stringify({ 
          success: true, 
          message: "Analysis already in progress",
          analysisId: existingAnalysis.id 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      analysisId = existingAnalysis.id;
      await supabase
        .from("upload_analyses")
        .update({ status: "analyzing", error_message: null })
        .eq("id", analysisId);
    } else {
      const { data: newAnalysis, error: createError } = await supabase
        .from("upload_analyses")
        .insert({ upload_id: uploadId, class_id: upload.class_id, status: "analyzing" })
        .select()
        .single();

      if (createError || !newAnalysis) {
        console.error(`[${context}] Failed to create analysis record:`, createError);
        return createDemoPlaceholderResponse({}, "Unable to create analysis record");
      }
      analysisId = newAnalysis.id;
    }

    // Fetch students for this class
    const { data: uploadStudents } = await supabase
      .from("upload_students")
      .select("student_id")
      .eq("upload_id", uploadId);

    let students: { id: string; name: string; student_id: string }[];

    if (uploadStudents && uploadStudents.length > 0) {
      const studentIds = uploadStudents.map((us) => us.student_id);
      const { data: specificStudents, error: studentsError } = await supabase
        .from("students")
        .select("id, name, student_id")
        .in("id", studentIds);

      if (studentsError) {
        console.error(`[${context}] Students fetch error:`, studentsError);
        students = [];
      } else {
        students = specificStudents || [];
      }
    } else {
      const { data: classStudents, error: studentsError } = await supabase
        .from("students")
        .select("id, name, student_id")
        .eq("class_id", upload.class_id);

      if (studentsError) {
        console.error(`[${context}] Students fetch error:`, studentsError);
        students = [];
      } else {
        students = classStudents || [];
      }
    }

    console.log(`[${context}] Analyzing for ${students.length} students`);

    // Check for AI API key - use demo fallback if not available
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      console.log(`[${context}] LOVABLE_API_KEY not configured, using demo fallback`);
      
      const demoResult = getDemoFallbackAnalysis(students.map(s => ({ id: s.id, name: s.name })));
      
      // Save demo analysis to database
      await supabase
        .from("upload_analyses")
        .update({
          status: "completed",
          class_summary: demoResult.class_summary,
          student_diagnostics: demoResult.student_diagnostics,
          analyzed_at: new Date().toISOString(),
        })
        .eq("id", analysisId);

      return new Response(
        JSON.stringify({
          success: true,
          isDemoGenerated: true,
          message: "Demo analysis generated - AI service not configured",
          analysisId,
          class_summary: demoResult.class_summary,
          student_count: demoResult.student_diagnostics.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
                      common_errors: { type: "array", items: { type: "string" } },
                      topic_gaps: { type: "array", items: { type: "string" } },
                      overall_observations: { type: "string" },
                    },
                    required: ["common_errors", "topic_gaps", "overall_observations"],
                  },
                  student_diagnostics: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        student_id: { type: "string" },
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
                        weak_topics: { type: "array", items: { type: "string" } },
                        notes: { type: "string" },
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
      console.error(`[${context}] AI Gateway error:`, aiResponse.status, errorText);
      
      // Demo-safe: return placeholder instead of error status
      const demoResult = getDemoFallbackAnalysis(students.map(s => ({ id: s.id, name: s.name })));
      
      await supabase
        .from("upload_analyses")
        .update({
          status: "completed",
          class_summary: demoResult.class_summary,
          student_diagnostics: demoResult.student_diagnostics,
          analyzed_at: new Date().toISOString(),
        })
        .eq("id", analysisId);

      return new Response(
        JSON.stringify({
          success: true,
          isDemoGenerated: true,
          message: aiResponse.status === 429 ? "Rate limit reached - demo analysis generated" : "AI service unavailable - demo analysis generated",
          analysisId,
          class_summary: demoResult.class_summary,
          student_count: demoResult.student_diagnostics.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    console.log(`[${context}] AI response received`);

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "submit_analysis") {
      console.error(`[${context}] Invalid AI response format`);
      return createDemoSafeErrorResponse(new Error("Invalid AI response"), { analysisId }, context);
    }

    const analysisResult: AnalysisResult = JSON.parse(toolCall.function.arguments);
    console.log(`[${context}] Analysis parsed successfully`);

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

    // Append timeline entries and update profiles (silently)
    for (const diagnostic of analysisResult.student_diagnostics) {
      try {
        await supabase.from("student_learning_timeline").insert({
          student_id: diagnostic.student_id,
          class_id: upload.class_id,
          event_type: "analysis",
          event_summary: `Work analyzed for ${upload.topic} (${upload.subject})`,
          source_id: analysisId,
          occurred_at: new Date().toISOString(),
        });
      } catch (timelineError) {
        console.error(`[${context}] Timeline append failed:`, timelineError);
      }

      // Update learning profiles
      const { data: existingProfile } = await supabase
        .from("student_learning_profiles")
        .select("*")
        .eq("student_id", diagnostic.student_id)
        .maybeSingle();

      if (existingProfile) {
        const mergedPatterns = {
          conceptual: Math.round((existingProfile.error_patterns.conceptual + diagnostic.error_patterns.conceptual) / 2),
          procedural: Math.round((existingProfile.error_patterns.procedural + diagnostic.error_patterns.procedural) / 2),
          language: Math.round((existingProfile.error_patterns.language + diagnostic.error_patterns.language) / 2),
          careless: Math.round((existingProfile.error_patterns.careless + diagnostic.error_patterns.careless) / 2),
        };

        const existingTopics = existingProfile.weak_topics || [];
        const mergedTopics = [...new Set([...existingTopics, ...diagnostic.weak_topics])];

        const totalErrors = diagnostic.error_patterns.conceptual + diagnostic.error_patterns.procedural;
        let newTrend = existingProfile.confidence_trend;
        if (totalErrors < 3) newTrend = "increasing";
        else if (totalErrors > 6) newTrend = "declining";

        await supabase
          .from("student_learning_profiles")
          .update({
            error_patterns: mergedPatterns,
            weak_topics: mergedTopics,
            confidence_trend: newTrend,
          })
          .eq("student_id", diagnostic.student_id);
      } else {
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

    console.log(`[${context}] Student learning profiles updated`);

    return new Response(
      JSON.stringify({
        success: true,
        analysisId,
        class_summary: analysisResult.class_summary,
        student_count: analysisResult.student_diagnostics.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`[${context}] Analysis error:`, error);
    return createDemoSafeErrorResponse(error, {}, context);
  }
});
