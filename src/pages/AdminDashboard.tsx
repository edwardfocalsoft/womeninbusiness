import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Users, CreditCard, Calendar, ShieldCheck, TrendingUp, Clock } from 'lucide-react';
import { format } from 'date-fns';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Legend,
} from 'recharts';

export default function AdminDashboard() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalMembers: 0, active: 0, expired: 0, pendingClaims: 0,
    pendingPayments: 0, totalRevenue: 0, totalEvents: 0, complianceCompleted: 0,
  });
  const [growth, setGrowth] = useState<{ month: string; members: number; revenue: number }[]>([]);
  const [recent, setRecent] = useState<{ kind: string; label: string; when: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!authLoading && !isAdmin) navigate('/dashboard'); }, [isAdmin, authLoading]);
  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const load = async () => {
    const [memRes, payRes, claimRes, evRes, complRes, recentMemRes, recentPayRes] = await Promise.all([
      supabase.from('memberships').select('status, expires_at, plan, created_at'),
      supabase.from('payments').select('status, amount, net_amount, created_at'),
      supabase.from('membership_claims').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('events').select('id', { count: 'exact', head: true }),
      supabase.from('compliance_records').select('id', { count: 'exact', head: true }).eq('completed', true),
      supabase.from('memberships').select('created_at, plan').order('created_at', { ascending: false }).limit(5),
      supabase.from('payments').select('created_at, amount, status').order('created_at', { ascending: false }).limit(5),
    ]);

    const members = memRes.data || [];
    const payments = payRes.data || [];
    const now = new Date();
    const active = members.filter(m => m.status === 'active' && new Date(m.expires_at) >= now).length;
    const expired = members.filter(m => m.status === 'expired' || new Date(m.expires_at) < now).length;
    const pendingClaims = claimRes.count || 0;
    const pendingPayments = payments.filter(p => p.status === 'pending').length;
    const totalRevenue = payments.filter(p => p.status === 'completed').reduce((s, p) => s + Number(p.net_amount || p.amount || 0), 0);
    const complianceCompleted = complRes.count || 0;

    setStats({
      totalMembers: members.length, active, expired, pendingClaims,
      pendingPayments, totalRevenue, totalEvents: evRes.count || 0, complianceCompleted,
    });

    // 6-month growth
    const buckets: Record<string, { members: number; revenue: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets[format(d, 'MMM yy')] = { members: 0, revenue: 0 };
    }
    members.forEach(m => {
      const d = new Date(m.created_at);
      const k = format(d, 'MMM yy');
      if (buckets[k]) buckets[k].members += 1;
    });
    payments.filter(p => p.status === 'completed').forEach(p => {
      const d = new Date(p.created_at);
      const k = format(d, 'MMM yy');
      if (buckets[k]) buckets[k].revenue += Number(p.net_amount || p.amount || 0);
    });
    setGrowth(Object.entries(buckets).map(([month, v]) => ({ month, ...v })));

    const acts: { kind: string; label: string; when: string }[] = [];
    (recentMemRes.data || []).forEach(m => acts.push({ kind: 'New member', label: `New ${m.plan} membership`, when: m.created_at }));
    (recentPayRes.data || []).forEach(p => acts.push({ kind: 'Payment', label: `${p.status === 'completed' ? 'Received' : 'Pending'} R${p.amount}`, when: p.created_at }));
    acts.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());
    setRecent(acts.slice(0, 8));
    setLoading(false);
  };

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;

  const cards = [
    { label: 'Total Members', value: stats.totalMembers, icon: Users, color: 'text-primary' },
    { label: 'Active', value: stats.active, icon: ShieldCheck, color: 'text-green-600' },
    { label: 'Expired', value: stats.expired, icon: Clock, color: 'text-amber-600' },
    { label: 'Revenue', value: `R${stats.totalRevenue.toFixed(0)}`, icon: TrendingUp, color: 'text-primary' },
    { label: 'Pending Payments', value: stats.pendingPayments, icon: CreditCard, color: 'text-amber-600' },
    { label: 'Pending Claims', value: stats.pendingClaims, icon: ShieldCheck, color: 'text-amber-600' },
    { label: 'Events', value: stats.totalEvents, icon: Calendar, color: 'text-primary' },
    { label: 'Compliance Done', value: stats.complianceCompleted, icon: ShieldCheck, color: 'text-green-600' },
  ];

  return (
    <div className="py-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1">Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm">System overview and key metrics.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {cards.map(c => (
          <div key={c.label} className="rounded-[5px] border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <c.icon className={`w-4 h-4 ${c.color}`} />
            </div>
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <div className="rounded-[5px] border border-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-bold mb-4">Member Growth (6 months)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={growth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="members" stroke="hsl(var(--primary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-[5px] border border-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-bold mb-4">Revenue (6 months)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={growth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-[5px] border border-border bg-card p-5 shadow-sm">
        <h3 className="text-sm font-bold mb-4">Recent Activity</h3>
        {recent.length === 0 ? (
          <p className="text-xs text-muted-foreground">No activity yet.</p>
        ) : (
          <div className="space-y-2">
            {recent.map((a, i) => (
              <div key={i} className="flex items-center justify-between text-sm border-b border-border last:border-0 py-2">
                <div>
                  <span className="text-xs text-muted-foreground mr-2">{a.kind}</span>
                  <span>{a.label}</span>
                </div>
                <span className="text-xs text-muted-foreground">{format(new Date(a.when), 'dd MMM yyyy')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
