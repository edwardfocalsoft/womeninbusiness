import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Search, Download, UserPlus, Bell, Mail, MailX, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

const PER_PAGE = 10;

export default function AdminMembers() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState<any[]>([]);
  const [pendingMembers, setPendingMembers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ full_name: '', email: '', plan: 'monthly' as 'monthly' | 'annual', purchase_date: new Date().toISOString().split('T')[0], expires_at: '', member_type: 'new' as 'new' | 'active' | 'expired' });
  const [addLoading, setAddLoading] = useState(false);
  const [sendInviteEmails, setSendInviteEmails] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [memberPage, setMemberPage] = useState(1);
  const [pendingPage, setPendingPage] = useState(1);
  const [detailMember, setDetailMember] = useState<any>(null);

  useEffect(() => { if (!authLoading && !isAdmin) navigate('/dashboard'); }, [isAdmin, authLoading]);
  useEffect(() => { if (isAdmin) { fetchMembers(); fetchPending(); fetchSettings(); } }, [isAdmin]);

  const fetchSettings = async () => {
    const { data } = await supabase.from('admin_settings').select('send_invite_emails').eq('id', 1).single();
    if (data) setSendInviteEmails(data.send_invite_emails);
  };

  const toggleInviteEmails = async (checked: boolean) => {
    setSettingsLoading(true);
    const { error } = await supabase.from('admin_settings').update({ send_invite_emails: checked }).eq('id', 1);
    if (error) {
      toast.error('Failed to update setting');
    } else {
      setSendInviteEmails(checked);
      toast.success(checked ? 'Email invites enabled' : 'Email invites disabled — use manual invites');
    }
    setSettingsLoading(false);
  };

  const fetchMembers = async () => {
    const { data: memberships } = await supabase.from('memberships').select('*').order('created_at', { ascending: false });
    const { data: profiles } = await supabase.from('profiles').select('*');
    const merged = (memberships || []).map(m => ({
      ...m,
      profiles: profiles?.find(p => p.user_id === m.user_id) || null,
    }));
    setMembers(merged);
  };

  const fetchPending = async () => {
    const { data } = await supabase.from('pending_members').select('*').eq('status', 'pending').order('created_at', { ascending: false });
    setPendingMembers(data || []);
  };

  const handleLapse = async (userId: string) => {
    const { error } = await supabase.from('memberships').update({ status: 'expired' }).eq('user_id', userId);
    if (error) toast.error(error.message); else { toast.success('Membership lapsed'); fetchMembers(); }
  };

  const handleActivate = async (userId: string, plan: string) => {
    const expiresAt = plan === 'annual'
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase.from('memberships').update({ status: 'active', starts_at: new Date().toISOString(), expires_at: expiresAt }).eq('user_id', userId);
    if (error) toast.error(error.message); else { toast.success('Membership activated'); fetchMembers(); }
  };

  const handleAddMember = async () => {
    if (!addForm.full_name.trim() || !addForm.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    setAddLoading(true);
    try {
      const purchaseDate = new Date(addForm.purchase_date);
      
      const expiresAt = addForm.expires_at ? new Date(addForm.expires_at).toISOString() : null;
      const { error } = await supabase.from('pending_members').insert({
        full_name: addForm.full_name,
        email: addForm.email,
        plan: addForm.plan,
        purchase_date: purchaseDate.toISOString(),
        member_type: addForm.member_type,
        expires_at: expiresAt,
        added_by: (await supabase.auth.getUser()).data.user?.id,
      } as any);

      if (error) throw error;

      // Send invite email (respects admin toggle)
      const inviteRes = await supabase.functions.invoke('send-member-invite', {
        body: { 
          email: addForm.email, 
          full_name: addForm.full_name, 
          plan: addForm.plan,
          purchase_date: format(purchaseDate, 'dd MMM yyyy'),
          member_type: addForm.member_type,
          expires_at: expiresAt,
          send_email: sendInviteEmails,
        },
      });
      
      if (inviteRes.error) {
        toast.warning(`Member added but invite failed: ${inviteRes.error.message}`);
      } else {
        const msg = sendInviteEmails 
          ? `Member ${addForm.full_name} added and invite sent to ${addForm.email}.`
          : `Member ${addForm.full_name} added (email invite disabled).`;
        toast.success(msg);
      }

      setAddOpen(false);
      setAddForm({ full_name: '', email: '', plan: 'monthly', purchase_date: new Date().toISOString().split('T')[0], expires_at: '', member_type: 'new' });
      fetchPending();
    } catch (err: any) {
      toast.error(err.message);
    }
    setAddLoading(false);
  };

  const handleResendInvite = async (pm: any) => {
    try {
      const res = await supabase.functions.invoke('send-member-invite', {
        body: {
          email: pm.email,
          full_name: pm.full_name,
          plan: pm.plan,
          purchase_date: format(new Date(pm.purchase_date), 'dd MMM yyyy'),
          member_type: pm.member_type || 'new',
          expires_at: pm.expires_at || null,
          send_email: true,
        },
      });
      if (res.error) throw new Error(res.error.message);
      toast.success(`Invite resent to ${pm.email}`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const exportCSV = () => {
    const headers = ['Member ID', 'Full Name', 'Business', 'Plan', 'Status', 'Start Date', 'Expiry Date', 'Phone', 'Location'];
    const rows = members.map(m => {
      const expired = new Date(m.expires_at) < new Date();
      const status = m.status === 'cancelled' ? 'cancelled' : expired ? 'expired' : m.status;
      return [m.member_id || '', (m as any).profiles?.full_name || '', (m as any).profiles?.business_name || '',
        m.plan, status, format(new Date(m.starts_at), 'yyyy-MM-dd'), format(new Date(m.expires_at), 'yyyy-MM-dd'),
        (m as any).profiles?.phone || '', (m as any).profiles?.location || ''].map(v => `"${v}"`).join(',');
    });
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `wib-members-${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click();
    toast.success('CSV downloaded!');
  };

  const handleSendReminders = async () => {
    const now = new Date();
    const expiringMembers = members.filter(m => {
      const daysLeft = differenceInDays(new Date(m.expires_at), now);
      return m.status === 'active' && daysLeft >= 0 && daysLeft <= 15;
    });

    if (expiringMembers.length === 0) {
      toast.info('No members have memberships expiring within 15 days.');
      return;
    }

    let sent = 0;
    for (const m of expiringMembers) {
      const daysLeft = differenceInDays(new Date(m.expires_at), now);
      const profile = (m as any).profiles;
      
      // Send in-app notification
      await supabase.from('notifications').insert({
        user_id: m.user_id,
        title: 'Membership Expiring Soon',
        message: `Your ${m.plan} membership expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} on ${format(new Date(m.expires_at), 'dd MMM yyyy')}. Please renew to keep your benefits.`,
        type: 'renewal_reminder',
      });

      // Send email reminder
      if (profile?.full_name) {
        await supabase.functions.invoke('send-transactional-email', {
          body: {
            template: 'expiry-reminder',
            to: profile.user_id ? (await supabase.auth.admin?.getUserById?.(m.user_id))?.data?.user?.email : undefined,
            data: {
              full_name: profile.full_name,
              plan: m.plan,
              days_left: daysLeft,
              expires_at: format(new Date(m.expires_at), 'dd MMM yyyy'),
              renew_url: `${window.location.origin}/onboarding`,
            },
          },
        });
      }
      sent++;
    }
    toast.success(`Renewal reminders sent to ${sent} member${sent !== 1 ? 's' : ''}.`);
  };

  const filtered = members.filter(m => {
    const matchesSearch = search === '' || [(m as any).profiles?.full_name, (m as any).profiles?.business_name, m.member_id].some(f => f?.toLowerCase().includes(search.toLowerCase()));
    const expired = new Date(m.expires_at) < new Date();
    const status = m.status === 'cancelled' ? 'cancelled' : expired ? 'expired' : m.status;
    return matchesSearch && (statusFilter === 'all' || status === statusFilter);
  });

  // Reset pages when filters change
  useEffect(() => { setMemberPage(1); }, [search, statusFilter]);

  const activeCount = members.filter(m => m.status === 'active' && new Date(m.expires_at) >= new Date()).length;
  const expiredCount = members.filter(m => m.status === 'expired' || (m.status === 'active' && new Date(m.expires_at) < new Date())).length;
  const cancelledCount = members.filter(m => m.status === 'cancelled').length;

  const memberTotalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginatedMembers = filtered.slice((memberPage - 1) * PER_PAGE, memberPage * PER_PAGE);
  const pendingTotalPages = Math.max(1, Math.ceil(pendingMembers.length / PER_PAGE));
  const paginatedPending = pendingMembers.slice((pendingPage - 1) * PER_PAGE, pendingPage * PER_PAGE);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>;

  return (
    <div className="py-8">
      <div className="px-0">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1">Manage Members</h1>
            <p className="text-muted-foreground text-sm">View and manage all memberships.</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Email Invite Toggle */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-[5px] border border-border bg-card">
              {sendInviteEmails ? <Mail className="w-4 h-4 text-primary" /> : <MailX className="w-4 h-4 text-muted-foreground" />}
              <span className="text-xs text-muted-foreground hidden sm:inline">{sendInviteEmails ? 'Emails On' : 'Emails Off'}</span>
              <Switch checked={sendInviteEmails} onCheckedChange={toggleInviteEmails} disabled={settingsLoading} />
            </div>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><UserPlus className="w-4 h-4" /> Add Member</Button>
              </DialogTrigger>
              <DialogContent className="rounded-[5px]">
                <DialogHeader>
                  <DialogTitle>Add Member</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label>Member Type</Label>
                    <Select value={addForm.member_type} onValueChange={v => setAddForm(p => ({ ...p, member_type: v as 'new' | 'active' | 'expired' }))}>
                      <SelectTrigger className="rounded-[5px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New Member</SelectItem>
                        <SelectItem value="active">Existing — Active Membership</SelectItem>
                        <SelectItem value="expired">Existing — Expired Membership</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Full Name</Label>
                    <Input value={addForm.full_name} onChange={e => setAddForm(p => ({ ...p, full_name: e.target.value }))} placeholder="e.g. Jane Doe" />
                  </div>
                  <div>
                    <Label>Email Address</Label>
                    <Input type="email" value={addForm.email} onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))} placeholder="e.g. jane@example.com" />
                  </div>
                  <div>
                    <Label>Plan</Label>
                    <Select value={addForm.plan} onValueChange={v => setAddForm(p => ({ ...p, plan: v as 'monthly' | 'annual' }))}>
                      <SelectTrigger className="rounded-[5px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly — R50/mo</SelectItem>
                        <SelectItem value="annual">Annual — R500/yr</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Membership Inception Date</Label>
                    <Input type="date" value={addForm.purchase_date} onChange={e => setAddForm(p => ({ ...p, purchase_date: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Membership Expiry Date</Label>
                    <Input type="date" value={addForm.expires_at} onChange={e => setAddForm(p => ({ ...p, expires_at: e.target.value }))} />
                  </div>
                  {!sendInviteEmails && (
                    <div className="flex items-start gap-2 p-3 rounded-[5px] bg-amber-50 border border-amber-200">
                      <MailX className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700">Email invites are disabled. The member will be added but no invitation email will be sent. You can send it manually later.</p>
                    </div>
                  )}
                  <Button className="w-full" onClick={handleAddMember} disabled={addLoading}>
                    {addLoading ? 'Adding...' : sendInviteEmails ? 'Add & Send Invite' : 'Add Member'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total', value: members.length + pendingMembers.length, color: 'text-primary' },
            { label: 'Active', value: activeCount, color: 'text-green-600' },
            { label: 'Expired', value: expiredCount, color: 'text-amber-600' },
            { label: 'Cancelled', value: cancelledCount, color: 'text-destructive' },
          ].map(s => (
            <div key={s.label} className="rounded-[5px] border border-border bg-card p-4 shadow-sm">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-10" placeholder="Search by name, business, or member ID..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2" onClick={exportCSV}><Download className="w-4 h-4" /> Export CSV</Button>
          <Button variant="outline" className="gap-2" onClick={handleSendReminders}><Bell className="w-4 h-4" /> Send Reminders</Button>
        </div>

        <div className="space-y-3">
          {filtered.map(m => {
            const expired = new Date(m.expires_at) < new Date();
            const status = m.status === 'cancelled' ? 'cancelled' : expired ? 'expired' : m.status;
            return (
              <div key={m.id} className="rounded-[5px] border border-border bg-card p-4 sm:p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-bold text-sm sm:text-base">{(m as any).profiles?.full_name || 'Unknown'}</h3>
                      <Badge className={`text-xs ${status === 'active' ? 'bg-green-100 text-green-700 border-green-200' : status === 'expired' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-red-100 text-red-700 border-red-200'}`}>{status}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>ID: <span className="font-mono font-bold text-primary">{m.member_id || '—'}</span></span>
                      <span>Plan: <span className="capitalize">{m.plan}</span></span>
                      <span>Expires: {format(new Date(m.expires_at), 'dd MMM yyyy')}</span>
                      {(m as any).profiles?.business_name && <span>{(m as any).profiles.business_name}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {status === 'active' && <Button variant="outline" size="sm" className="text-xs" onClick={() => handleLapse(m.user_id)}>Lapse</Button>}
                    {(status === 'expired' || status === 'cancelled') && <Button size="sm" className="text-xs" onClick={() => handleActivate(m.user_id, m.plan)}>Activate</Button>}
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No members found.</p>}
        </div>

        {/* Pending Members */}
        {pendingMembers.length > 0 && (
          <>
            <h2 className="text-lg font-bold mt-8 mb-4">Pending Invitations</h2>
            <div className="space-y-3">
              {pendingMembers.map(pm => (
                <div key={pm.id} className="rounded-[5px] border border-dashed border-border bg-card p-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-bold text-sm">{pm.full_name}</h3>
                        <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200">Pending</Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                        <span>{pm.email}</span>
                        <span className="capitalize">{pm.plan}</span>
                        <span>Purchased: {format(new Date(pm.purchase_date), 'dd MMM yyyy')}</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => handleResendInvite(pm)}>
                      <Mail className="w-3 h-3" /> Resend Invite
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
