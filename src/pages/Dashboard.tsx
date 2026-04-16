import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, AlertCircle, RefreshCw, Download, FileText, ChevronLeft, ChevronRight, Bell, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format, differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns';

const RECEIPTS_PER_PAGE = 5;

export default function Dashboard() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { 
    if (!authLoading && isAdmin) navigate('/admin/members', { replace: true }); 
  }, [isAdmin, authLoading, navigate]);

  const [profile, setProfile] = useState<any>(null);
  const [membership, setMembership] = useState<any>(null);
  const [claim, setClaim] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [receiptPage, setReceiptPage] = useState(1);
  const [countdownText, setCountdownText] = useState('');

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    const [profileRes, membershipRes, claimRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('memberships').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('membership_claims').select('*').eq('user_id', user.id).eq('status', 'pending').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

    const p = profileRes.data;
    const m = membershipRes.data;
    const c = claimRes.data;

    // Check if user has a declined claim and no active membership - send to onboarding
    if (!m || m.status !== 'active' || new Date(m.expires_at) < new Date()) {
      // Check for temporary access via claim
      if (c?.granted_until && new Date(c.granted_until) > new Date()) {
        // Temporary access active - allow dashboard
        setClaim(c);
      } else if (!p?.onboarding_completed) {
        navigate('/onboarding', { replace: true });
        return;
      } else {
        navigate('/onboarding', { replace: true });
        return;
      }
    }

    if (m && m.status === 'active' && new Date(m.expires_at) >= new Date() && !p?.onboarding_completed) {
      navigate('/onboarding', { replace: true });
      return;
    }

    setProfile(p);
    setMembership(m);
    setClaim(c);
    setLoading(false);
  };

  // Countdown timer for temporary claim access
  useEffect(() => {
    if (!claim?.granted_until) return;
    const updateCountdown = () => {
      const until = new Date(claim.granted_until);
      const now = new Date();
      if (until <= now) {
        setCountdownText('Expired');
        navigate('/onboarding', { replace: true });
        return;
      }
      const days = differenceInDays(until, now);
      const hours = differenceInHours(until, now) % 24;
      const mins = differenceInMinutes(until, now) % 60;
      setCountdownText(`${days}d ${hours}h ${mins}m remaining`);
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [claim]);

  const handleRenew = async () => {
    if (!user || !membership) return;
    navigate('/onboarding');
  };

  const generateReceipt = (plan: string, date: string) => {
    const amount = plan === 'annual' ? 'R1000.00' : 'R100.00';
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>Payment Receipt</title><style>
      body { font-family: Roboto, sans-serif; max-width: 500px; margin: 40px auto; padding: 20px; }
      h1 { color: #DD1C1A; font-size: 20px; } .line { border-top: 1px solid #ddd; margin: 16px 0; }
      table { width: 100%; border-collapse: collapse; } td { padding: 8px 0; font-size: 14px; }
      .total { font-weight: bold; font-size: 16px; }
    </style></head><body>
      <h1>Livents</h1>
      <p style="color:#888;font-size:12px;">Event & Membership Management</p>
      <div class="line"></div>
      <h2 style="font-size:16px;">Payment Receipt</h2>
      <table>
        <tr><td>Date</td><td style="text-align:right">${format(new Date(date), 'dd MMM yyyy')}</td></tr>
        <tr><td>Member</td><td style="text-align:right">${profile?.full_name || '—'}</td></tr>
        <tr><td>Member ID</td><td style="text-align:right;font-family:monospace;">${membership?.member_id || '—'}</td></tr>
        <tr><td>Plan</td><td style="text-align:right;text-transform:capitalize;">${plan}</td></tr>
      </table>
      <div class="line"></div>
      <table><tr><td class="total">Total</td><td class="total" style="text-align:right">${amount}</td></tr></table>
      <div class="line"></div>
      <p style="font-size:11px;color:#888;">EFT Payment · Capitec · Branch 470010 · Acc 1972031382</p>
    </body></html>`);
    w.document.close();
    w.print();
  };

  const downloadCard = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>Membership Card</title><style>
      body { font-family: Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
      .card { background: linear-gradient(135deg, #DD1C1A 0%, #b01715 100%); color: white; padding: 40px; border-radius: 5px; width: 400px; }
      .card h2 { margin: 0 0 4px; font-size: 22px; } .card p { margin: 4px 0; font-size: 13px; opacity: 0.9; }
      .card .member-id { font-family: monospace; font-size: 28px; font-weight: bold; letter-spacing: 3px; margin: 16px 0; }
      .card .label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.7; }
      .card .footer { margin-top: 20px; border-top: 1px solid rgba(255,255,255,0.3); padding-top: 12px; font-size: 11px; opacity: 0.8; }
    </style></head><body>
      <div class="card">
        <p class="label">Livents</p>
        <h2>${profile?.full_name || 'Member'}</h2>
        <p>${profile?.business_name || ''}</p>
        <div class="member-id">${membership?.member_id || '—'}</div>
        <p class="label">Member ID</p>
        <div style="display:flex;justify-content:space-between;margin-top:16px;">
          <div><p class="label">Plan</p><p style="text-transform:capitalize;margin:2px 0;">${membership?.plan}</p></div>
          <div><p class="label">Valid Until</p><p style="margin:2px 0;">${membership ? format(new Date(membership.expires_at), 'dd MMM yyyy') : '—'}</p></div>
        </div>
        <div class="footer">Powered by Livents</div>
      </div>
    </body></html>`);
    w.document.close();
    w.print();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;

  const isExpired = membership && new Date(membership.expires_at) < new Date();
  const isActive = membership?.status === 'active' && !isExpired;
  const daysUntilExpiry = membership && isActive ? differenceInDays(new Date(membership.expires_at), new Date()) : null;
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 10 && daysUntilExpiry >= 0;
  const hasTemporaryAccess = claim && claim.status === 'pending' && claim.granted_until && new Date(claim.granted_until) > new Date();

  const receipts: { id: string; plan: string; date: string; amount: string }[] = [];
  if (membership) {
    const start = new Date(membership.starts_at);
    const now = new Date();
    const isAnnual = membership.plan === 'annual';
    let d = new Date(start);
    let idx = 0;
    while (d <= now && idx < 50) {
      receipts.push({
        id: `rcpt-${idx}`, plan: membership.plan, date: d.toISOString(),
        amount: isAnnual ? 'R1000.00' : 'R100.00',
      });
      if (isAnnual) d.setFullYear(d.getFullYear() + 1);
      else d.setMonth(d.getMonth() + 1);
      idx++;
    }
    receipts.reverse();
  }
  const totalReceiptPages = Math.max(1, Math.ceil(receipts.length / RECEIPTS_PER_PAGE));
  const paginatedReceipts = receipts.slice((receiptPage - 1) * RECEIPTS_PER_PAGE, receiptPage * RECEIPTS_PER_PAGE);

  return (
    <div className="py-8">
      {/* Temporary Access Countdown Banner */}
      {hasTemporaryAccess && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white py-2 px-4 text-center text-sm font-semibold flex items-center justify-center gap-2">
          <Clock className="w-4 h-4" />
          Temporary Access — {countdownText} — Admin is reviewing your membership claim
        </div>
      )}

      <div className={`max-w-6xl mx-auto px-4 sm:px-6 ${hasTemporaryAccess ? 'mt-10' : ''}`}>
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Welcome{profile?.full_name ? `, ${profile.full_name}` : ''}.</p>
        </div>

        <div className="flex flex-col gap-6">
          {/* Membership Status */}
          <div className="rounded-[5px] border border-border bg-card p-5 sm:p-8 shadow-sm w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg sm:text-xl font-bold">Membership Status</h2>
              {hasTemporaryAccess && <Badge className="bg-amber-100 text-amber-700 border-amber-200">Pending Verification</Badge>}
              {isActive && !hasTemporaryAccess && <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>}
              {isExpired && <Badge className="bg-amber-100 text-amber-700 border-amber-200">Expired</Badge>}
            </div>

            {membership && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-[5px] bg-background border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Member ID</p>
                    <p className="font-mono font-bold text-lg text-primary">{membership.member_id || '—'}</p>
                  </div>
                  <div className="p-4 rounded-[5px] bg-background border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Plan</p>
                    <p className="font-bold capitalize">{membership.plan}</p>
                  </div>
                  <div className="p-4 rounded-[5px] bg-background border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Start Date</p>
                    <p className="font-semibold text-sm">{format(new Date(membership.starts_at), 'dd MMM yyyy')}</p>
                  </div>
                  <div className="p-4 rounded-[5px] bg-background border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Expires</p>
                    <p className="font-semibold text-sm">{format(new Date(membership.expires_at), 'dd MMM yyyy')}</p>
                  </div>
                </div>

                {isExpiringSoon && (
                  <div className="flex items-center gap-3 p-4 rounded-[5px] bg-amber-50 border border-amber-200">
                    <Bell className="w-5 h-5 text-amber-600 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-amber-800">Membership expiring soon</p>
                      <p className="text-xs text-amber-600">Expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}.</p>
                    </div>
                    <Button size="sm" onClick={handleRenew} disabled={actionLoading}>Renew Now</Button>
                  </div>
                )}
              </div>
            )}

            {hasTemporaryAccess && !membership && (
              <div className="p-4 rounded-[5px] bg-amber-50 border border-amber-200">
                <p className="text-sm text-amber-800">Your membership claim is being reviewed by admin. You have temporary access while they verify.</p>
              </div>
            )}
          </div>

          {/* Card and Receipts side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            {membership && (
              <div className="rounded-[5px] border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <h2 className="text-lg font-bold mb-6">Membership Card</h2>
                  <div className="rounded-[5px] bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-8 shadow-lg">
                    <p className="text-[10px] uppercase tracking-[0.2em] opacity-70 mb-1">Livents</p>
                    <h2 className="text-xl font-bold">{profile?.full_name || 'Member'}</h2>
                    {profile?.business_name && <p className="text-sm opacity-80 mt-1">{profile.business_name}</p>}
                    <div className="my-6">
                      <p className="font-mono text-2xl font-bold tracking-[4px]">{membership.member_id || '—'}</p>
                      <p className="text-[10px] uppercase tracking-widest opacity-60 mt-1">Member ID</p>
                    </div>
                    <div className="flex justify-between text-xs">
                      <div>
                        <p className="text-[10px] opacity-60 uppercase">Plan</p>
                        <p className="capitalize font-semibold text-sm">{membership.plan}</p>
                      </div>
                      <div>
                        <p className="text-[10px] opacity-60 uppercase">Valid Until</p>
                        <p className="font-semibold text-sm">{format(new Date(membership.expires_at), 'dd MMM yyyy')}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <Button className="mt-6 gap-2 w-full" size="lg" onClick={downloadCard}>
                  <Download className="w-5 h-5" /> Download Card
                </Button>
              </div>
            )}

            <div className="rounded-[5px] border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" /> Receipts
              </h2>
              {receipts.length > 0 ? (
                <div className="space-y-3">
                  {paginatedReceipts.map(r => (
                    <div key={r.id} className="rounded-[5px] border border-border bg-background p-4 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-sm">Membership Payment</p>
                        <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                          <span className="capitalize">{r.plan}</span>
                          <span>{format(new Date(r.date), 'dd MMM yyyy')}</span>
                          <span className="font-bold text-foreground">{r.amount}</span>
                        </div>
                      </div>
                      <Button variant="outline" size="icon" onClick={() => generateReceipt(r.plan, r.date)}>
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {totalReceiptPages > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
                      <p className="text-xs text-muted-foreground">Page {receiptPage} of {totalReceiptPages}</p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={receiptPage <= 1} onClick={() => setReceiptPage(p => p - 1)}>
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" disabled={receiptPage >= totalReceiptPages} onClick={() => setReceiptPage(p => p + 1)}>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No payment history found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
