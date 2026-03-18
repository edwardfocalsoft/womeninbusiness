import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, QrCode } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

export default function MembershipCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [membership, setMembership] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    Promise.all([
      supabase.from('profiles').select('*').eq('user_id', user.id).single(),
      supabase.from('memberships').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]).then(([p, m]) => { setProfile(p.data); setMembership(m.data); setLoading(false); });
  }, [user]);

  const isExpired = membership && new Date(membership.expires_at) < new Date();
  const isActive = membership?.status === 'active' && !isExpired;

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

  if (!membership) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container px-4 text-center py-20">
          <QrCode className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">No Membership Card</h3>
          <p className="text-sm text-muted-foreground mb-4">Subscribe to a plan to get your membership card.</p>
          <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container px-4">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">Membership Card</h1>
          <p className="text-muted-foreground text-sm">Your digital membership card.</p>
        </div>
        <div className="max-w-lg">
          <div ref={cardRef} className="rounded-[5px] bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-8 shadow-lg">
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
    </div>
  );
}
