/**
 * Accept Teacher Invite Edge Function
 * Handles teacher invitation acceptance and role assignment using service role
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AcceptInviteRequest {
  inviteToken: string;
  // For new user signup
  password?: string;
  fullName?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.error("Missing backend configuration");
      return new Response(
        JSON.stringify({ error: "Backend configuration missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { inviteToken, password, fullName }: AcceptInviteRequest = await req.json();

    if (!inviteToken) {
      return new Response(
        JSON.stringify({ error: "Missing invite token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("=== Accept Teacher Invite Request ===");
    console.log(`Token: ${inviteToken.substring(0, 8)}...`);

    // Use service role client for all database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch invitation details
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from("teacher_invitations")
      .select(`
        id,
        email,
        full_name,
        school_id,
        expires_at,
        status,
        schools!inner(name)
      `)
      .eq("invite_token", inviteToken)
      .single();

    if (inviteError || !invitation) {
      console.error("Invitation not found:", inviteError);
      return new Response(
        JSON.stringify({ error: "Invitation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already accepted
    if (invitation.status === "accepted") {
      return new Response(
        JSON.stringify({ error: "This invitation has already been accepted" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "This invitation has expired" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if cancelled
    if (invitation.status === "cancelled") {
      return new Response(
        JSON.stringify({ error: "This invitation has been cancelled" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const schoolData = invitation.schools as unknown as { name: string };
    const schoolName = schoolData?.name || "the school";

    // Check if user already exists
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = authUsers?.users?.find(
      u => u.email?.toLowerCase() === invitation.email.toLowerCase()
    );

    let userId: string;
    let isNewUser = false;

    if (existingUser) {
      // Existing user - verify they're logged in via auth header
      const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
      
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ 
            error: "Please log in to accept this invitation",
            requiresLogin: true,
            email: invitation.email
          }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const token = authHeader.replace("Bearer ", "");
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });

      const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);

      if (userError || !userData?.user) {
        return new Response(
          JSON.stringify({ 
            error: "Please log in to accept this invitation",
            requiresLogin: true,
            email: invitation.email
          }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify email matches
      if (userData.user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
        return new Response(
          JSON.stringify({ error: "Please log in with the email address the invitation was sent to" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = userData.user.id;
      console.log(`Existing user accepting invite: ${userId}`);
    } else {
      // New user - create account
      if (!password) {
        return new Response(
          JSON.stringify({ error: "Password is required for new account creation" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (password.length < 6) {
        return new Response(
          JSON.stringify({ error: "Password must be at least 6 characters" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const nameToUse = fullName || invitation.full_name || "";

      // Create user with admin API (auto-confirms)
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: invitation.email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: nameToUse,
        },
      });

      if (createError || !newUser?.user) {
        console.error("Error creating user:", createError);
        return new Response(
          JSON.stringify({ error: createError?.message || "Failed to create account" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = newUser.user.id;
      isNewUser = true;
      console.log(`New user created: ${userId}`);
    }

    // Check if user already has a teacher role at this school
    const { data: existingRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("school_id", invitation.school_id)
      .eq("role", "teacher")
      .eq("is_active", true)
      .maybeSingle();

    if (existingRole) {
      // Update invitation status anyway
      await supabaseAdmin
        .from("teacher_invitations")
        .update({ 
          status: "accepted",
          accepted_at: new Date().toISOString(),
        })
        .eq("id", invitation.id);

      return new Response(
        JSON.stringify({ 
          success: true,
          message: "You are already a teacher at this school",
          isNewUser,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Assign teacher role using service role (bypasses RLS)
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: userId,
        school_id: invitation.school_id,
        role: "teacher",
        is_active: true,
      });

    if (roleError) {
      console.error("Error assigning role:", roleError);
      return new Response(
        JSON.stringify({ error: "Failed to assign teacher role" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update invitation status
    await supabaseAdmin
      .from("teacher_invitations")
      .update({ 
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invitation.id);

    // Log to school history
    try {
      await supabaseAdmin.rpc("log_school_history", {
        p_school_id: invitation.school_id,
        p_action_type: "teacher_joined",
        p_action_description: `${invitation.email} accepted invitation and joined as teacher`,
        p_new_state: { 
          user_id: userId,
          email: invitation.email,
          is_new_user: isNewUser,
        },
      });
    } catch (logError) {
      console.error("Failed to log school history:", logError);
    }

    console.log("=== Teacher Invitation Accepted ===");
    console.log(`User: ${userId}`);
    console.log(`School: ${invitation.school_id}`);
    console.log(`Is new user: ${isNewUser}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Welcome to ${schoolName}! You are now a teacher.`,
        isNewUser,
        schoolId: invitation.school_id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in accept-teacher-invite:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
