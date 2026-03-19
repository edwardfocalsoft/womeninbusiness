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

function getEmailContent(memberType: string, fullName: string, onboardingUrl: string) {
  const firstName = fullName.split(" ")[0] || fullName;

  if (memberType === "expired") {
    return {
      subject: "Renew Your Women In Business Membership",
      body: `Dear ${firstName},

We noticed that your Women In Business membership has expired. We miss having you as part of our vibrant community!

Renew your membership today to continue enjoying the benefits of being a Women In Business member — including access to exclusive events, networking opportunities, resources, and more.

Click the link below to renew your membership:
${onboardingUrl}

We look forward to welcoming you back!

Warm regards,
Women In Business Team`,
    };
  }

  if (memberType === "active") {
    return {
      subject: "Complete Your Women In Business Profile",
      body: `Dear ${firstName},

Welcome to Women In Business! Your membership is already active.

To get the most out of your membership, please complete your online profile. This helps other members discover your business and creates networking opportunities.

Click the link below to complete your profile:
${onboardingUrl}

We're excited to have you as part of the community!

Warm regards,
Women In Business Team`,
    };
  }

  // Default: new member
  return {
    subject: "You're Invited to Join Women In Business!",
    body: `Dear ${firstName},

You've been invited to join Women In Business — a community of ambitious women entrepreneurs and professionals.

To get started, please sign up and complete your membership payment to enjoy the full benefits of being a Women In Business member, including exclusive events, networking, resources, and more.

Click the link below to get started:
${onboardingUrl}

We look forward to having you!

Warm regards,
Women In Business Team`,
  };
}

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

    const { email, full_name, send_email, member_type } = await req.json();
    if (!email || !full_name) throw new Error("Email and full name are required");

    const siteUrl = getSiteUrl();
    const memberTypeParam = member_type || "new";
    const onboardingUrl = `${siteUrl}/auth?tab=signup&invited=true&email=${encodeURIComponent(email)}&full_name=${encodeURIComponent(full_name)}&member_type=${encodeURIComponent(memberTypeParam)}`;

    // Check admin settings for email invite toggle
    const { data: settings } = await supabase
      .from("admin_settings")
      .select("send_invite_emails")
      .eq("id", 1)
      .single();

    const shouldSendEmail = send_email !== false && settings?.send_invite_emails !== false;

    if (shouldSendEmail) {
      // For active members, use OTP to create account if needed
      // For new/expired, also use OTP
      const emailContent = getEmailContent(memberTypeParam, full_name, onboardingUrl);

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: onboardingUrl,
          data: {
            full_name,
            invited: true,
            member_type: memberTypeParam,
          },
        },
      });

      if (error) {
        throw new Error(`Failed to send invite email: ${error.message}`);
      }
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
