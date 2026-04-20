// PayFast ITN (Instant Transaction Notification) webhook
// Verifies signature, validates with PayFast, and marks payments as paid + activates membership.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAYFAST_HOSTS_LIVE = ["www.payfast.co.za", "sandbox.payfast.co.za", "w1w.payfast.co.za", "w2w.payfast.co.za"];

function md5(input: string): Promise<string> {
  // Use Web Crypto via SubtleCrypto isn't available for MD5; use a small implementation
  return Promise.resolve(md5Sync(input));
}

// Tiny MD5 implementation (public domain) — needed because PayFast uses MD5 signatures.
function md5Sync(str: string): string {
  function rh(n: number) {
    const hex = "0123456789abcdef";
    let s = "", j = 0;
    for (; j <= 3; j++)
      s += hex.charAt((n >> (j * 8 + 4)) & 0x0F) + hex.charAt((n >> (j * 8)) & 0x0F);
    return s;
  }
  function ad(x: number, y: number) {
    const l = (x & 0xFFFF) + (y & 0xFFFF);
    const m = (x >> 16) + (y >> 16) + (l >> 16);
    return (m << 16) | (l & 0xFFFF);
  }
  function rl(n: number, c: number) { return (n << c) | (n >>> (32 - c)); }
  function cm(q: number, a: number, b: number, x: number, s: number, t: number) {
    return ad(rl(ad(ad(a, q), ad(x, t)), s), b);
  }
  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cm((b & c) | ((~b) & d), a, b, x, s, t); }
  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cm((b & d) | (c & (~d)), a, b, x, s, t); }
  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cm(b ^ c ^ d, a, b, x, s, t); }
  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cm(c ^ (b | (~d)), a, b, x, s, t); }
  function sb(s: string) {
    let i; const nblk = ((s.length + 8) >> 6) + 1; const blks = new Array(nblk * 16);
    for (i = 0; i < nblk * 16; i++) blks[i] = 0;
    for (i = 0; i < s.length; i++) blks[i >> 2] |= s.charCodeAt(i) << ((i % 4) * 8);
    blks[i >> 2] |= 0x80 << ((i % 4) * 8);
    blks[nblk * 16 - 2] = s.length * 8;
    return blks;
  }
  const x = sb(unescape(encodeURIComponent(str)));
  let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
  for (let i = 0; i < x.length; i += 16) {
    const oa = a, ob = b, oc = c, od = d;
    a = ff(a, b, c, d, x[i + 0], 7, -680876936); d = ff(d, a, b, c, x[i + 1], 12, -389564586);
    c = ff(c, d, a, b, x[i + 2], 17, 606105819); b = ff(b, c, d, a, x[i + 3], 22, -1044525330);
    a = ff(a, b, c, d, x[i + 4], 7, -176418897); d = ff(d, a, b, c, x[i + 5], 12, 1200080426);
    c = ff(c, d, a, b, x[i + 6], 17, -1473231341); b = ff(b, c, d, a, x[i + 7], 22, -45705983);
    a = ff(a, b, c, d, x[i + 8], 7, 1770035416); d = ff(d, a, b, c, x[i + 9], 12, -1958414417);
    c = ff(c, d, a, b, x[i + 10], 17, -42063); b = ff(b, c, d, a, x[i + 11], 22, -1990404162);
    a = ff(a, b, c, d, x[i + 12], 7, 1804603682); d = ff(d, a, b, c, x[i + 13], 12, -40341101);
    c = ff(c, d, a, b, x[i + 14], 17, -1502002290); b = ff(b, c, d, a, x[i + 15], 22, 1236535329);
    a = gg(a, b, c, d, x[i + 1], 5, -165796510); d = gg(d, a, b, c, x[i + 6], 9, -1069501632);
    c = gg(c, d, a, b, x[i + 11], 14, 643717713); b = gg(b, c, d, a, x[i + 0], 20, -373897302);
    a = gg(a, b, c, d, x[i + 5], 5, -701558691); d = gg(d, a, b, c, x[i + 10], 9, 38016083);
    c = gg(c, d, a, b, x[i + 15], 14, -660478335); b = gg(b, c, d, a, x[i + 4], 20, -405537848);
    a = gg(a, b, c, d, x[i + 9], 5, 568446438); d = gg(d, a, b, c, x[i + 14], 9, -1019803690);
    c = gg(c, d, a, b, x[i + 3], 14, -187363961); b = gg(b, c, d, a, x[i + 8], 20, 1163531501);
    a = gg(a, b, c, d, x[i + 13], 5, -1444681467); d = gg(d, a, b, c, x[i + 2], 9, -51403784);
    c = gg(c, d, a, b, x[i + 7], 14, 1735328473); b = gg(b, c, d, a, x[i + 12], 20, -1926607734);
    a = hh(a, b, c, d, x[i + 5], 4, -378558); d = hh(d, a, b, c, x[i + 8], 11, -2022574463);
    c = hh(c, d, a, b, x[i + 11], 16, 1839030562); b = hh(b, c, d, a, x[i + 14], 23, -35309556);
    a = hh(a, b, c, d, x[i + 1], 4, -1530992060); d = hh(d, a, b, c, x[i + 4], 11, 1272893353);
    c = hh(c, d, a, b, x[i + 7], 16, -155497632); b = hh(b, c, d, a, x[i + 10], 23, -1094730640);
    a = hh(a, b, c, d, x[i + 13], 4, 681279174); d = hh(d, a, b, c, x[i + 0], 11, -358537222);
    c = hh(c, d, a, b, x[i + 3], 16, -722521979); b = hh(b, c, d, a, x[i + 6], 23, 76029189);
    a = hh(a, b, c, d, x[i + 9], 4, -640364487); d = hh(d, a, b, c, x[i + 12], 11, -421815835);
    c = hh(c, d, a, b, x[i + 15], 16, 530742520); b = hh(b, c, d, a, x[i + 2], 23, -995338651);
    a = ii(a, b, c, d, x[i + 0], 6, -198630844); d = ii(d, a, b, c, x[i + 7], 10, 1126891415);
    c = ii(c, d, a, b, x[i + 14], 15, -1416354905); b = ii(b, c, d, a, x[i + 5], 21, -57434055);
    a = ii(a, b, c, d, x[i + 12], 6, 1700485571); d = ii(d, a, b, c, x[i + 3], 10, -1894986606);
    c = ii(c, d, a, b, x[i + 10], 15, -1051523); b = ii(b, c, d, a, x[i + 1], 21, -2054922799);
    a = ii(a, b, c, d, x[i + 8], 6, 1873313359); d = ii(d, a, b, c, x[i + 15], 10, -30611744);
    c = ii(c, d, a, b, x[i + 6], 15, -1560198380); b = ii(b, c, d, a, x[i + 13], 21, 1309151649);
    a = ii(a, b, c, d, x[i + 4], 6, -145523070); d = ii(d, a, b, c, x[i + 11], 10, -1120210379);
    c = ii(c, d, a, b, x[i + 2], 15, 718787259); b = ii(b, c, d, a, x[i + 9], 21, -343485551);
    a = ad(a, oa); b = ad(b, ob); c = ad(c, oc); d = ad(d, od);
  }
  return rh(a) + rh(b) + rh(c) + rh(d);
}

function pfEncode(value: string): string {
  // PayFast uppercases the percent-encoding and encodes spaces as '+'
  return encodeURIComponent(value).replace(/%20/g, "+").replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

function buildSignatureString(params: Record<string, string>, passphrase?: string): string {
  // PayFast spec: use the order of fields as POSTed (NOT alphabetical).
  // Exclude the signature field itself. Empty values are skipped.
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

    // Parse form-encoded body from PayFast
    const rawBody = await req.text();
    const params: Record<string, string> = {};
    const orderedKeys: string[] = [];
    for (const [k, v] of new URLSearchParams(rawBody).entries()) {
      if (!(k in params)) orderedKeys.push(k);
      params[k] = v;
    }
    // Preserve original order
    const ordered: Record<string, string> = {};
    for (const k of orderedKeys) ordered[k] = params[k];

    console.log("PayFast ITN received", { m_payment_id: ordered.m_payment_id, payment_status: ordered.payment_status });

    // Fetch settings to know mode + passphrase (passphrase optional, stored as secret)
    const { data: settings } = await supabase.from("admin_settings").select("*").eq("id", 1).single();
    const passphrase = Deno.env.get("PAYFAST_PASSPHRASE") || "";
    const mode = settings?.payfast_mode === "live" ? "live" : "sandbox";

    // 1. Verify signature
    const expectedSig = md5Sync(buildSignatureString(ordered, passphrase));
    if (expectedSig !== (ordered.signature || "").toLowerCase()) {
      console.error("Signature mismatch", { expected: expectedSig, got: ordered.signature });
      // Still respond 200 — PayFast retries on non-200, and we don't want infinite retries on bad sigs.
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

    // Find the payment row by reference, fall back to the user's pending payment
    let { data: payment } = await supabase.from("payments")
      .select("*").eq("payment_reference", mPaymentId).maybeSingle();

    if (!payment && email) {
      // fallback: look up user via auth admin
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

    // Mark payment completed
    await supabase.from("payments").update({
      status: "completed",
      payfast_payment_id: pfPaymentId,
    }).eq("id", payment.id);

    // Activate membership
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
    // Return 200 to avoid PayFast retry storms; we've logged the error.
    return new Response("Error logged", { status: 200, headers: corsHeaders });
  }
});
