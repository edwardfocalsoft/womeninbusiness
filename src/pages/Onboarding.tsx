import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { AlertCircle, ArrowRight, CheckCircle2, CreditCard, Building2 } from 'lucide-react';
import wibLogo from '@/assets/wib-logo.png';

type OnboardingStep = 'payment' | 'business-details' | 'complete';

const INDUSTRIES = [
  'Agriculture',
  'Arts & Entertainment',
  'Beauty & Wellness',
  'Construction',
  'Consulting',
  'Education & Training',
  'Engineering',
  'Fashion & Textiles',
  'Finance & Accounting',
  'Food & Beverage',
  'Healthcare',
  'Hospitality & Tourism',
  'Information Technology',
  'Legal Services',
  'Manufacturing',
  'Marketing & Advertising',
  'Media & Communications',
  'Mining',
  'Non-Profit',
  'Real Estate',
  'Retail',
  'Social Services',
  'Sports & Recreation',
  'Transport & Logistics',
  'Other',
];

function CompleteStep({ navigate }: { navigate: (path: string) => void }) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="rounded-[5px] border border-border bg-card p-8 shadow-sm text-center">
      <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
      <h2 className="text-xl font-bold mb-2">You're All Set!</h2>
      <p className="text-muted-foreground text-sm mb-4">Your profile is complete. Welcome to the Women In Business community!</p>
      <p className="text-xs text-muted-foreground mb-6">Redirecting to dashboard in {countdown} second{countdown !== 1 ? 's' : ''}...</p>
      <Button className="gap-2" onClick={() => navigate('/dashboard')}>
        Go to Dashboard Now <ArrowRight className="w-4 h-4" />
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
  const [membership, setMembership] = useState<any>(null);
  const [pendingMember, setPendingMember] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('monthly');
  const [businessForm, setBusinessForm] = useState({
    business_name: '',
    industry: '',
    products_services: '',
    location: '',
    phone: '',
    website: '',
    bio: '',
  });

  useEffect(() => {
    if (authLoading) return;
    if (isAdmin) {
      navigate('/admin/members', { replace: true });
      return;
    }
    if (!user) {
      navigate('/auth?tab=signup&invited=true');
      return;
    }
    checkMembershipStatus();
  }, [user, isAdmin, authLoading]);

  const checkMembershipStatus = async () => {
    if (!user) return;

    const [membershipRes, profileRes, pendingRes] = await Promise.all([
      supabase.from('memberships').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('profiles').select('*').eq('user_id', user.id).single(),
      supabase.from('pending_members').select('*').eq('email', user.email || '').eq('status', 'pending').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

    setProfile(profileRes.data);
    setMembership(membershipRes.data);
    setPendingMember(pendingRes.data);

    if (pendingRes.data?.plan) {
      setSelectedPlan(pendingRes.data.plan as 'monthly' | 'annual');
    }

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

    // Determine member_type from pending record or URL param
    const memberType = (pendingRes.data as any)?.member_type || searchParams.get('member_type') || 'new';

    const m = membershipRes.data;
    if (m && m.status === 'active' && new Date(m.expires_at) >= new Date()) {
      if (profileRes.data?.onboarding_completed) {
        navigate('/dashboard');
        return;
      }
      // Active members skip payment, go straight to business details
      setStep('business-details');
    } else if (memberType === 'active') {
      // Admin marked as active — skip payment, go to business details
      // Auto-create membership from pending data if needed
      if (!m && pendingRes.data) {
        const pd = pendingRes.data as any;
        const expiresAt = pd.expires_at || (pd.plan === 'annual'
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());
        
        await supabase.from('memberships').insert({
          user_id: user.id,
          plan: pd.plan,
          status: 'active',
          starts_at: pd.purchase_date || new Date().toISOString(),
          expires_at: expiresAt,
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

  const handlePayment = async (method: 'payfast' | 'offline') => {
    if (!user) return;
    setActionLoading(true);

    try {
      const plan = selectedPlan;
      const baseAmount = plan === 'annual' ? 500 : 50;

      if (method === 'payfast') {
        const transactionFee = Math.round(baseAmount * 0.08 * 100) / 100;
        const totalAmount = baseAmount + transactionFee;

        const merchantId = '10000100';
        const merchantKey = '46f0cd694581a';
        const paymentId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();

        const payfastData: Record<string, string> = {
          merchant_id: merchantId,
          merchant_key: merchantKey,
          return_url: `${window.location.origin}/onboarding?payment=success&plan=${plan}`,
          cancel_url: `${window.location.origin}/onboarding?payment=cancelled`,
          notify_url: `${window.location.origin}/api/payfast-webhook`,
          name_first: profile?.full_name?.split(' ')[0] || '',
          name_last: profile?.full_name?.split(' ').slice(1).join(' ') || '',
          email_address: user.email || '',
          m_payment_id: paymentId,
          amount: totalAmount.toFixed(2),
          item_name: `WIB ${plan === 'annual' ? 'Annual' : 'Monthly'} Membership`,
          item_description: `Women In Business ${plan} membership (incl. ${transactionFee.toFixed(2)} transaction fee)`,
        };

        await supabase.from('payments').insert({
          user_id: user.id,
          amount: totalAmount,
          transaction_fee: transactionFee,
          net_amount: baseAmount,
          payment_method: 'payfast',
          payment_reference: paymentId,
          status: 'pending',
          plan,
        });

        const form = document.createElement('form');
        form.method = 'POST';
        form.action = 'https://sandbox.payfast.co.za/eng/process';
        Object.entries(payfastData).forEach(([key, value]) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = value;
          form.appendChild(input);
        });
        document.body.appendChild(form);
        form.submit();
        return;
      }

      // Offline payment
      await supabase.from('payments').insert({
        user_id: user.id,
        amount: baseAmount,
        transaction_fee: 0,
        net_amount: baseAmount,
        payment_method: 'offline',
        status: 'pending',
        plan,
      });

      toast.success('Payment recorded! Please complete your EFT payment using the banking details shown. Admin will verify and activate your membership.');
    } catch (err: any) {
      toast.error(err.message);
    }
    setActionLoading(false);
  };

  // Handle PayFast return
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
          status: 'active',
          plan,
          starts_at: new Date().toISOString(),
          expires_at: expiresAt,
        }).eq('user_id', user.id);
      } else {
        await supabase.from('memberships').insert({
          user_id: user.id,
          plan,
          status: 'active',
          starts_at: new Date().toISOString(),
          expires_at: expiresAt,
        });
      }

      await supabase.from('user_roles').upsert({
        user_id: user.id,
        role: 'member' as const,
      }, { onConflict: 'user_id,role' });

      if (pendingMember) {
        await supabase.from('pending_members').update({ status: 'claimed' }).eq('id', pendingMember.id);
      }

      await supabase.from('payments').update({ status: 'completed' })
        .eq('user_id', user.id)
        .eq('status', 'pending');

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
      // Ensure profile exists (upsert)
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingProfile) {
        const { error } = await supabase.from('profiles').update({
          ...businessForm,
          onboarding_completed: true,
        }).eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('profiles').insert({
          user_id: user.id,
          full_name: profile?.full_name || user.user_metadata?.full_name || '',
          ...businessForm,
          onboarding_completed: true,
        });
        if (error) throw error;
      }

      // Send welcome email (best effort)
      try {
        await supabase.functions.invoke('send-transactional-email', {
          body: {
            template: 'welcome',
            to: user.email,
            data: {
              full_name: profile?.full_name || '',
              member_id: membership?.member_id || '',
              plan: membership?.plan || selectedPlan,
              expires_at: membership?.expires_at ? new Date(membership.expires_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }) : '',
              dashboard_url: `${window.location.origin}/dashboard`,
            },
          },
        });
      } catch {
        // Welcome email is non-critical
      }

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
  const baseAmount = selectedPlan === 'annual' ? 500 : 50;
  const payfastFee = Math.round(baseAmount * 0.08 * 100) / 100;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-lg px-4">
        <div className="text-center mb-8">
          <img src={wibLogo} alt="Women In Business" className="w-24 mx-auto mb-4" />
          <p className="text-primary text-xs font-bold tracking-[0.2em] uppercase mb-2">Women In Business</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            {step === 'payment' ? (isExpired ? 'Renew Your Membership' : 'Activate Your Membership') : 
             step === 'business-details' ? 'Complete Your Profile' : 'Welcome Aboard!'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {step === 'payment' ? (isExpired ? 'Your membership has expired. Renew to continue.' : 'Choose your plan and complete payment to get started.') :
             step === 'business-details' ? 'Tell us about your business to complete onboarding.' : "You're all set!"}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {['Payment', 'Business Details', 'Complete'].map((label, i) => {
            const stepIndex = step === 'payment' ? 0 : step === 'business-details' ? 1 : 2;
            return (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  i <= stepIndex ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {i < stepIndex ? '✓' : i + 1}
                </div>
                <span className={`text-xs hidden sm:inline ${i <= stepIndex ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>{label}</span>
                {i < 2 && <div className={`w-8 h-px ${i < stepIndex ? 'bg-primary' : 'bg-muted'}`} />}
              </div>
            );
          })}
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

            {/* Plan Selection */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedPlan('monthly')}
                className={`rounded-[5px] border-2 p-4 text-center transition-all ${
                  selectedPlan === 'monthly'
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border bg-card hover:border-muted-foreground/30'
                }`}
              >
                <p className="text-2xl font-bold text-foreground">R50</p>
                <p className="text-sm text-muted-foreground">per month</p>
                {selectedPlan === 'monthly' && (
                  <CheckCircle2 className="w-5 h-5 text-primary mx-auto mt-2" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setSelectedPlan('annual')}
                className={`rounded-[5px] border-2 p-4 text-center transition-all relative ${
                  selectedPlan === 'annual'
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border bg-card hover:border-muted-foreground/30'
                }`}
              >
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">SAVE 17%</span>
                <p className="text-2xl font-bold text-foreground">R500</p>
                <p className="text-sm text-muted-foreground">per year</p>
                {selectedPlan === 'annual' && (
                  <CheckCircle2 className="w-5 h-5 text-primary mx-auto mt-2" />
                )}
              </button>
            </div>

            <div className="rounded-[5px] border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                {selectedPlan === 'annual' ? 'Annual' : 'Monthly'} Membership
              </h2>

              <div className="space-y-3">
                <Button className="w-full gap-2" onClick={() => handlePayment('payfast')} disabled={actionLoading}>
                  <CreditCard className="w-4 h-4" /> Pay with PayFast — R{(baseAmount + payfastFee).toFixed(2)}
                </Button>
                <p className="text-center text-[11px] text-muted-foreground">
                  PayFast includes an 8% transaction fee (R{payfastFee.toFixed(2)})
                </p>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                  <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or</span></div>
                </div>

                <Button variant="outline" className="w-full gap-2" onClick={() => handlePayment('offline')} disabled={actionLoading}>
                  Pay via EFT — R{baseAmount.toFixed(2)}
                </Button>
              </div>

              {/* EFT Banking Details */}
              <div className="mt-6 p-4 rounded-[5px] bg-muted/50 border border-border">
                <p className="text-xs font-bold text-foreground mb-2">EFT Banking Details</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p><strong>Bank:</strong> Capitec</p>
                  <p><strong>Branch Code:</strong> 470010</p>
                  <p><strong>Account Number:</strong> 1972031382</p>
                  <p><strong>Reference:</strong> WIB-{user?.email?.split('@')[0]}</p>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">After EFT payment, the admin will verify and activate your membership.</p>
              </div>
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
                  <SelectTrigger>
                    <SelectValue placeholder="Select your industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map(ind => (
                      <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Location</Label>
                <Input value={businessForm.location} onChange={e => setBusinessForm(p => ({ ...p, location: e.target.value }))} placeholder="City, Province" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={businessForm.phone} onChange={e => setBusinessForm(p => ({ ...p, phone: e.target.value }))} placeholder="+27..." />
              </div>
              <div className="sm:col-span-2">
                <Label>Website</Label>
                <Input value={businessForm.website} onChange={e => setBusinessForm(p => ({ ...p, website: e.target.value }))} placeholder="https://" />
              </div>
            </div>
            <div>
              <Label>Products / Services *</Label>
              <Input value={businessForm.products_services} onChange={e => setBusinessForm(p => ({ ...p, products_services: e.target.value }))} placeholder="What does your business offer?" />
            </div>
            <div>
              <Label>Bio</Label>
              <Textarea value={businessForm.bio} onChange={e => setBusinessForm(p => ({ ...p, bio: e.target.value }))} rows={3} placeholder="Tell us about yourself and your business..." />
            </div>

            <Button className="w-full gap-2 font-semibold" onClick={handleSaveBusinessDetails} disabled={actionLoading || !businessForm.business_name || !businessForm.industry || !businessForm.products_services}>
              {actionLoading ? 'Saving...' : 'Continue'} <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Complete Step */}
        {step === 'complete' && <CompleteStep navigate={navigate} />}
      </div>
    </div>
  );
}
