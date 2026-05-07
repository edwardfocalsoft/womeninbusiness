import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { AlertCircle, ArrowRight, CalendarDays, CheckCircle2, CreditCard, Building2, Clock, Upload, Loader2, ShieldCheck } from 'lucide-react';
import TagInput from '@/components/TagInput';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import liventsLogoAlt from '@/assets/livents-logo-alt.png';

const SERVICE_SUGGESTIONS = [
  'Catering', 'Event Planning', 'Graphic Design', 'Web Development',
  'Photography', 'Marketing', 'Consulting', 'Training', 'Coaching',
  'Beauty Services', 'Fashion Design', 'Interior Design', 'Accounting',
  'Legal Services', 'Real Estate', 'Transport', 'Cleaning Services',
  'Agriculture', 'Food Production', 'Retail', 'Import/Export',
  'Social Media Management', 'Content Creation', 'PR & Communications',
  'Health & Wellness', 'Fitness', 'Childcare', 'Tutoring', 'IT Support',
];

type OnboardingStep = 'payment' | 'pending-confirmation' | 'business-details' | 'complete';

const INDUSTRIES = [
  'Agriculture', 'Arts & Entertainment', 'Beauty & Wellness', 'Construction',
  'Consulting', 'Education & Training', 'Engineering', 'Fashion & Textiles',
  'Finance & Accounting', 'Food & Beverage', 'Healthcare', 'Hospitality & Tourism',
  'Information Technology', 'Legal Services', 'Manufacturing', 'Marketing & Advertising',
  'Media & Communications', 'Mining', 'Non-Profit', 'Real Estate', 'Retail',
  'Social Services', 'Sports & Recreation', 'Transport & Logistics', 'Other',
];

function CompleteStep({ navigate, nextPath }: { navigate: (path: string) => void; nextPath: string }) {
  const [countdown, setCountdown] = useState(5);
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); navigate(nextPath); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigate, nextPath]);

  return (
    <div className="rounded-[5px] border border-border bg-card p-8 shadow-sm text-center">
      <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
      <h2 className="text-xl font-bold mb-2">You're All Set!</h2>
      <p className="text-muted-foreground text-sm mb-4">Next: complete your compliance details so we can support your business.</p>
      <p className="text-xs text-muted-foreground mb-6">Redirecting in {countdown} second{countdown !== 1 ? 's' : ''}...</p>
      <Button className="gap-2" onClick={() => navigate(nextPath)}>
        Continue <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

export default function Onboarding() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<OnboardingStep>('payment');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [payfastLoading, setPayfastLoading] = useState(false);
  const [hasPaid, setHasPaid] = useState<'unanswered' | 'yes' | 'no'>('unanswered');
  const [membership, setMembership] = useState<any>(null);
  const [pendingMember, setPendingMember] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('monthly');
  const [settings, setSettings] = useState<any>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [billingDateModalOpen, setBillingDateModalOpen] = useState(false);
  const [selectedBillingDay, setSelectedBillingDay] = useState<1 | 15 | 25>(1);
  const [businessForm, setBusinessForm] = useState({
    business_name: '', industry: '', products_services: '',
    location: '', phone: '', website: '', bio: '',
  });

  // Load admin settings for prices
  useEffect(() => {
    supabase.from('admin_settings').select('*').eq('id', 1).single().then(({ data }) => {
      if (data) setSettings(data);
    });
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (isAdmin) { navigate('/admin/members', { replace: true }); return; }
    if (!user) { navigate('/auth?tab=signup&invited=true'); return; }
    checkMembershipStatus();
  }, [user, isAdmin, authLoading]);

  const checkMembershipStatus = async () => {
    if (!user) return;

    const [membershipRes, profileRes, pendingRes, pendingPaymentRes, claimRes] = await Promise.all([
      supabase.from('memberships').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('profiles').select('*').eq('user_id', user.id).single(),
      supabase.from('pending_members').select('*').eq('email', user.email || '').eq('status', 'pending').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('payments').select('*').eq('user_id', user.id).eq('status', 'pending').eq('payment_method', 'offline').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('membership_claims').select('*').eq('user_id', user.id).eq('status', 'pending').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

    setProfile(profileRes.data);
    setMembership(membershipRes.data);
    setPendingMember(pendingRes.data);

    if (pendingRes.data?.plan) setSelectedPlan(pendingRes.data.plan as 'monthly' | 'annual');

    if (profileRes.data) {
      setBusinessForm({
        business_name: profileRes.data.business_name || '',
        industry: profileRes.data.industry || '',
        products_services: profileRes.data.products_services || '',
        location: profileRes.data.location || '',
        phone: profileRes.data.phone || '',
        website: profileRes.data.website || '',
        bio: profileRes.data.bio || '',
      });
    }

    const memberType = (pendingRes.data as any)?.member_type || searchParams.get('member_type') || 'new';
    const m = membershipRes.data;

    // Check for active claim with temporary access
    if (claimRes.data) {
      const granted = claimRes.data.granted_until ? new Date(claimRes.data.granted_until) : null;
      if (granted && granted > new Date()) {
        // User has temporary access, let them through to business details or dashboard
        if (profileRes.data?.onboarding_completed) { navigate('/dashboard'); return; }
        setStep('business-details');
        setLoading(false);
        return;
      }
    }

    // Check for pending offline payment - always show pending screen
    if (pendingPaymentRes.data) {
      setStep('pending-confirmation');
      setLoading(false);
      return;
    }

    if (m && m.status === 'active' && new Date(m.expires_at) >= new Date()) {
      if (profileRes.data?.onboarding_completed) { navigate('/dashboard'); return; }
      setStep('business-details');
    } else if (memberType === 'active') {
      if (!m && pendingRes.data) {
        const pd = pendingRes.data as any;
        const expiresAt = pd.expires_at || (pd.plan === 'annual'
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());
        await supabase.from('memberships').insert({
          user_id: user.id, plan: pd.plan, status: 'active',
          starts_at: pd.purchase_date || new Date().toISOString(), expires_at: expiresAt,
        });
        await supabase.from('user_roles').upsert({ user_id: user.id, role: 'member' as const }, { onConflict: 'user_id,role' });
        await supabase.from('pending_members').update({ status: 'claimed' }).eq('id', pd.id);
      }
      setStep('business-details');
    } else if (m && (m.status === 'expired' || new Date(m.expires_at) < new Date())) {
      setStep('payment');
    } else if (!m && pendingRes.data) {
      setStep('payment');
    } else if (!m) {
      setStep('payment');
    } else {
      setStep('business-details');
    }
    setLoading(false);
  };

  const monthlyPrice = settings?.monthly_price ?? 100;
  const annualPrice = settings?.annual_price ?? 1000;
  const chargeFeeToClient = settings?.charge_fee_to_client ?? true;
  const payfastMode = settings?.payfast_mode ?? 'sandbox';
  const forceRecurring = (settings as any)?.force_payfast_recurring ?? true;

  const baseAmount = selectedPlan === 'annual' ? annualPrice : monthlyPrice;
  // Transaction fee removed — users pay the exact plan amount.
  const payfastFee = 0;
  const payfastTotal = baseAmount;

  const getMerchantCredentials = () => {
    if (payfastMode === 'live') {
      return {
        merchantId: settings?.payfast_merchant_id_live || '',
        merchantKey: settings?.payfast_merchant_key_live || '',
        url: 'https://www.payfast.co.za/eng/process',
      };
    }
    return {
      merchantId: '10000100',
      merchantKey: '46f0cd694581a',
      url: 'https://sandbox.payfast.co.za/eng/process',
    };
  };

  // Compute the next occurrence of the chosen billing day-of-month from today
  const getNextBillingDate = (day: number, from: Date = new Date()): Date => {
    const d = new Date(from.getFullYear(), from.getMonth(), day);
    if (d <= from) d.setMonth(d.getMonth() + 1);
    return d;
  };

  const formatYMD = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const formatLongDate = (d: Date) =>
    d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });

  // Pro-rata breakdown for the selected billing day. Only relevant for monthly + recurring.
  const proRataInfo = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextBilling = getNextBillingDate(selectedBillingDay, today);
    const daysUntil = Math.max(1, Math.round((nextBilling.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    const dailyRate = monthlyPrice / 30;
    const proRataAmount = +(dailyRate * daysUntil).toFixed(2);
    const useProRata = daysUntil < 10;
    const initialAmount = useProRata ? +(proRataAmount + monthlyPrice).toFixed(2) : monthlyPrice;
    // Subscription anchor (first recurring charge date)
    const subscriptionStart = useProRata
      ? new Date(nextBilling.getFullYear(), nextBilling.getMonth() + 1, selectedBillingDay)
      : nextBilling;
    return { daysUntil, dailyRate, proRataAmount, useProRata, initialAmount, subscriptionStart, nextBilling };
  })();

  const submitPayfastForm = async (opts: { initialAmount: number; billingDate?: Date; reuseExisting?: boolean }) => {
    if (!user) return;
    const plan = selectedPlan;
    const { merchantId, merchantKey, url } = getMerchantCredentials();
    const paymentId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
    const initialAmount = +opts.initialAmount.toFixed(2);

    const payfastData: Record<string, string> = {
      merchant_id: merchantId, merchant_key: merchantKey,
      return_url: `${window.location.origin}/onboarding?payment=success&plan=${plan}`,
      cancel_url: `${window.location.origin}/onboarding?payment=cancelled`,
      notify_url: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payfast-webhook`,
      name_first: profile?.full_name?.split(' ')[0] || '',
      name_last: profile?.full_name?.split(' ').slice(1).join(' ') || '',
      email_address: user.email || '',
      m_payment_id: paymentId,
      amount: initialAmount.toFixed(2),
      item_name: `Livents ${plan === 'annual' ? 'Annual' : 'Monthly'} Membership`,
      item_description: `Livents ${plan} membership`,
    };

    if (forceRecurring) {
      payfastData.subscription_type = '1';
      payfastData.frequency = plan === 'annual' ? '6' : '3';
      payfastData.cycles = '0';
      payfastData.recurring_amount = monthlyPrice.toFixed(2);
      if (opts.billingDate) payfastData.billing_date = formatYMD(opts.billingDate);
    }

    const { data: existingPending } = await supabase.from('payments')
      .select('id').eq('user_id', user.id).eq('status', 'pending')
      .order('created_at', { ascending: false }).limit(1).maybeSingle();

    if (existingPending) {
      await supabase.from('payments').update({
        amount: initialAmount, transaction_fee: 0,
        net_amount: initialAmount, payment_method: 'payfast',
        payment_reference: paymentId, plan,
      }).eq('id', existingPending.id);
    } else {
      await supabase.from('payments').insert({
        user_id: user.id, amount: initialAmount, transaction_fee: 0,
        net_amount: initialAmount, payment_method: 'payfast',
        payment_reference: paymentId, status: 'pending', plan,
      });
    }

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = url;
    Object.entries(payfastData).forEach(([key, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden'; input.name = key; input.value = value;
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
  };

  const handlePayment = async (method: 'payfast' | 'offline') => {
    if (!user) return;

    if (method === 'payfast') {
      // For monthly + recurring, prompt user to pick a billing date (1st/15th/25th)
      if (selectedPlan === 'monthly' && forceRecurring) {
        setBillingDateModalOpen(true);
        return;
      }
      setPayfastLoading(true);
      try {
        await submitPayfastForm({ initialAmount: payfastTotal });
      } catch (err: any) {
        toast.error(err.message);
        setPayfastLoading(false);
      }
      return;
    }

    setActionLoading(true);
    try {
      const plan = selectedPlan;
      // Offline/EFT payment — reuse existing pending row if present
      const { data: existingPending } = await supabase.from('payments')
        .select('id').eq('user_id', user.id).eq('status', 'pending')
        .order('created_at', { ascending: false }).limit(1).maybeSingle();

      if (existingPending) {
        await supabase.from('payments').update({
          amount: baseAmount, transaction_fee: 0, net_amount: baseAmount,
          payment_method: 'offline', plan,
        }).eq('id', existingPending.id);
      } else {
        await supabase.from('payments').insert({
          user_id: user.id, amount: baseAmount, transaction_fee: 0,
          net_amount: baseAmount, payment_method: 'offline', status: 'pending', plan,
        });
      }

      setStep('pending-confirmation');
    } catch (err: any) {
      toast.error(err.message);
    }
    setActionLoading(false);
  };

  const confirmBillingDateAndPay = async () => {
    setPayfastLoading(true);
    try {
      await submitPayfastForm({
        initialAmount: proRataInfo.initialAmount,
        billingDate: proRataInfo.subscriptionStart,
      });
    } catch (err: any) {
      toast.error(err.message);
      setPayfastLoading(false);
    }
  };

  const grantTemporaryAccess = async () => {
    if (!user) return;
    const grantedUntil = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const { data: existingClaim } = await supabase.from('membership_claims')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingClaim) {
      const { error } = await supabase.from('membership_claims')
        .update({ granted_until: grantedUntil })
        .eq('id', existingClaim.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('membership_claims').insert({
        user_id: user.id,
        status: 'pending',
        granted_until: grantedUntil,
      });
      if (error) throw error;
    }

    await supabase.from('user_roles').upsert(
      { user_id: user.id, role: 'member' as const },
      { onConflict: 'user_id,role' },
    );
  };

  const handleProofUpload = async () => {
    if (!user || !proofFile) return;
    setUploadingProof(true);
    try {
      const ext = proofFile.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('proof-of-payment').upload(path, proofFile);
      if (uploadError) throw uploadError;

      // Update the pending payment with proof URL
      const { error: updateError } = await supabase.from('payments')
        .update({ proof_of_payment_url: path })
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .eq('payment_method', 'offline');
      if (updateError) throw updateError;

      await grantTemporaryAccess();

      toast.success('Proof uploaded. You have 5 days temporary access while admin reviews your payment.');
      setProofFile(null);
      setStep('business-details');
    } catch (err: any) {
      toast.error(err.message);
    }
    setUploadingProof(false);
  };

  const handlePayfastFromPending = async () => {
    if (!user) return;
    if (selectedPlan === 'monthly' && forceRecurring) {
      setBillingDateModalOpen(true);
      return;
    }
    setPayfastLoading(true);
    try {
      await submitPayfastForm({ initialAmount: payfastTotal });
    } catch (err: any) {
      toast.error(err.message);
      setPayfastLoading(false);
    }
  };

  const handleClaimMembership = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      await grantTemporaryAccess();
      
      toast.success('Your claim has been submitted. You have 5 days temporary access while admin reviews.');
      setStep('business-details');
    } catch (err: any) {
      toast.error(err.message);
    }
    setActionLoading(false);
  };

  // Handle PayFast return - auto-mark as paid
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const plan = searchParams.get('plan');
    if (paymentStatus === 'success' && user && plan) {
      activateMembership(plan as 'monthly' | 'annual');
    }
  }, [searchParams, user]);

  const activateMembership = async (plan: 'monthly' | 'annual') => {
    if (!user) return;
    try {
      const expiresAt = plan === 'annual'
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      if (membership) {
        await supabase.from('memberships').update({
          status: 'active', plan, starts_at: new Date().toISOString(), expires_at: expiresAt,
        }).eq('user_id', user.id);
      } else {
        await supabase.from('memberships').insert({
          user_id: user.id, plan, status: 'active',
          starts_at: new Date().toISOString(), expires_at: expiresAt,
        });
      }

      await supabase.from('user_roles').upsert({ user_id: user.id, role: 'member' as const }, { onConflict: 'user_id,role' });
      if (pendingMember) {
        await supabase.from('pending_members').update({ status: 'claimed' }).eq('id', pendingMember.id);
      }
      // Mark ALL pending PayFast payments as completed
      await supabase.from('payments').update({ status: 'completed' }).eq('user_id', user.id).eq('status', 'pending').eq('payment_method', 'payfast');

      toast.success('Payment confirmed! Your membership is now active.');
      setStep('business-details');
      checkMembershipStatus();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSaveBusinessDetails = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      // Auto-prepend https:// when user enters a website without a scheme
      const normalizedForm = { ...businessForm };
      if (normalizedForm.website && !/^https?:\/\//i.test(normalizedForm.website.trim())) {
        normalizedForm.website = `https://${normalizedForm.website.trim()}`;
      }

      const { data: existingProfile } = await supabase.from('profiles').select('id').eq('user_id', user.id).maybeSingle();
      if (existingProfile) {
        const { error } = await supabase.from('profiles').update({ ...normalizedForm, onboarding_completed: true }).eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('profiles').insert({
          user_id: user.id, full_name: profile?.full_name || user.user_metadata?.full_name || '',
          ...normalizedForm, onboarding_completed: true,
        });
        if (error) throw error;
      }

      try {
        await supabase.functions.invoke('send-transactional-email', {
          body: {
            template: 'welcome', to: user.email,
            data: {
              full_name: profile?.full_name || '', member_id: membership?.member_id || '',
              plan: membership?.plan || selectedPlan,
              expires_at: membership?.expires_at ? new Date(membership.expires_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }) : '',
              dashboard_url: `${window.location.origin}/dashboard`,
            },
          },
        });
      } catch { /* Welcome email is non-critical */ }

      setStep('complete');
      toast.success('Business details saved!');
    } catch (err: any) {
      toast.error(err.message);
    }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const isExpired = membership && (membership.status === 'expired' || new Date(membership.expires_at) < new Date());
  const savingsPercent = annualPrice < monthlyPrice * 12 ? Math.round((1 - annualPrice / (monthlyPrice * 12)) * 100) : 0;
  const stepIndex = step === 'payment' ? 0 : step === 'pending-confirmation' ? 0 : step === 'business-details' ? 1 : 2;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-lg px-4">
        <div className="text-center mb-8">
          <img src={liventsLogoAlt} alt="Livents" className="h-12 mx-auto mb-4" />
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            {step === 'payment' ? (isExpired ? 'Renew Your Membership' : 'Activate Your Membership') :
             step === 'pending-confirmation' ? 'Payment Pending' :
             step === 'business-details' ? 'Complete Your Profile' : 'Welcome Aboard!'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {step === 'payment' ? (isExpired ? 'Your membership has expired. Renew to continue.' : 'Choose your plan and complete payment to get started.') :
             step === 'pending-confirmation' ? 'Your EFT payment is being processed.' :
             step === 'business-details' ? 'Tell us about your business to complete onboarding.' : "You're all set!"}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {['Payment', 'Business Details', 'Complete'].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                i <= stepIndex ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {i < stepIndex ? '✓' : i + 1}
              </div>
              <span className={`text-xs hidden sm:inline ${i <= stepIndex ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>{label}</span>
              {i < 2 && <div className={`w-8 h-px ${i < stepIndex ? 'bg-primary' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>

        {/* Payment Step */}
        {step === 'payment' && (
          <div className="space-y-4">
            {isExpired && (
              <div className="flex items-start gap-3 p-4 rounded-[5px] bg-amber-50 border border-amber-200">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Membership Expired</p>
                  <p className="text-xs text-amber-600">Your membership expired on {membership?.expires_at ? new Date(membership.expires_at).toLocaleDateString('en-ZA') : '—'}. Renew to regain access.</p>
                </div>
              </div>
            )}

            {/* Have you paid for your WIB membership? */}
            {hasPaid === 'unanswered' && (
              <div className="rounded-[5px] border border-border bg-card p-6 shadow-sm text-center space-y-4">
                <ShieldCheck className="w-10 h-10 text-primary mx-auto" />
                <h2 className="text-lg font-bold">Have you paid for your WIB membership?</h2>
                <p className="text-sm text-muted-foreground">Let us know so we can set things up correctly.</p>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button variant="outline" className="w-full" onClick={() => setHasPaid('no')} disabled={actionLoading}>
                    No, not yet
                  </Button>
                  <Button className="w-full" onClick={() => { setHasPaid('yes'); handleClaimMembership(); }} loading={actionLoading} loadingText="Submitting...">
                    Yes
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground pt-2">
                  Selecting "Yes" gives you 5 days temporary access while admin verifies your membership.
                </p>
              </div>
            )}

            {hasPaid === 'no' && (
              <>
                {/* Plan Selection */}
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setSelectedPlan('monthly')}
                    className={`rounded-[5px] border-2 p-4 text-center transition-all ${selectedPlan === 'monthly' ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-card hover:border-muted-foreground/30'}`}>
                    <p className="text-2xl font-bold text-foreground">R{monthlyPrice}</p>
                    <p className="text-sm text-muted-foreground">per month</p>
                    {selectedPlan === 'monthly' && <CheckCircle2 className="w-5 h-5 text-primary mx-auto mt-2" />}
                  </button>
                  <button type="button" onClick={() => setSelectedPlan('annual')}
                    className={`rounded-[5px] border-2 p-4 text-center transition-all relative ${selectedPlan === 'annual' ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-card hover:border-muted-foreground/30'}`}>
                    {savingsPercent > 0 && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">SAVE {savingsPercent}%</span>}
                    <p className="text-2xl font-bold text-foreground">R{annualPrice}</p>
                    <p className="text-sm text-muted-foreground">per year</p>
                    {selectedPlan === 'annual' && <CheckCircle2 className="w-5 h-5 text-primary mx-auto mt-2" />}
                  </button>
                </div>

                <div className="rounded-[5px] border border-border bg-card p-6 shadow-sm">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    {selectedPlan === 'annual' ? 'Annual' : 'Monthly'} Membership
                  </h2>

                  <div className="space-y-3">
                    <Button className="w-full gap-2" onClick={() => handlePayment('payfast')} loading={payfastLoading} loadingText="Redirecting to PayFast..." disabled={actionLoading}>
                      <CreditCard className="w-4 h-4" /> Pay with PayFast — R{payfastTotal.toFixed(2)}
                    </Button>
                    {forceRecurring && (
                      <p className="text-center text-[11px] text-muted-foreground">
                        Auto-renews {selectedPlan === 'annual' ? 'annually' : 'monthly'} — you'll be auto-debited on your renewal date. Cancel anytime via support.
                      </p>
                    )}

                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                      <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or</span></div>
                    </div>

                    <Button variant="outline" className="w-full gap-2" onClick={() => handlePayment('offline')} loading={actionLoading} loadingText="Saving..." disabled={payfastLoading}>
                      Pay via EFT — R{baseAmount.toFixed(2)}
                    </Button>
                  </div>

                  <div className="mt-6 p-4 rounded-[5px] bg-muted/50 border border-border">
                    <p className="text-xs font-bold text-foreground mb-2">EFT Banking Details</p>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p><strong>Bank:</strong> Capitec</p>
                      <p><strong>Branch Code:</strong> 470010</p>
                      <p><strong>Account Number:</strong> 1972031382</p>
                      <p><strong>Reference:</strong> LIV-{user?.email?.split('@')[0]}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">After EFT payment, the admin will verify and activate your membership.</p>
                  </div>
                </div>

                <button type="button" className="text-xs text-muted-foreground hover:text-foreground underline w-full text-center" onClick={() => setHasPaid('unanswered')}>
                  ← Back
                </button>
              </>
            )}

          </div>
        )}

        {/* Pending Confirmation Step */}
        {step === 'pending-confirmation' && (
          <div className="rounded-[5px] border border-border bg-card p-8 shadow-sm text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
              <Clock className="w-8 h-8 text-amber-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-2">Payment Pending Confirmation</h2>
              <p className="text-muted-foreground text-sm">
                Please make your EFT payment and attach your proof of payment.
              </p>
            </div>

            <div className="p-4 rounded-[5px] bg-muted/50 border border-border text-left">
              <p className="text-xs font-bold text-foreground mb-2">EFT Banking Details</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p><strong>Bank:</strong> Capitec</p>
                <p><strong>Branch Code:</strong> 470010</p>
                <p><strong>Account Number:</strong> 1972031382</p>
                <p><strong>Reference:</strong> LIV-{user?.email?.split('@')[0]}</p>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Please ensure you use the reference above when making your payment.</p>
            </div>

            {/* Proof of Payment Upload */}
            <div className="p-4 rounded-[5px] bg-blue-50 border border-blue-200 text-left space-y-3">
              <p className="text-sm font-bold text-blue-800 flex items-center gap-2"><Upload className="w-4 h-4" /> Upload Proof of Payment</p>
              <p className="text-xs text-blue-600">Upload a screenshot or PDF of your EFT confirmation to speed up verification.</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => setProofFile(e.target.files?.[0] || null)}
              />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-3 h-3" /> {proofFile ? proofFile.name : 'Choose File'}
                </Button>
                {proofFile && (
                  <Button size="sm" className="gap-1 text-xs" onClick={handleProofUpload} loading={uploadingProof} loadingText="Uploading...">
                    <CheckCircle2 className="w-3 h-3" /> Submit & Continue
                  </Button>
                )}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or pay instantly</span></div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-3">Don't want to wait? Pay instantly with PayFast.</p>
              <Button className="w-full gap-2" onClick={handlePayfastFromPending} loading={payfastLoading} loadingText="Redirecting to PayFast...">
                <CreditCard className="w-4 h-4" /> Pay with PayFast — R{payfastTotal.toFixed(2)}
              </Button>
              {forceRecurring && (
                <p className="text-center text-[11px] text-muted-foreground mt-2">
                  Auto-renews {selectedPlan === 'annual' ? 'annually' : 'monthly'} — you'll be auto-debited on your renewal date.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Business Details Step */}
        {step === 'business-details' && (
          <div className="rounded-[5px] border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold">Business Details</h2>
            </div>
            <p className="text-sm text-muted-foreground">These details help other members discover and connect with your business.</p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Business Name *</Label>
                <Input value={businessForm.business_name} onChange={e => setBusinessForm(p => ({ ...p, business_name: e.target.value }))} placeholder="Your Business Name" />
              </div>
              <div>
                <Label>Industry *</Label>
                <Select value={businessForm.industry} onValueChange={v => setBusinessForm(p => ({ ...p, industry: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select your industry" /></SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map(ind => <SelectItem key={ind} value={ind}>{ind}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Location</Label>
                <AddressAutocomplete value={businessForm.location} onChange={v => setBusinessForm(p => ({ ...p, location: v }))} placeholder="Start typing your business address..." />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={businessForm.phone} onChange={e => setBusinessForm(p => ({ ...p, phone: e.target.value }))} placeholder="+27..." />
              </div>
              
            </div>
            <div>
              <Label>Products / Services *</Label>
              <TagInput value={businessForm.products_services} onChange={v => setBusinessForm(p => ({ ...p, products_services: v }))} placeholder="e.g. Catering, Event Planning..." maxTags={10} suggestions={SERVICE_SUGGESTIONS} />
            </div>
            

            <Button className="w-full gap-2 font-semibold" onClick={handleSaveBusinessDetails} loading={actionLoading} loadingText="Saving..." disabled={!businessForm.business_name || !businessForm.industry || !businessForm.products_services}>
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Complete Step */}
        {step === 'complete' && <CompleteStep navigate={navigate} nextPath="/compliance?from=onboarding" />}
      </div>

      {/* Billing Date Selection Modal (PayFast monthly recurring) */}
      <Dialog open={billingDateModalOpen} onOpenChange={(o) => !payfastLoading && setBillingDateModalOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" /> Choose Your Billing Date
            </DialogTitle>
            <DialogDescription>
              Pick the day of the month you'd like to be auto-debited going forward.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <RadioGroup
              value={String(selectedBillingDay)}
              onValueChange={(v) => setSelectedBillingDay(Number(v) as 1 | 15 | 25)}
              className="grid grid-cols-3 gap-2"
            >
              {[1, 15, 25].map((d) => (
                <label
                  key={d}
                  htmlFor={`bd-${d}`}
                  className={`cursor-pointer rounded-[5px] border-2 p-3 text-center transition-all ${
                    selectedBillingDay === d ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <RadioGroupItem id={`bd-${d}`} value={String(d)} className="sr-only" />
                  <p className="text-lg font-bold">{d}{d === 1 ? 'st' : 'th'}</p>
                  <p className="text-[10px] text-muted-foreground">of the month</p>
                </label>
              ))}
            </RadioGroup>

            <div className="rounded-[5px] border border-border bg-muted/40 p-4 text-sm space-y-2">
              {proRataInfo.useProRata ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pro-rata ({proRataInfo.daysUntil} day{proRataInfo.daysUntil !== 1 ? 's' : ''} until {formatLongDate(proRataInfo.nextBilling)})</span>
                    <span className="font-medium">R{proRataInfo.proRataAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Next full month (in advance)</span>
                    <span className="font-medium">R{monthlyPrice.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between font-bold">
                    <span>Due today</span>
                    <span className="text-primary">R{proRataInfo.initialAmount.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground pt-1">
                    Your subscription of <strong>R{monthlyPrice.toFixed(2)}/month</strong> will then auto-debit on the{' '}
                    <strong>{selectedBillingDay}{selectedBillingDay === 1 ? 'st' : 'th'}</strong> of each month, starting{' '}
                    <strong>{formatLongDate(proRataInfo.subscriptionStart)}</strong>.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex justify-between font-bold">
                    <span>Due today</span>
                    <span className="text-primary">R{monthlyPrice.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground pt-1">
                    Covers the period until <strong>{formatLongDate(proRataInfo.nextBilling)}</strong>. Your subscription of{' '}
                    <strong>R{monthlyPrice.toFixed(2)}/month</strong> will then auto-debit on the{' '}
                    <strong>{selectedBillingDay}{selectedBillingDay === 1 ? 'st' : 'th'}</strong> of each month thereafter.
                  </p>
                </>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setBillingDateModalOpen(false)} disabled={payfastLoading}>
              Cancel
            </Button>
            <Button onClick={confirmBillingDateAndPay} loading={payfastLoading} loadingText="Redirecting...">
              <CreditCard className="w-4 h-4" /> Continue to PayFast — R{proRataInfo.initialAmount.toFixed(2)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
