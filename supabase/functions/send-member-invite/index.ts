import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

    const { email, full_name, plan, purchase_date, send_email } = await req.json();
    if (!email || !full_name) throw new Error('Email and full name are required');

    const siteUrl = req.headers.get('origin') || 'https://wibmembers.lovable.app';
    const onboardingUrl = `${siteUrl}/auth?tab=signup&email=${encodeURIComponent(email)}&invited=true`;

    // Check admin settings for email invite toggle
    const { data: settings } = await supabase.from('admin_settings').select('send_invite_emails').eq('id', 1).single();
    const shouldSendEmail = send_email !== false && (settings?.send_invite_emails !== false);

    if (shouldSendEmail) {
      // Send invite via Supabase auth admin (creates user + sends invite email)
      const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: { full_name, invited: true },
        redirectTo: `${siteUrl}/onboarding`,
      });

      if (inviteError) {
        console.error('Invite error:', inviteError);
        // If user already exists, just send the transactional email
        if (inviteError.message.includes('already been registered')) {
          // Send transactional invite email instead
          await sendTransactionalInvite(supabase, email, full_name, plan, purchase_date, onboardingUrl);
        } else {
          throw new Error(`Failed to send invite: ${inviteError.message}`);
        }
      }

      // Also send the branded transactional invite email
      await sendTransactionalInvite(supabase, email, full_name, plan, purchase_date, onboardingUrl);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: shouldSendEmail ? `Invite sent to ${email}` : `Member added (email invite disabled)`,
      emailSent: shouldSendEmail,
      onboardingUrl,
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

async function sendTransactionalInvite(
  supabase: any, 
  email: string, 
  fullName: string, 
  plan: string, 
  purchaseDate: string, 
  onboardingUrl: string
) {
  const LOGO_URL = 'https://mywbsqmluljyyfvpfbqv.supabase.co/storage/v1/object/public/email-assets/wib-logo.png';
  const SITE_NAME = 'Women In Business';
  const SENDER_DOMAIN = 'notify.womeninbusiness.livents.co.za';
  const FROM_DOMAIN = 'womeninbusiness.livents.co.za';

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
    body { margin: 0; padding: 0; background-color: #FFF9F0; font-family: 'Roboto', Arial, sans-serif; }
    .container { max-width: 500px; margin: 0 auto; padding: 40px 30px; }
    .logo { display: block; margin: 0 auto 24px; width: 120px; }
    h1 { font-size: 24px; font-weight: bold; color: #1F1F1F; margin: 0 0 20px; text-align: center; }
    p { font-size: 15px; color: #666666; line-height: 1.6; margin: 0 0 20px; }
    .btn { display: block; background-color: #DD1C1A; color: #ffffff !important; font-size: 15px; font-weight: bold; border-radius: 5px; padding: 14px 28px; text-decoration: none; text-align: center; margin: 0 auto; max-width: 280px; }
    hr { border: none; border-top: 1px solid #E8DCC8; margin: 30px 0; }
    .footer { font-size: 12px; color: #999999; margin: 0 0 8px; text-align: center; }
    .footer-brand { font-size: 11px; color: #BBBBBB; text-align: center; margin: 0; }
    .detail-box { background: #FFF5E6; border: 1px solid #E8DCC8; border-radius: 5px; padding: 16px; margin: 0 0 20px; }
    .detail-box p { margin: 4px 0; font-size: 14px; }
    .highlight { color: #DD1C1A; font-weight: bold; }
  </style></head><body><div class="container">
    <img src="${LOGO_URL}" alt="Women In Business" class="logo">
    <h1>You're Invited!</h1>
    <p>Hello <strong>${fullName}</strong>,</p>
    <p>You've been invited to join <strong>${SITE_NAME}</strong>, South Africa's premier membership community for entrepreneurial women.</p>
    <div class="detail-box">
      <p><strong>Plan:</strong> ${plan === 'annual' ? 'Annual — R500/yr' : 'Monthly — R50/mo'}</p>
      <p><strong>Membership Date:</strong> ${purchaseDate || 'Current'}</p>
    </div>
    <p>Click below to get started — set up your account and complete your membership:</p>
    <a href="${onboardingUrl}" class="btn">Get Started</a>
    <hr>
    <p class="footer">This invitation was sent by the WIB admin team.</p>
    <p class="footer-brand">Women In Business · Non Profit Organisation (2020/911027/08)</p>
  </div></body></html>`;

  const messageId = `member-invite-${crypto.randomUUID()}`;

  await supabase.from('email_send_log').insert({
    message_id: messageId,
    template_name: 'member-invite',
    recipient_email: email,
    status: 'pending',
  });

  await supabase.rpc('enqueue_email', {
    queue_name: 'transactional_emails',
    payload: {
      message_id: messageId,
      to: email,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject: `You're Invited to Join ${SITE_NAME}!`,
      html,
      text: `Hello ${fullName}, you've been invited to join Women In Business. Visit ${onboardingUrl} to get started.`,
      purpose: 'transactional',
      label: 'member-invite',
      queued_at: new Date().toISOString(),
    },
  });
}
