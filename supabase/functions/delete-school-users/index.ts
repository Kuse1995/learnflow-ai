import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Platform owner email - never delete this account
const PLATFORM_OWNER_EMAIL = 'abkanyanta@gmail.com';

interface DeleteSchoolUsersRequest {
  school_id: string;
}

interface DeleteResult {
  deleted_count: number;
  skipped_count: number;
  skipped_users: Array<{ user_id: string; reason: string }>;
  errors: Array<{ user_id: string; error: string }>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client with service role for auth.admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify caller is authenticated and is platform owner
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the caller's JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !caller) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only platform owner can delete users
    if (caller.email?.toLowerCase() !== PLATFORM_OWNER_EMAIL.toLowerCase()) {
      console.error('Unauthorized: caller is not platform owner', caller.email);
      return new Response(
        JSON.stringify({ error: 'Only platform owner can perform this action' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { school_id }: DeleteSchoolUsersRequest = await req.json();
    
    if (!school_id) {
      return new Response(
        JSON.stringify({ error: 'school_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting user deletion for school: ${school_id}`);

    // Collect all user IDs associated with this school
    // 1. From user_roles
    const { data: userRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('school_id', school_id);

    if (rolesError) {
      console.error('Error fetching user_roles:', rolesError);
      throw rolesError;
    }

    // 2. From guardians (those with user_id set)
    const { data: guardians, error: guardiansError } = await supabaseAdmin
      .from('guardians')
      .select('user_id')
      .eq('school_id', school_id)
      .not('user_id', 'is', null);

    if (guardiansError) {
      console.error('Error fetching guardians:', guardiansError);
      throw guardiansError;
    }

    // Combine and deduplicate user IDs
    const userIdsFromRoles = userRoles?.map(r => r.user_id).filter(Boolean) || [];
    const userIdsFromGuardians = guardians?.map(g => g.user_id).filter(Boolean) || [];
    const allUserIds = [...new Set([...userIdsFromRoles, ...userIdsFromGuardians])];

    console.log(`Found ${allUserIds.length} unique users associated with school`);

    const result: DeleteResult = {
      deleted_count: 0,
      skipped_count: 0,
      skipped_users: [],
      errors: [],
    };

    // Process each user
    for (const userId of allUserIds) {
      try {
        // Get user details
        const { data: { user }, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
        
        if (getUserError) {
          console.error(`Error getting user ${userId}:`, getUserError);
          result.errors.push({ user_id: userId, error: getUserError.message });
          continue;
        }

        if (!user) {
          console.log(`User ${userId} not found in auth, skipping`);
          result.skipped_count++;
          result.skipped_users.push({ user_id: userId, reason: 'User not found in auth' });
          continue;
        }

        // Never delete platform owner
        if (user.email?.toLowerCase() === PLATFORM_OWNER_EMAIL.toLowerCase()) {
          console.log(`Skipping platform owner: ${user.email}`);
          result.skipped_count++;
          result.skipped_users.push({ user_id: userId, reason: 'Platform owner account' });
          continue;
        }

        // Check if user has roles in OTHER schools
        const { data: otherRoles, error: otherRolesError } = await supabaseAdmin
          .from('user_roles')
          .select('school_id')
          .eq('user_id', userId)
          .neq('school_id', school_id);

        if (otherRolesError) {
          console.error(`Error checking other roles for ${userId}:`, otherRolesError);
          result.errors.push({ user_id: userId, error: otherRolesError.message });
          continue;
        }

        // Also check if user is guardian in other schools
        const { data: otherGuardians, error: otherGuardiansError } = await supabaseAdmin
          .from('guardians')
          .select('school_id')
          .eq('user_id', userId)
          .neq('school_id', school_id);

        if (otherGuardiansError) {
          console.error(`Error checking other guardians for ${userId}:`, otherGuardiansError);
          result.errors.push({ user_id: userId, error: otherGuardiansError.message });
          continue;
        }

        const hasOtherSchoolAssociations = 
          (otherRoles && otherRoles.length > 0) || 
          (otherGuardians && otherGuardians.length > 0);

        if (hasOtherSchoolAssociations) {
          console.log(`User ${userId} (${user.email}) has associations with other schools, skipping auth deletion`);
          result.skipped_count++;
          result.skipped_users.push({ 
            user_id: userId, 
            reason: 'User has roles/guardian links in other schools' 
          });
          continue;
        }

        // Delete the auth user
        console.log(`Deleting auth user: ${userId} (${user.email})`);
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (deleteError) {
          console.error(`Error deleting user ${userId}:`, deleteError);
          result.errors.push({ user_id: userId, error: deleteError.message });
          continue;
        }

        console.log(`Successfully deleted auth user: ${userId}`);
        result.deleted_count++;

      } catch (userError) {
        console.error(`Unexpected error processing user ${userId}:`, userError);
        result.errors.push({ 
          user_id: userId, 
          error: userError instanceof Error ? userError.message : 'Unknown error' 
        });
      }
    }

    console.log(`User deletion complete. Deleted: ${result.deleted_count}, Skipped: ${result.skipped_count}, Errors: ${result.errors.length}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        ...result 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in delete-school-users:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
