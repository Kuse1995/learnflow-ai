import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExtractedStudent {
  name: string;
  studentId: string | null;
  grade: string | null;
  className: string | null;
  confidence: number; // 0-100
}

interface ExtractionResult {
  students: ExtractedStudent[];
  documentType: string;
  rawText: string | null;
  warnings: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const context = "extract-roster-from-image";

  try {
    const { imageUrl, imageBase64 } = await req.json();

    if (!imageUrl && !imageBase64) {
      return new Response(
        JSON.stringify({ success: false, error: "Image URL or base64 data is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "AI service not configured",
          isDemoMode: true
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${context}] Processing image for roster extraction`);

    const systemPrompt = `You are a document OCR specialist for school records. Your task is to extract student information from images of paper registers, class lists, admission books, or similar school documents.

EXTRACTION RULES:
1. Extract EVERY student name visible in the document
2. Look for student IDs, admission numbers, or registration numbers
3. Look for grade/class information (e.g., "Grade 5", "5A", "Class 3B")
4. Handle messy handwriting by making best guesses
5. Assign confidence scores based on legibility (0-100)

COMMON DOCUMENT FORMATS:
- Class registers with columns: Name, ID, etc.
- Admission books with serial numbers
- Attendance sheets
- Simple name lists

For each student, extract:
- name: Full name as written
- studentId: Any ID number found (null if not present)
- grade: Grade level if visible (null if not present)  
- className: Class name/section if visible (null if not present)
- confidence: How confident you are in the extraction (0-100)

Also identify:
- documentType: What kind of document this appears to be
- warnings: Any issues with the document (blurry areas, cut-off text, etc.)`;

    const userPrompt = `Extract all student information from this image. Return structured data for each student found.

If the document is:
- A class register: Extract names and any IDs
- An admission book: Extract names and admission numbers
- A simple list: Extract just names
- Any other format: Do your best to identify student names

Be thorough - extract EVERY name visible, even if other information is incomplete.`;

    // Prepare image content
    const imageContent = imageBase64 
      ? { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
      : { type: "image_url", image_url: { url: imageUrl } };

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
              imageContent,
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_extraction",
              description: "Submit the extracted student roster data",
              parameters: {
                type: "object",
                properties: {
                  students: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Student's full name" },
                        studentId: { type: ["string", "null"], description: "Student ID or admission number" },
                        grade: { type: ["string", "null"], description: "Grade level (e.g., 'Grade 5', '5')" },
                        className: { type: ["string", "null"], description: "Class name or section (e.g., '5A')" },
                        confidence: { type: "number", minimum: 0, maximum: 100, description: "Confidence in extraction accuracy" },
                      },
                      required: ["name", "confidence"],
                    },
                  },
                  documentType: { 
                    type: "string", 
                    description: "Type of document (e.g., 'class register', 'admission book', 'attendance sheet', 'name list')" 
                  },
                  rawText: { 
                    type: ["string", "null"], 
                    description: "Raw text extracted from document, if useful" 
                  },
                  warnings: {
                    type: "array",
                    items: { type: "string" },
                    description: "Any issues or warnings about the extraction",
                  },
                },
                required: ["students", "documentType", "warnings"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_extraction" } },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error(`[${context}] AI Gateway error:`, aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: aiResponse.status === 429 ? "Rate limit reached, please try again" : "AI service error" 
        }),
        { status: aiResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall || toolCall.function.name !== "submit_extraction") {
      console.error(`[${context}] Invalid AI response format`);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to parse document" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const extractionResult: ExtractionResult = JSON.parse(toolCall.function.arguments);
    console.log(`[${context}] Extracted ${extractionResult.students.length} students`);

    return new Response(
      JSON.stringify({
        success: true,
        ...extractionResult,
        studentCount: extractionResult.students.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`[${context}] Extraction error:`, error);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to process image" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
