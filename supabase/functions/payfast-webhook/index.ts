// PayFast ITN (Instant Transaction Notification) webhook
// Verifies signature, validates with PayFast, and marks payments as paid + activates membership.
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import md5 from "npm:blueimp-md5@2.19.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function md5Hex(input: string): string {
  return md5(input);
}

function pfEncode(value: string): string {
  return encodeURIComponent(value)
    .replace(/%20/g, "+")
    .replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

function buildSignatureString(params: Record<string, string>, passphrase?: string): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (k === "signature") continue;
    if (v === undefined || v === null || v === "") continue;
    parts.push(`${k}=${pfEncode(v)}`);
  }
  if (passphrase && passphrase.trim() !== "") {
    parts.push(`passphrase=${pfEncode(passphrase.trim())}`);
  }
  return parts.join("&");
}

function planExpiresAt(plan: string): string {
  const ms = plan === "annual" ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
  return new Date(Date.now() + ms).toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const rawBody = await req.text();
    const params: Record<string, string> = {};
    const orderedKeys: string[] = [];
    for (const [k, v] of new URLSearchParams(rawBody).entries()) {
      if (!(k in params)) orderedKeys.push(k);
      params[k] = v;
    }
    const ordered: Record<string, string> = {};
    for (const k of orderedKeys) ordered[k] = params[k];

    console.log("PayFast ITN received", { m_payment_id: ordered.m_payment_id, payment_status: ordered.payment_status });

    const { data: settings } = await supabase.from("admin_settings").select("*").eq("id", 1).single();
    const passphrase = Deno.env.get("PAYFAST_PASSPHRASE") || "";
    const mode = settings?.payfast_mode === "live" ? "live" : "sandbox";

    // 1. Verify signature
    const expectedSig = md5Hex(buildSignatureString(ordered, passphrase));
    if (expectedSig !== (ordered.signature || "").toLowerCase()) {
      console.error("Signature mismatch", { expected: expectedSig, got: ordered.signature });
      return new Response("Invalid signature", { status: 200, headers: corsHeaders });
    }

    // 2. Validate with PayFast server
    const validateUrl = mode === "live"
      ? "https://www.payfast.co.za/eng/query/validate"
      : "https://sandbox.payfast.co.za/eng/query/validate";
    const validateRes = await fetch(validateUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: rawBody,
    });
    const validateText = (await validateRes.text()).trim();
    if (validateText !== "VALID") {
      console.error("PayFast validation failed", validateText);
      return new Response("Validation failed", { status: 200, headers: corsHeaders });
    }

    // 3. Process payment
    if (ordered.payment_status !== "COMPLETE") {
      console.log("Payment status not COMPLETE, ignoring:", ordered.payment_status);
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    const mPaymentId = ordered.m_payment_id;
    const pfPaymentId = ordered.pf_payment_id;
    const email = ordered.email_address;

    // Branch: event RSVP payment (custom_str1 === "event_rsvp")
    if (ordered.custom_str1 === "event_rsvp" && ordered.custom_str2) {
      const eventId = ordered.custom_str2;
      const { data: rsvp } = await supabase.from("rsvps")
        .select("*").eq("payment_reference", mPaymentId).maybeSingle();
      if (rsvp) {
        if (rsvp.payment_status !== "paid") {
          await supabase.from("rsvps").update({ payment_status: "paid" } as any).eq("id", rsvp.id);
          console.log("Event RSVP marked as paid", { rsvp_id: rsvp.id, event_id: eventId });
        }
      } else {
        console.error("No matching RSVP for payment_reference", mPaymentId);
      }
      return new Response("OK", { status: 200, headers: corsHeaders });
    }


    let { data: payment } = await supabase.from("payments")
      .select("*").eq("payment_reference", mPaymentId).maybeSingle();

    if (!payment && email) {
      const { data: usersList } = await supabase.auth.admin.listUsers();
      const user = usersList?.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
      if (user) {
        const { data: pending } = await supabase.from("payments")
          .select("*").eq("user_id", user.id).eq("status", "pending")
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
        payment = pending;
      }
    }

    if (!payment) {
      console.error("No matching payment found for", mPaymentId);
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    if (payment.status === "completed") {
      console.log("Payment already completed");
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    await supabase.from("payments").update({
      status: "completed",
      payfast_payment_id: pfPaymentId,
    }).eq("id", payment.id);

    const plan = payment.plan === "annual" ? "annual" : "monthly";
    const expiresAt = planExpiresAt(plan);
    const { data: existingMem } = await supabase.from("memberships")
      .select("id").eq("user_id", payment.user_id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();

    if (existingMem) {
      await supabase.from("memberships").update({
        status: "active", plan, starts_at: new Date().toISOString(), expires_at: expiresAt,
      }).eq("id", existingMem.id);
    } else {
      await supabase.from("memberships").insert({
        user_id: payment.user_id, plan, status: "active",
        starts_at: new Date().toISOString(), expires_at: expiresAt,
      });
    }

    await supabase.from("user_roles").upsert(
      { user_id: payment.user_id, role: "member" },
      { onConflict: "user_id,role" },
    );

    console.log("Payment completed and membership activated for user", payment.user_id);
    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error("PayFast webhook error", err);
    return new Response("Error logged", { status: 200, headers: corsHeaders });
  }
});
