import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

export default function Receipts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [membership, setMembership] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    Promise.all([
      supabase.from('profiles').select('*').eq('user_id', user.id).single(),
      supabase.from('memberships').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]).then(([p, m]) => { setProfile(p.data); setMembership(m.data); setLoading(false); });
  }, [user]);

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

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container px-4">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">Receipts</h1>
          <p className="text-muted-foreground text-sm">Your payment history and receipts.</p>
        </div>

        {membership ? (
          <div className="space-y-3">
            <div className="rounded-[5px] border border-border bg-card p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm">Membership Subscription</h3>
                <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                  <span className="capitalize">{membership.plan} Plan</span>
                  <span>{format(new Date(membership.starts_at), 'dd MMM yyyy')}</span>
                  <span className="font-semibold text-foreground">{membership.plan === 'annual' ? 'R500.00' : 'R50.00'}</span>
                </div>
              </div>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => generateReceipt(membership.plan, membership.starts_at)}>
                <Download className="w-3 h-3" /> Receipt
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">No Payment History</h3>
            <p className="text-sm text-muted-foreground">Subscribe to a plan to see your payment receipts here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
