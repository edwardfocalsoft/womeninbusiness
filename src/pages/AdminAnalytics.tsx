import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3 } from 'lucide-react';

export default function AdminAnalytics() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => { if (!authLoading && !isAdmin) navigate('/dashboard'); }, [isAdmin, authLoading]);

  const [counts, setCounts] = useState({ users: 0, events: 0, resources: 0, pendingMembers: 0 });
  const [publishedAnn, setPublishedAnn] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    // Only fetch fields actually used in calculations
    supabase.from('memberships').select('status, expires_at, plan').then(({ data }) => setMembers(data || []));
    // Use head+count for pure counts (no row payload)
    supabase.from('pending_members').select('id', { count: 'exact', head: true }).then(({ count }) => setCounts(c => ({ ...c, pendingMembers: count || 0 })));
    supabase.from('profiles').select('id', { count: 'exact', head: true }).then(({ count }) => setCounts(c => ({ ...c, users: count || 0 })));
    supabase.from('events').select('id', { count: 'exact', head: true }).then(({ count }) => setCounts(c => ({ ...c, events: count || 0 })));
    supabase.from('resources').select('id', { count: 'exact', head: true }).then(({ count }) => setCounts(c => ({ ...c, resources: count || 0 })));
    supabase.from('announcements').select('id', { count: 'exact', head: true }).eq('is_published', true).then(({ count }) => setPublishedAnn(count || 0));
  }, [isAdmin]);

  const activeCount = members.filter(m => m.status === 'active' && new Date(m.expires_at) >= new Date()).length;
  const expiredCount = members.filter(m => m.status === 'expired' || (m.status === 'active' && new Date(m.expires_at) < new Date())).length;
  const cancelledCount = members.filter(m => m.status === 'cancelled').length;
  const monthlyRev = members.filter(m => m.status === 'active' && m.plan === 'monthly').length * 50;
  const annualRev = members.filter(m => m.status === 'active' && m.plan === 'annual').length * 500;

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container px-4">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">Analytics</h1>
          <p className="text-muted-foreground text-sm">Platform insights and metrics.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-[5px] border border-border bg-card p-6 shadow-sm">
            <h3 className="font-bold mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /> Membership Breakdown</h3>
            <div className="space-y-3">
              {[
                { label: 'Active Members', value: activeCount, total: members.length, color: 'bg-green-500' },
                { label: 'Expired Members', value: expiredCount, total: members.length, color: 'bg-amber-500' },
                { label: 'Cancelled Members', value: cancelledCount, total: members.length, color: 'bg-red-500' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-bold">{item.value}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-[5px] overflow-hidden">
                    <div className={`h-full ${item.color} rounded-[5px]`} style={{ width: `${item.total > 0 ? (item.value / item.total) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[5px] border border-border bg-card p-6 shadow-sm">
            <h3 className="font-bold mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /> Plan Distribution</h3>
            <div className="space-y-3">
              {[
                { label: 'Monthly Plans', value: members.filter(m => m.plan === 'monthly').length, color: 'bg-primary' },
                { label: 'Annual Plans', value: members.filter(m => m.plan === 'annual').length, color: 'bg-primary/60' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-bold">{item.value}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-[5px] overflow-hidden">
                    <div className={`h-full ${item.color} rounded-[5px]`} style={{ width: `${members.length > 0 ? (item.value / members.length) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[5px] border border-border bg-card p-6 shadow-sm">
            <h3 className="font-bold mb-4">Estimated Revenue</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-[5px] bg-background border border-border text-center">
                <p className="text-2xl font-bold text-primary">R{monthlyRev.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">Monthly Recurring</p>
              </div>
              <div className="p-4 rounded-[5px] bg-background border border-border text-center">
                <p className="text-2xl font-bold text-primary">R{annualRev.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">Annual Subscriptions</p>
              </div>
            </div>
            <div className="mt-4 p-4 rounded-[5px] bg-primary/5 border border-primary/20 text-center">
              <p className="text-3xl font-bold text-primary">R{(monthlyRev + annualRev).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Estimated Revenue</p>
            </div>
          </div>

          <div className="rounded-[5px] border border-border bg-card p-6 shadow-sm">
            <h3 className="font-bold mb-4">Platform Summary</h3>
            <div className="space-y-3">
              {[
                { label: 'Total Registered Users', value: users.length },
                { label: 'Total Members', value: members.length + pendingMembers.length },
                { label: 'Total Events', value: events.length },
                { label: 'Published Announcements', value: announcements.filter(a => a.is_published).length },
                { label: 'Resources Available', value: resources.length },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className="font-bold">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
