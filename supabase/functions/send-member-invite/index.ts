import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_SITE_URL = "https://womeninbusiness.livents.co.za";

type MemberType = "new" | "active" | "expired";

const getSiteUrl = () => {
  const configured = (Deno.env.get("PUBLIC_SITE_URL") || DEFAULT_SITE_URL).trim();
  return configured.endsWith("/") ? configured.slice(0, -1) : configured;
};

const normalizeMemberType = (value: string | undefined): MemberType => {
  if (value === "active" || value === "expired") return value;
  return "new";
};

const isExistingUserError = (message: string) => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("already") ||
    normalized.includes("registered") ||
    normalized.includes("exists") ||
    normalized.includes("taken")
  );
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Not authenticated");

    const token = authHeader.replace("Bearer ", "");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) throw new Error("Not authenticated");

    const user = { id: claimsData.claims.sub as string };

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (!roles?.some((r) => r.role === "admin")) throw new Error("Not authorized");

    const { email, full_name, send_email, member_type } = await req.json();

    const recipientEmail = String(email || "").trim().toLowerCase();
    const recipientName = String(full_name || "").trim();

    if (!recipientEmail || !recipientName) {
      throw new Error("Email and full name are required");
    }

    const memberType = normalizeMemberType(member_type);
    const siteUrl = getSiteUrl();
    const inviteUrl = `${siteUrl}/auth?tab=signup&invited=true&email=${encodeURIComponent(recipientEmail)}&full_name=${encodeURIComponent(recipientName)}&member_type=${memberType}`;

    const { data: settings } = await supabase
      .from("admin_settings")
      .select("send_invite_emails")
      .eq("id", 1)
      .single();

    const shouldSendEmail = send_email !== false && settings?.send_invite_emails !== false;
    let emailSent = false;
    let suppressed = false;

    if (shouldSendEmail) {
      const { data: suppressedRows } = await supabase
        .from("suppressed_emails")
        .select("id")
        .eq("email", recipientEmail)
        .limit(1);

      suppressed = Boolean(suppressedRows && suppressedRows.length > 0);

      if (!suppressed) {
        if (memberType === "new") {
          const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(recipientEmail, {
            redirectTo: inviteUrl,
            data: {
              full_name: recipientName,
              member_type: memberType,
            },
          });

          if (inviteError) {
            if (!isExistingUserError(inviteError.message)) {
              throw new Error(`Failed to send invite email: ${inviteError.message}`);
            }

            const { error: resetError } = await supabase.auth.resetPasswordForEmail(recipientEmail, {
              redirectTo: inviteUrl,
            });

            if (resetError) {
              throw new Error(`Failed to send password setup email: ${resetError.message}`);
            }
          }
        } else {
          const { error: resetError } = await supabase.auth.resetPasswordForEmail(recipientEmail, {
            redirectTo: inviteUrl,
          });

          if (resetError) {
            throw new Error(`Failed to send password setup email: ${resetError.message}`);
          }
        }

        emailSent = true;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailSent,
        suppressed,
        message: !shouldSendEmail
          ? "Member added (email invite disabled)"
          : suppressed
            ? "Member added (email is suppressed)"
            : `Invite sent to ${recipientEmail}`,
        inviteUrl,
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