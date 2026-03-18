import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const LOGO_URL = 'https://mywbsqmluljyyfvpfbqv.supabase.co/storage/v1/object/public/email-assets/wib-logo.png';
const SITE_NAME = 'Women In Business';
const SENDER_DOMAIN = 'notify.womeninbusiness.livents.co.za';
const FROM_DOMAIN = 'womeninbusiness.livents.co.za';

function generateEmailHtml(template: string, data: Record<string, any>): { html: string; subject: string } {
  const baseStyle = `
    body { margin: 0; padding: 0; background-color: #FFF9F0; font-family: 'Roboto', Arial, sans-serif; }
    .container { max-width: 500px; margin: 0 auto; padding: 40px 30px; }
    .logo { display: block; margin: 0 auto 24px; width: 120px; }
    h1 { font-size: 24px; font-weight: bold; color: #1F1F1F; margin: 0 0 20px; text-align: center; }
    p { font-size: 15px; color: #666666; line-height: 1.6; margin: 0 0 20px; }
    .btn { display: block; background-color: #DD1C1A; color: #ffffff !important; font-size: 15px; font-weight: bold; border-radius: 5px; padding: 14px 28px; text-decoration: none; text-align: center; margin: 0 auto; max-width: 280px; }
    hr { border: none; border-top: 1px solid #E8DCC8; margin: 30px 0; }
    .footer { font-size: 12px; color: #999999; margin: 0 0 8px; text-align: center; }
    .footer-brand { font-size: 11px; color: #BBBBBB; text-align: center; margin: 0; }
    .highlight { color: #DD1C1A; font-weight: bold; }
    .detail-box { background: #FFF5E6; border: 1px solid #E8DCC8; border-radius: 5px; padding: 16px; margin: 0 0 20px; }
    .detail-box p { margin: 4px 0; font-size: 14px; }
  `;

  const wrapper = (subject: string, content: string) => ({
    subject,
    html: `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${baseStyle}</style></head><body><div class="container"><img src="${LOGO_URL}" alt="Women In Business" class="logo">${content}<hr><p class="footer-brand">Women In Business · Non Profit Organisation (2020/911027/08)</p></div></body></html>`
  });

  switch (template) {
    case 'member-invite':
      return wrapper(
        `You're Invited to Join ${SITE_NAME}!`,
        `<h1>You're Invited!</h1>
        <p>Hello <strong>${data.full_name}</strong>,</p>
        <p>You've been invited to join <strong>${SITE_NAME}</strong>, South Africa's premier membership community for entrepreneurial women.</p>
        <div class="detail-box">
          <p><strong>Plan:</strong> ${data.plan === 'annual' ? 'Annual — R500/yr' : 'Monthly — R50/mo'}</p>
          <p><strong>Membership Date:</strong> ${data.purchase_date || 'Current'}</p>
        </div>
        <p>Click below to get started — set up your account and complete your membership:</p>
        <a href="${data.onboarding_url}" class="btn">Get Started</a>
        <p class="footer">This invitation was sent by the WIB admin team.</p>`
      );

    case 'welcome':
      return wrapper(
        `Welcome to ${SITE_NAME}!`,
        `<h1>Welcome Aboard!</h1>
        <p>Hello <strong>${data.full_name}</strong>,</p>
        <p>Your membership is now active! Welcome to the Women In Business community.</p>
        <div class="detail-box">
          <p><strong>Member ID:</strong> <span class="highlight">${data.member_id || '—'}</span></p>
          <p><strong>Plan:</strong> ${data.plan === 'annual' ? 'Annual' : 'Monthly'}</p>
          <p><strong>Valid Until:</strong> ${data.expires_at || '—'}</p>
        </div>
        <p>Explore the platform — connect with fellow entrepreneurs, discover events, and access exclusive resources.</p>
        <a href="${data.dashboard_url}" class="btn">Go to Dashboard</a>
        <p class="footer">Thank you for being part of WIB!</p>`
      );

    case 'rsvp-confirmation':
      return wrapper(
        `Event RSVP Confirmed — ${data.event_title}`,
        `<h1>RSVP Confirmed!</h1>
        <p>Hello <strong>${data.full_name}</strong>,</p>
        <p>You're confirmed for the following event:</p>
        <div class="detail-box">
          <p><strong>Event:</strong> ${data.event_title}</p>
          <p><strong>Date:</strong> ${data.event_date}</p>
          <p><strong>Location:</strong> ${data.event_location || 'TBC'}</p>
          <p><strong>Ticket #:</strong> <span class="highlight">${data.ticket_number}</span></p>
        </div>
        <p>We look forward to seeing you there!</p>
        <a href="${data.event_url}" class="btn">View Event Details</a>
        <p class="footer">Need to cancel? You can manage your RSVP from the member portal.</p>`
      );

    case 'expiry-reminder':
      return wrapper(
        `Your ${SITE_NAME} Membership Expires Soon`,
        `<h1>Membership Expiring Soon</h1>
        <p>Hello <strong>${data.full_name}</strong>,</p>
        <p>Your ${data.plan === 'annual' ? 'annual' : 'monthly'} WIB membership expires in <strong>${data.days_left} day${data.days_left !== 1 ? 's' : ''}</strong> on <strong>${data.expires_at}</strong>.</p>
        <p>Renew now to keep enjoying member benefits — events, networking, resources, and more.</p>
        <a href="${data.renew_url}" class="btn">Renew Membership</a>
        <p class="footer">Questions? Contact us at ceo@womeninbusiness.org.za</p>`
      );

    case 'membership-expired':
      return wrapper(
        `Your ${SITE_NAME} Membership Has Expired`,
        `<h1>Membership Expired</h1>
        <p>Hello <strong>${data.full_name}</strong>,</p>
        <p>Your WIB membership expired on <strong>${data.expires_at}</strong>.</p>
        <p>To continue accessing member benefits, please renew your membership:</p>
        <a href="${data.renew_url}" class="btn">Renew Now</a>
        <p class="footer">We'd love to have you back!</p>`
      );

    default:
      return wrapper('Notification', `<h1>Notification</h1><p>${data.message || 'You have a new notification from Women In Business.'}</p>`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Not authenticated');

    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const anonClient = createClient(supabaseUrl, anonKey);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) throw new Error('Not authenticated');

    const { template, data, to } = await req.json();
    if (!template || !to) throw new Error('Template and recipient email are required');

    const { html, subject } = generateEmailHtml(template, data || {});
    const messageId = `${template}-${crypto.randomUUID()}`;

    // Log pending
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: template,
      recipient_email: to,
      status: 'pending',
    });

    // Check suppression
    const { data: suppressed } = await supabase
      .from('suppressed_emails')
      .select('id')
      .eq('email', to)
      .limit(1);

    if (suppressed && suppressed.length > 0) {
      await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: template,
        recipient_email: to,
        status: 'suppressed',
      });
      return new Response(JSON.stringify({ success: true, suppressed: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Enqueue to transactional queue
    const { error: enqueueError } = await supabase.rpc('enqueue_email', {
      queue_name: 'transactional_emails',
      payload: {
        message_id: messageId,
        run_id: messageId,
        to,
        from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject,
        html,
        text: subject,
        purpose: 'transactional',
        label: template,
        queued_at: new Date().toISOString(),
      },
    });

    if (enqueueError) {
      console.error('Enqueue failed:', enqueueError);
      throw new Error('Failed to enqueue email');
    }

    return new Response(JSON.stringify({ success: true, messageId }), {
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
