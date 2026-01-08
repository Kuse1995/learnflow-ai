import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { guardianId, email, displayName, schoolId } = await req.json();

    if (!guardianId || !email || !displayName || !schoolId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client with service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Generate a temporary password
    const tempPassword = `Parent${Date.now().toString(36)}!`;

    // Create the auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        full_name: displayName,
        role: "parent",
      },
    });

    if (authError) {
      // Check if user already exists
      if (authError.message?.includes("already been registered")) {
        // Get existing user and link
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === email);
        
        if (existingUser) {
          // Update guardian with existing user_id
          await supabaseAdmin
            .from("guardians")
            .update({ user_id: existingUser.id, has_account: true })
            .eq("id", guardianId);

          // Ensure parent role exists
          await supabaseAdmin
            .from("user_roles")
            .upsert({ user_id: existingUser.id, role: "parent", school_id: schoolId }, 
              { onConflict: "user_id,role" });

          return new Response(
            JSON.stringify({ 
              success: true, 
              message: "Linked to existing account",
              existingAccount: true 
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
      throw authError;
    }

    const userId = authData.user.id;

    // Update the guardian record with user_id
    const { error: updateError } = await supabaseAdmin
      .from("guardians")
      .update({ user_id: userId, has_account: true })
      .eq("id", guardianId);

    if (updateError) throw updateError;

    // Add parent role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "parent", school_id: schoolId });

    if (roleError && !roleError.message?.includes("duplicate")) {
      console.error("Role assignment error:", roleError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        tempPassword,
        message: "Account created successfully" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error creating parent account:", error);
    const message = error instanceof Error ? error.message : "Failed to create account";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
