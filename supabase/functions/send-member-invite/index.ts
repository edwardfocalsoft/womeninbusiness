import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_SITE_URL = "https://womeninbusiness.livents.co.za";

const getSiteUrl = () => {
  const configured = (Deno.env.get("PUBLIC_SITE_URL") || DEFAULT_SITE_URL).trim();
  return configured.endsWith("/") ? configured.slice(0, -1) : configured;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is authenticated admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const {
      data: { user },
      error: authError,
    } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) throw new Error("Not authenticated");

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (!roles?.some((r) => r.role === "admin")) throw new Error("Not authorized");

    const { email, full_name, send_email } = await req.json();
    if (!email || !full_name) throw new Error("Email and full name are required");

    const siteUrl = getSiteUrl();
    const onboardingUrl = `${siteUrl}/auth?tab=signup&invited=true&email=${encodeURIComponent(email)}&full_name=${encodeURIComponent(full_name)}`;

    // Check admin settings for email invite toggle
    const { data: settings } = await supabase
      .from("admin_settings")
      .select("send_invite_emails")
      .eq("id", 1)
      .single();

    const shouldSendEmail = send_email !== false && settings?.send_invite_emails !== false;

    if (shouldSendEmail) {
      await sendAuthInviteEmail(supabase, email, full_name, onboardingUrl);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: shouldSendEmail ? `Invite sent to ${email}` : "Member added (email invite disabled)",
        emailSent: shouldSendEmail,
        onboardingUrl,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function sendAuthInviteEmail(
  supabase: ReturnType<typeof createClient>,
  email: string,
  fullName: string,
  onboardingUrl: string,
) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: onboardingUrl,
      data: {
        full_name: fullName,
        invited: true,
      },
    },
  });

  if (error) {
    throw new Error(`Failed to send invite email: ${error.message}`);
  }
}
