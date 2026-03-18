import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CreditCard, AlertCircle, CheckCircle2, XCircle, RefreshCw, Megaphone, Download, FileText, ChevronLeft, ChevronRight, Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';

const RECEIPTS_PER_PAGE = 5;

export default function Dashboard() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect admins to admin portal
  useEffect(() => { 
    if (!authLoading && isAdmin) navigate('/admin/members', { replace: true }); 
  }, [isAdmin, authLoading, navigate]);
  const [profile, setProfile] = useState<any>(null);
  const [membership, setMembership] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [receiptPage, setReceiptPage] = useState(1);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    const [profileRes, membershipRes, announcementsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('memberships').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('announcements').select('*').eq('is_published', true).order('created_at', { ascending: false }).limit(3),
    ]);

    // Redirect to onboarding if profile incomplete or no active membership
    const p = profileRes.data;
    const m = membershipRes.data;
    if (!p?.onboarding_completed || !m || m.status !== 'active' || new Date(m.expires_at) < new Date()) {
      navigate('/onboarding', { replace: true });
      return;
    }

    setProfile(p);
    setMembership(m);
    setAnnouncements(announcementsRes.data || []);
    setLoading(false);
  };

  const handleSubscribe = async (plan: 'monthly' | 'annual') => {
    if (!user) return;
    setActionLoading(true);
    try {
      const expiresAt = plan === 'annual'
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase.from('memberships').upsert({
        user_id: user.id, plan, status: 'active',
        starts_at: new Date().toISOString(), expires_at: expiresAt,
      }, { onConflict: 'user_id' });
      if (error) throw error;
      toast.success('Membership activated!');
      fetchData();
    } catch (err: any) { toast.error(err.message); }
    setActionLoading(false);
  };

  const handleRenew = async () => {
    if (!user || !membership) return;
    setActionLoading(true);
    try {
      const plan = membership.plan as 'monthly' | 'annual';
      const expiresAt = plan === 'annual'
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase.from('memberships').update({
        status: 'active', starts_at: new Date().toISOString(), expires_at: expiresAt,
      }).eq('user_id', user.id);
      if (error) throw error;
      toast.success('Membership renewed!');
      fetchData();
    } catch (err: any) { toast.error(err.message); }
    setActionLoading(false);
  };

  const handleCancel = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.from('memberships').update({ status: 'cancelled' }).eq('user_id', user.id);
      if (error) throw error;
      toast.success('Membership cancelled.');
      fetchData();
    } catch (err: any) { toast.error(err.message); }
    setActionLoading(false);
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'urgent': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const generateReceipt = (plan: string, date: string) => {
    const amount = plan === 'annual' ? 'R500.00' : 'R50.00';
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>WIB Payment Receipt</title><style>
      body { font-family: Roboto, sans-serif; max-width: 500px; margin: 40px auto; padding: 20px; }
      h1 { color: #DD1C1A; font-size: 20px; } .line { border-top: 1px solid #ddd; margin: 16px 0; }
      table { width: 100%; border-collapse: collapse; } td { padding: 8px 0; font-size: 14px; }
      .total { font-weight: bold; font-size: 16px; }
    </style></head><body>
      <h1>Women In Business</h1>
      <p style="color:#888;font-size:12px;">Non Profit Organisation (2020/911027/08)</p>
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
    w.document.write(`<html><head><title>WIB Membership Card</title><style>
      body { font-family: Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
      .card { background: linear-gradient(135deg, #DD1C1A 0%, #b01715 100%); color: white; padding: 40px; border-radius: 5px; width: 400px; }
      .card h2 { margin: 0 0 4px; font-size: 22px; } .card p { margin: 4px 0; font-size: 13px; opacity: 0.9; }
      .card .member-id { font-family: monospace; font-size: 28px; font-weight: bold; letter-spacing: 3px; margin: 16px 0; }
      .card .label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.7; }
      .card .footer { margin-top: 20px; border-top: 1px solid rgba(255,255,255,0.3); padding-top: 12px; font-size: 11px; opacity: 0.8; }
    </style></head><body>
      <div class="card">
        <p class="label">Women In Business</p>
        <h2>${profile?.full_name || 'Member'}</h2>
        <p>${profile?.business_name || ''}</p>
        <div class="member-id">${membership?.member_id || '—'}</div>
        <p class="label">Member ID</p>
        <div style="display:flex;justify-content:space-between;margin-top:16px;">
          <div><p class="label">Plan</p><p style="text-transform:capitalize;margin:2px 0;">${membership?.plan}</p></div>
          <div><p class="label">Valid Until</p><p style="margin:2px 0;">${membership ? format(new Date(membership.expires_at), 'dd MMM yyyy') : '—'}</p></div>
        </div>
        <div class="footer">Non Profit Organisation (2020/911027/08)</div>
      </div>
    </body></html>`);
    w.document.close();
    w.print();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;

  const isExpired = membership && new Date(membership.expires_at) < new Date();
  const isActive = membership?.status === 'active' && !isExpired;
  const isCancelled = membership?.status === 'cancelled';
  const daysUntilExpiry = membership && isActive ? differenceInDays(new Date(membership.expires_at), new Date()) : null;
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry >= 0;

  // Generate mock receipt history from membership data
  const receipts: { id: string; plan: string; date: string; amount: string }[] = [];
  if (membership) {
    const start = new Date(membership.starts_at);
    const now = new Date();
    const isAnnual = membership.plan === 'annual';
    let d = new Date(start);
    let idx = 0;
    while (d <= now && idx < 50) {
      receipts.push({
        id: `rcpt-${idx}`,
        plan: membership.plan,
        date: d.toISOString(),
        amount: isAnnual ? 'R500.00' : 'R50.00',
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
      <div className="px-0">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">Member Portal</h1>
          <p className="text-muted-foreground text-sm">Welcome{profile?.full_name ? `, ${profile.full_name}` : ''}.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Membership Status */}
            <div className="rounded-[5px] border border-border bg-card p-5 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg sm:text-xl font-bold">Membership Status</h2>
                {isActive && <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>}
                {isExpired && !isCancelled && <Badge className="bg-amber-100 text-amber-700 border-amber-200">Expired</Badge>}
                {isCancelled && <Badge className="bg-red-100 text-red-700 border-red-200">Cancelled</Badge>}
                {!membership && <Badge variant="secondary">No Membership</Badge>}
              </div>

              {membership ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 sm:p-4 rounded-[5px] bg-background border border-border">
                      <p className="text-xs text-muted-foreground mb-1">Member ID</p>
                      <p className="font-mono font-bold text-base sm:text-lg text-primary">{membership.member_id || '—'}</p>
                    </div>
                    <div className="p-3 sm:p-4 rounded-[5px] bg-background border border-border">
                      <p className="text-xs text-muted-foreground mb-1">Plan</p>
                      <p className="font-bold capitalize">{membership.plan}</p>
                    </div>
                    <div className="p-3 sm:p-4 rounded-[5px] bg-background border border-border">
                      <p className="text-xs text-muted-foreground mb-1">Start Date</p>
                      <p className="font-semibold text-xs sm:text-sm">{format(new Date(membership.starts_at), 'dd MMM yyyy')}</p>
                    </div>
                    <div className="p-3 sm:p-4 rounded-[5px] bg-background border border-border">
                      <p className="text-xs text-muted-foreground mb-1">Expires</p>
                      <p className="font-semibold text-xs sm:text-sm">{format(new Date(membership.expires_at), 'dd MMM yyyy')}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
                    {isActive && (
                      <Button variant="outline" className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={handleCancel} disabled={actionLoading}>
                        <XCircle className="w-4 h-4" /> Cancel Membership
                      </Button>
                    )}
                    {(isExpired && !isCancelled) && (
                      <Button className="gap-2" onClick={handleRenew} disabled={actionLoading}>
                        <RefreshCw className="w-4 h-4" /> Renew Membership
                      </Button>
                    )}
                  </div>

                  {isExpiringSoon && (
                    <div className="flex items-start gap-3 p-4 rounded-[5px] bg-amber-50 border border-amber-200">
                      <Bell className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-800">Membership expiring soon</p>
                        <p className="text-xs text-amber-600">Your membership expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}. Renew now to avoid interruption.</p>
                      </div>
                      <Button size="sm" className="ml-auto shrink-0" onClick={handleRenew} disabled={actionLoading}>Renew Now</Button>
                    </div>
                  )}
                  {isExpired && !isCancelled && (
                    <div className="flex items-start gap-3 p-4 rounded-[5px] bg-amber-50 border border-amber-200">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-800">Your membership has expired</p>
                        <p className="text-xs text-amber-600">Renew now to continue enjoying member benefits.</p>
                      </div>
                    </div>
                  )}

                  {isCancelled && (
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 p-4 rounded-[5px] bg-muted border border-border">
                        <CheckCircle2 className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold">Membership cancelled</p>
                          <p className="text-xs text-muted-foreground">You can re-subscribe anytime.</p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button onClick={() => handleSubscribe('monthly')} disabled={actionLoading}>Monthly — R50/mo</Button>
                        <Button onClick={() => handleSubscribe('annual')} disabled={actionLoading}>Annual — R500/yr</Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-bold mb-2">No Active Membership</h3>
                  <p className="text-sm text-muted-foreground mb-6">Subscribe to become a WIB member and get your unique Member ID.</p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button onClick={() => handleSubscribe('monthly')} disabled={actionLoading}>Monthly — R50/mo</Button>
                    <Button onClick={() => handleSubscribe('annual')} disabled={actionLoading}>Annual — R500/yr</Button>
                  </div>
                </div>
              )}
            </div>

            {/* Membership Card */}
            {membership && (
              <div className="rounded-[5px] border border-border bg-card p-5 sm:p-8 shadow-sm">
                <h2 className="text-lg font-bold mb-4">Membership Card</h2>
                <div className="max-w-lg">
                  <div className="rounded-[5px] bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-8 shadow-lg">
                    <p className="text-xs uppercase tracking-[0.2em] opacity-70 mb-1">Women In Business</p>
                    <h2 className="text-2xl font-bold">{profile?.full_name || 'Member'}</h2>
                    {profile?.business_name && <p className="text-sm opacity-80 mt-1">{profile.business_name}</p>}
                    <div className="my-6">
                      <p className="font-mono text-3xl font-bold tracking-[4px]">{membership.member_id || '—'}</p>
                      <p className="text-xs uppercase tracking-widest opacity-60 mt-1">Member ID</p>
                    </div>
                    <div className="flex justify-between text-sm">
                      <div>
                        <p className="text-xs opacity-60 uppercase">Plan</p>
                        <p className="capitalize font-semibold">{membership.plan}</p>
                      </div>
                      <div>
                        <p className="text-xs opacity-60 uppercase">Valid Until</p>
                        <p className="font-semibold">{format(new Date(membership.expires_at), 'dd MMM yyyy')}</p>
                      </div>
                      <div>
                        <p className="text-xs opacity-60 uppercase">Status</p>
                        <p className="font-semibold capitalize">{isActive ? 'Active' : isExpired ? 'Expired' : membership.status}</p>
                      </div>
                    </div>
                    <div className="mt-6 pt-4 border-t border-white/20 text-xs opacity-60">
                      Non Profit Organisation (2020/911027/08)
                    </div>
                  </div>
                  <Button className="mt-4 gap-2" onClick={downloadCard}>
                    <Download className="w-4 h-4" /> Print / Download Card
                  </Button>
                </div>
              </div>
            )}

            {/* Receipts */}
            <div className="rounded-[5px] border border-border bg-card p-5 sm:p-8 shadow-sm">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-primary" /> Receipts</h2>
              {receipts.length > 0 ? (
                <div className="space-y-3">
                  {paginatedReceipts.map(r => (
                    <div key={r.id} className="rounded-[5px] border border-border bg-background p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm">Membership Subscription</p>
                        <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                          <span className="capitalize">{r.plan} Plan</span>
                          <span>{format(new Date(r.date), 'dd MMM yyyy')}</span>
                          <span className="font-semibold text-foreground">{r.amount}</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={() => generateReceipt(r.plan, r.date)}>
                        <Download className="w-3 h-3" /> Receipt
                      </Button>
                    </div>
                  ))}
                  {totalReceiptPages > 1 && (
                    <div className="flex items-center justify-between pt-3 border-t border-border">
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
                <div className="text-center py-6">
                  <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No payment history yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {/* Quick Links */}
            <div className="rounded-[5px] border border-border bg-card p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-sm mb-2">Quick Links</h3>
              {[
                { to: '/events', icon: CreditCard, label: 'Browse Events' },
                { to: '/event-history', icon: FileText, label: 'Event History' },
                { to: '/announcements', icon: Megaphone, label: 'Announcements' },
                { to: '/resources', icon: FileText, label: 'Resources' },
                { to: '/network', icon: CreditCard, label: 'Directory' },
                { to: '/settings', icon: CreditCard, label: 'Settings' },
              ].map(link => (
                <Link key={link.to} to={link.to} className="flex items-center gap-3 p-3 rounded-[5px] bg-background border border-border hover:shadow transition-shadow">
                  <link.icon className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">{link.label}</span>
                </Link>
              ))}
            </div>

            {/* EFT Details */}
            <div className="rounded-[5px] border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm">EFT Payment</h3>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p><span className="font-semibold text-foreground">Bank:</span> Capitec</p>
                <p><span className="font-semibold text-foreground">Branch:</span> 470010</p>
                <p><span className="font-semibold text-foreground">Acc:</span> 1972031382</p>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                <a href="mailto:ceo@womeninbusiness.org.za" className="text-primary hover:underline">ceo@womeninbusiness.org.za</a>
                {' · '}
                <a href="https://wa.me/27745892042" className="text-primary hover:underline">074 589 2042</a>
              </p>
            </div>

            {/* Latest Announcements Preview */}
            {announcements.length > 0 && (
              <div className="rounded-[5px] border border-border bg-card p-5 shadow-sm">
                <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><Megaphone className="w-4 h-4 text-primary" /> Latest Updates</h3>
                <div className="space-y-2">
                  {announcements.map(a => (
                    <div key={a.id} className="p-2 rounded-[5px] bg-background border border-border">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-xs font-bold truncate flex-1">{a.title}</p>
                        <Badge className={`text-[10px] ${getPriorityColor(a.priority)}`}>{a.priority}</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{format(new Date(a.created_at), 'dd MMM yyyy')}</p>
                    </div>
                  ))}
                </div>
                <Link to="/announcements" className="text-xs text-primary hover:underline mt-2 inline-block">View all →</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
