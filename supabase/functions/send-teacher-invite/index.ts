/**
 * Send Teacher Invite Edge Function
 * Sends email invitation to teachers to join a school
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  schoolId: string;
  email: string;
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
      console.error("Missing backend configuration", {
        hasUrl: !!supabaseUrl,
        hasAnonKey: !!supabaseAnonKey,
        hasServiceKey: !!supabaseServiceKey,
      });

      return new Response(
        JSON.stringify({ error: "Backend configuration missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the authorization header
    const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Validate user via Auth API (pass token explicitly to avoid session/JWK issues)
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);

    if (userError || !userData?.user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;
    console.log("=== Send Teacher Invite Request ===");
    console.log(`Authenticated user: ${userId}`);

    // Parse request body
    const { schoolId, email, fullName }: InviteRequest = await req.json();

    if (!schoolId || !email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: schoolId and email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is a school admin for this school
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("school_id", schoolId)
      .in("role", ["school_admin", "admin", "platform_admin"])
      .eq("is_active", true)
      .maybeSingle();

    if (roleError || !userRole) {
      return new Response(
        JSON.stringify({ error: "You don't have permission to invite teachers to this school" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if invitation already exists
    const { data: existingInvite } = await supabaseAdmin
      .from("teacher_invitations")
      .select("id, status")
      .eq("school_id", schoolId)
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (existingInvite) {
      if (existingInvite.status === "pending") {
        return new Response(
          JSON.stringify({ error: "An invitation has already been sent to this email" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // If previous invite was cancelled/expired, delete it
      await supabaseAdmin
        .from("teacher_invitations")
        .delete()
        .eq("id", existingInvite.id);
    }

    // Check if user is already a teacher at this school
    const { data: existingUser } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("school_id", schoolId)
      .eq("role", "teacher")
      .eq("is_active", true);

    // Get user by email to check if they're already a teacher
    const { data: authUser } = await supabaseAdmin.auth.admin.listUsers();
    const targetUser = authUser?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (targetUser && existingUser) {
      const isAlreadyTeacher = existingUser.some(async (role) => {
        const { data: roleData } = await supabaseAdmin
          .from("user_roles")
          .select("user_id")
          .eq("id", role.id)
          .single();
        return roleData?.user_id === targetUser.id;
      });
      
      if (isAlreadyTeacher) {
        return new Response(
          JSON.stringify({ error: "This user is already a teacher at your school" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Generate a unique invite token
    const inviteToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

    // Create the invitation
    const { data: invitation, error: insertError } = await supabaseAdmin
      .from("teacher_invitations")
      .insert({
        school_id: schoolId,
        email: email.toLowerCase(),
        full_name: fullName || null,
        invited_by: userId,
        invite_token: inviteToken,
        expires_at: expiresAt.toISOString(),
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating invitation:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create invitation" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get school name for the email
    const { data: school } = await supabaseAdmin
      .from("schools")
      .select("name")
      .eq("id", schoolId)
      .single();

    // Build the invitation URL
    const baseUrl = req.headers.get("origin") || "https://lovable.dev";
    const inviteUrl = `${baseUrl}/invite/${inviteToken}`;

    // Log the invitation (in production, you'd send an actual email here)
    console.log("=== Teacher Invitation Created ===");
    console.log(`School: ${school?.name}`);
    console.log(`Email: ${email}`);
    console.log(`Invite URL: ${inviteUrl}`);
    console.log(`Expires: ${expiresAt.toISOString()}`);
    console.log("================================");

    // TODO: Integrate with email service (Resend, SendGrid, etc.)
    // For now, we'll just return the invite URL so it can be shared manually

    // Log to school history
    try {
      await supabaseAdmin.rpc("log_school_history", {
        p_school_id: schoolId,
        p_action_type: "teacher_invited",
        p_action_description: `Teacher invitation sent to ${email}`,
        p_new_state: { email, full_name: fullName, expires_at: expiresAt.toISOString() },
      });
    } catch (logError) {
      console.error("Failed to log school history:", logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        invitation: {
          id: invitation.id,
          email: invitation.email,
          expiresAt: invitation.expires_at,
          inviteUrl, // Include URL for manual sharing
        },
        message: `Invitation created for ${email}. Share the invite link with the teacher.`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-teacher-invite:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
