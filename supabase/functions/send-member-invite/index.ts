import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify the caller is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Not authenticated');
    
    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) throw new Error('Not authenticated');
    
    const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
    if (!roles?.some(r => r.role === 'admin')) throw new Error('Not authorized');

    const { email, full_name, plan } = await req.json();
    if (!email || !full_name) throw new Error('Email and full name are required');

    // Generate the signup invite link
    const siteUrl = req.headers.get('origin') || 'https://wibmembers.lovable.app';
    const signupUrl = `${siteUrl}/auth?tab=signup&email=${encodeURIComponent(email)}`;

    // Send invite email using Supabase's built-in email (via auth.admin)
    // For now, use the admin API to send an invite
    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { full_name, invited: true },
      redirectTo: `${siteUrl}/auth`,
    });

    if (inviteError) {
      console.error('Invite error:', inviteError);
      throw new Error(`Failed to send invite: ${inviteError.message}`);
    }

    // If the invite created a user, the on_user_created_link_pending trigger
    // will fire when they confirm and their pending_member record will be linked

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Invite sent to ${email}`,
      signupUrl,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
