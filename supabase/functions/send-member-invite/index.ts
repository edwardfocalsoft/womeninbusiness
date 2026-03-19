import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_SITE_URL = "https://womeninbusiness.livents.co.za";
const SITE_NAME = "Women In Business";
const SENDER_DOMAIN = "notify.womeninbusiness.livents.co.za";
const FROM_DOMAIN = "womeninbusiness.livents.co.za";

type MemberType = "new" | "active" | "expired";

const getSiteUrl = () => {
  const configured = (Deno.env.get("PUBLIC_SITE_URL") || DEFAULT_SITE_URL).trim();
  return configured.endsWith("/") ? configured.slice(0, -1) : configured;
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const normalizeMemberType = (value: string | undefined): MemberType => {
  if (value === "active" || value === "expired") return value;
  return "new";
};

const getRequestRunId = (req: Request, explicitRunId: unknown): string | null => {
  if (typeof explicitRunId === "string" && explicitRunId.trim().length > 0) {
    return explicitRunId.trim();
  }

  const candidates = [
    req.headers.get("x-lovable-run-id"),
    req.headers.get("x-run-id"),
    req.headers.get("x-lovable-runid"),
  ];

  for (const candidate of candidates) {
    if (candidate && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return null;
};

function getInviteCopy(memberType: MemberType, fullName: string, inviteUrl: string) {
  const firstName = fullName.trim().split(" ")[0] || fullName;

  if (memberType === "expired") {
    return {
      subject: "Renew Your Women In Business Membership",
      preheader: "Set your password, then renew to continue enjoying member benefits.",
      heading: `Welcome back, ${firstName}`,
      body: "Your previous membership has expired. Please set your password first, then renew your membership to continue enjoying Women In Business benefits.",
      ctaLabel: "Set Password & Renew",
      ctaUrl: inviteUrl,
      text: `Hi ${firstName}, your membership has expired. Set your password first, then renew your membership here: ${inviteUrl}`,
    };
  }

  if (memberType === "active") {
    return {
      subject: "Complete Your Women In Business Profile",
      preheader: "Set your password and complete your profile.",
      heading: `Hi ${firstName}`,
      body: "Your membership is already active. Please set your password and complete your online profile to unlock the full member experience.",
      ctaLabel: "Set Password & Continue",
      ctaUrl: inviteUrl,
      text: `Hi ${firstName}, your membership is active. Set your password and complete your profile here: ${inviteUrl}`,
    };
  }

  return {
    subject: "You're Invited to Join Women In Business",
    preheader: "Set your password and complete membership payment to get started.",
    heading: `Welcome ${firstName}`,
    body: "You were added by the Women In Business admin team. Please set your password first, then complete your membership payment to enjoy all member benefits.",
    ctaLabel: "Set Password & Get Started",
    ctaUrl: inviteUrl,
    text: `Hi ${firstName}, you were invited to join Women In Business. Set your password and then complete membership payment here: ${inviteUrl}`,
  };
}

function renderEmailHtml(copy: ReturnType<typeof getInviteCopy>) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(copy.subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#FFF9F0;font-family:Roboto,Arial,sans-serif;">
    <div style="max-width:520px;margin:0 auto;padding:36px 28px;">
      <p style="font-size:12px;color:#999999;letter-spacing:0.08em;text-transform:uppercase;font-weight:700;">${SITE_NAME}</p>
      <h1 style="margin:0 0 14px;font-size:24px;line-height:1.3;color:#1F1F1F;">${escapeHtml(copy.heading)}</h1>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#666666;">${escapeHtml(copy.body)}</p>
      <a href="${copy.ctaUrl}" style="display:inline-block;background:#DD1C1A;color:#ffffff;text-decoration:none;font-weight:700;border-radius:5px;padding:14px 24px;">
        ${escapeHtml(copy.ctaLabel)}
      </a>
      <p style="margin:26px 0 8px;font-size:12px;color:#999999;">If the button does not work, copy this link into your browser:</p>
      <p style="margin:0;font-size:12px;word-break:break-word;"><a href="${copy.ctaUrl}" style="color:#DD1C1A;">${copy.ctaUrl}</a></p>
      <hr style="border:none;border-top:1px solid #E8DCC8;margin:28px 0;" />
      <p style="margin:0;font-size:11px;color:#BBBBBB;">Women In Business · Non Profit Organisation (2020/911027/08)</p>
    </div>
  </body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

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

    const { email, full_name, send_email, member_type, run_id } = await req.json();

    const recipientEmail = String(email || "").trim().toLowerCase();
    const recipientName = String(full_name || "").trim();

    if (!recipientEmail || !recipientName) {
      throw new Error("Email and full name are required");
    }

    const memberType = normalizeMemberType(member_type);
    const siteUrl = getSiteUrl();
    const requestRunId = getRequestRunId(req, run_id);
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
        const copy = getInviteCopy(memberType, recipientName, inviteUrl);
        const messageId = `member-invite-${crypto.randomUUID()}`;

        await supabase.from("email_send_log").insert({
          message_id: messageId,
          template_name: "member-invite",
          recipient_email: recipientEmail,
          status: "pending",
          metadata: { member_type: memberType },
        });

        const { error: enqueueError } = await supabase.rpc("enqueue_email", {
          queue_name: "transactional_emails",
          payload: {
            message_id: messageId,
            ...(requestRunId ? { run_id: requestRunId } : {}),
            to: recipientEmail,
            from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
            sender_domain: SENDER_DOMAIN,
            subject: copy.subject,
            html: renderEmailHtml(copy),
            text: copy.text,
            purpose: "transactional",
            label: "member-invite",
            queued_at: new Date().toISOString(),
          },
        });

        if (enqueueError) {
          throw new Error(`Failed to enqueue invite email: ${enqueueError.message}`);
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
