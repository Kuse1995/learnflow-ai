/**
 * Send Teacher Invite Edge Function
 * Sends email invitation to teachers to join a school
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  schoolId: string;
  email: string;
  fullName?: string;
}

function buildInviteEmailHtml(schoolName: string, inviteUrl: string, fullName?: string): string {
  const greeting = fullName ? `Hello ${fullName},` : "Hello,";
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Teacher Invitation</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 560px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #18181b;">
                You're Invited to Join ${schoolName}
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 20px 40px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 24px; color: #3f3f46;">
                ${greeting}
              </p>
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 24px; color: #3f3f46;">
                You've been invited to join <strong>${schoolName}</strong> as a teacher on our school management platform. Click the button below to accept the invitation and set up your account.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 8px 0 24px 0;">
                    <a href="${inviteUrl}" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 22px; color: #71717a;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 22px; color: #2563eb; word-break: break-all;">
                <a href="${inviteUrl}" style="color: #2563eb;">${inviteUrl}</a>
              </p>
              
              <p style="margin: 0; font-size: 14px; line-height: 22px; color: #71717a;">
                This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px 40px 40px; text-align: center; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa;">
                This email was sent by ${schoolName} via Omanut SMS.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
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
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

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

    console.log(`Inviting: ${email} to school: ${schoolId}`);

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
      console.error("Role check failed:", roleError);
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
    const { data: existingTeacherRoles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("school_id", schoolId)
      .eq("role", "teacher")
      .eq("is_active", true);

    // Get user by email to check if they're already a teacher
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    const targetUser = authUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (targetUser && existingTeacherRoles) {
      const isAlreadyTeacher = existingTeacherRoles.some(role => role.user_id === targetUser.id);
      
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

    const schoolName = school?.name || "Your School";

    // Build the invitation URL
    const baseUrl = req.headers.get("origin") || "https://lovable.dev";
    const inviteUrl = `${baseUrl}/invite/${inviteToken}`;

    console.log("=== Teacher Invitation Created ===");
    console.log(`School: ${schoolName}`);
    console.log(`Email: ${email}`);
    console.log(`Invite URL: ${inviteUrl}`);
    console.log(`Expires: ${expiresAt.toISOString()}`);

    // Send invitation email via Resend
    let emailSent = false;
    let emailError: string | null = null;

    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        const emailHtml = buildInviteEmailHtml(schoolName, inviteUrl, fullName);

        const { error: sendError } = await resend.emails.send({
          from: `${schoolName} <onboarding@resend.dev>`,
          to: [email],
          subject: `You're invited to join ${schoolName} as a teacher`,
          html: emailHtml,
        });

        if (sendError) {
          console.error("Resend error:", sendError);
          emailError = sendError.message;
        } else {
          emailSent = true;
          console.log("Invitation email sent successfully");
        }
      } catch (err) {
        console.error("Email send error:", err);
        emailError = err instanceof Error ? err.message : "Unknown email error";
      }
    } else {
      console.log("RESEND_API_KEY not configured - skipping email");
      emailError = "Email service not configured";
    }

    // Log to school history
    try {
      await supabaseAdmin.rpc("log_school_history", {
        p_school_id: schoolId,
        p_action_type: "teacher_invited",
        p_action_description: `Teacher invitation sent to ${email}${emailSent ? " (email delivered)" : ""}`,
        p_new_state: { 
          email, 
          full_name: fullName, 
          expires_at: expiresAt.toISOString(),
          email_sent: emailSent,
        },
      });
    } catch (logError) {
      console.error("Failed to log school history:", logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailSent,
        emailError: emailSent ? null : emailError,
        invitation: {
          id: invitation.id,
          email: invitation.email,
          expiresAt: invitation.expires_at,
          inviteUrl,
        },
        message: emailSent 
          ? `Invitation email sent to ${email}.` 
          : `Invitation created for ${email}. Share the invite link manually.`,
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
