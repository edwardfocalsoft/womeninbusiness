import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Search, Download, CheckCircle2, FileText, Clock, XCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminPayments() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [payments, setPayments] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');

  useEffect(() => { if (!authLoading && !isAdmin) navigate('/dashboard'); }, [isAdmin, authLoading]);
  useEffect(() => { if (isAdmin) fetchData(); }, [isAdmin]);

  const fetchData = async () => {
    const [paymentsRes, profilesRes] = await Promise.all([
      supabase.from('payments').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('user_id, full_name, business_name'),
    ]);
    setPayments(paymentsRes.data || []);
    setProfiles(profilesRes.data || []);
  };

  const getProfile = (userId: string) => profiles.find(p => p.user_id === userId);

  const handleMarkPaid = async (payment: any) => {
    try {
      // Update payment status
      const { error } = await supabase.from('payments').update({ status: 'completed' }).eq('id', payment.id);
      if (error) throw error;

      // Activate membership if offline payment
      if (payment.payment_method === 'offline') {
        const expiresAt = payment.plan === 'annual'
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        // Check if membership exists
        const { data: existing } = await supabase.from('memberships').select('id').eq('user_id', payment.user_id).maybeSingle();
        if (existing) {
          await supabase.from('memberships').update({ status: 'active', starts_at: new Date().toISOString(), expires_at: expiresAt, plan: payment.plan as 'monthly' | 'annual' }).eq('user_id', payment.user_id);
        } else {
          await supabase.from('memberships').insert({ user_id: payment.user_id, plan: payment.plan as 'monthly' | 'annual', status: 'active', starts_at: new Date().toISOString(), expires_at: expiresAt });
        }

        // Add member role
        await supabase.from('user_roles').upsert({ user_id: payment.user_id, role: 'member' as const }, { onConflict: 'user_id,role' });

        // Mark pending member as claimed
        const profile = getProfile(payment.user_id);
        if (profile) {
          const { data: user } = await supabase.auth.getUser();
          // Get user email from auth
        }
      }

      toast.success('Payment marked as paid and membership activated!');
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const generateInvoice = (payment: any) => {
    const profile = getProfile(payment.user_id);
    const invoiceNumber = `WIB-INV-${format(new Date(payment.created_at), 'yyyyMMdd')}-${payment.id.substring(0, 6).toUpperCase()}`;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>Invoice ${invoiceNumber}</title><style>
      body { font-family: 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 40px auto; padding: 30px; color: #222; }
      h1 { color: #DD1C1A; font-size: 22px; margin-bottom: 4px; }
      .subtitle { color: #888; font-size: 11px; margin-bottom: 24px; }
      .invoice-header { display: flex; justify-content: space-between; margin-bottom: 24px; }
      .invoice-number { font-size: 13px; color: #666; }
      .line { border-top: 1px solid #e5e5e5; margin: 16px 0; }
      table { width: 100%; border-collapse: collapse; }
      th { text-align: left; font-size: 11px; color: #888; text-transform: uppercase; padding: 8px 0; border-bottom: 2px solid #e5e5e5; }
      td { padding: 10px 0; font-size: 13px; border-bottom: 1px solid #f0f0f0; }
      .text-right { text-align: right; }
      .total-row td { font-weight: bold; font-size: 15px; border-bottom: none; border-top: 2px solid #222; }
      .status { display: inline-block; padding: 3px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; }
      .status-paid { background: #dcfce7; color: #166534; }
      .status-pending { background: #fef3c7; color: #92400e; }
      .footer { margin-top: 32px; font-size: 10px; color: #aaa; text-align: center; }
      @media print { body { margin: 0; } }
    </style></head><body>
      <h1>Women In Business</h1>
      <p class="subtitle">Non Profit Organisation (2020/911027/08)</p>
      <div class="invoice-header">
        <div>
          <p class="invoice-number"><strong>Invoice:</strong> ${invoiceNumber}</p>
          <p class="invoice-number"><strong>Date:</strong> ${format(new Date(payment.created_at), 'dd MMM yyyy')}</p>
          <p class="invoice-number"><strong>Status:</strong> <span class="status ${payment.status === 'completed' ? 'status-paid' : 'status-pending'}">${payment.status === 'completed' ? 'PAID' : 'PENDING'}</span></p>
        </div>
        <div style="text-align:right">
          <p class="invoice-number"><strong>Bill To:</strong></p>
          <p class="invoice-number">${profile?.full_name || '—'}</p>
          ${profile?.business_name ? `<p class="invoice-number">${profile.business_name}</p>` : ''}
        </div>
      </div>
      <table>
        <thead><tr><th>Description</th><th class="text-right">Amount</th></tr></thead>
        <tbody>
          <tr><td>${payment.plan === 'annual' ? 'Annual' : 'Monthly'} Membership</td><td class="text-right">R${Number(payment.net_amount).toFixed(2)}</td></tr>
          ${payment.transaction_fee > 0 ? `<tr><td>Transaction Fee (8%)</td><td class="text-right">R${Number(payment.transaction_fee).toFixed(2)}</td></tr>` : ''}
          <tr class="total-row"><td>Total</td><td class="text-right">R${Number(payment.amount).toFixed(2)}</td></tr>
        </tbody>
      </table>
      <div class="line"></div>
      <p style="font-size:12px;color:#666;"><strong>Payment Method:</strong> ${payment.payment_method === 'payfast' ? 'PayFast' : 'EFT / Offline'}</p>
      ${payment.payment_reference ? `<p style="font-size:12px;color:#666;"><strong>Reference:</strong> ${payment.payment_reference}</p>` : ''}
      <div class="footer">
        <p>Women In Business · Capitec Bank · Branch 470010 · Account 1972031382</p>
        <p>Thank you for your support!</p>
      </div>
    </body></html>`);
    w.document.close();
    w.print();
  };

  const filtered = payments.filter(p => {
    const profile = getProfile(p.user_id);
    const matchesSearch = search === '' || [profile?.full_name, profile?.business_name, p.payment_reference, p.id].some(f => f?.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesMethod = methodFilter === 'all' || p.payment_method === methodFilter;
    return matchesSearch && matchesStatus && matchesMethod;
  });

  const pendingCount = payments.filter(p => p.status === 'pending').length;
  const completedCount = payments.filter(p => p.status === 'completed').length;
  const totalRevenue = payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + Number(p.net_amount), 0);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>;

  return (
    <div className="py-8">
      <div className="px-0">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">Manage Payments</h1>
          <p className="text-muted-foreground text-sm">View, confirm, and manage all payment records.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Payments', value: payments.length, color: 'text-primary' },
            { label: 'Pending', value: pendingCount, color: 'text-amber-600' },
            { label: 'Completed', value: completedCount, color: 'text-green-600' },
            { label: 'Revenue (Net)', value: `R${totalRevenue.toFixed(2)}`, color: 'text-primary' },
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
            <Input className="pl-10" placeholder="Search by name or reference..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={methodFilter} onValueChange={setMethodFilter}>
            <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              <SelectItem value="offline">EFT / Offline</SelectItem>
              <SelectItem value="payfast">PayFast</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          {filtered.map(p => {
            const profile = getProfile(p.user_id);
            return (
              <div key={p.id} className="rounded-[5px] border border-border bg-card p-4 sm:p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-bold text-sm sm:text-base">{profile?.full_name || 'Unknown'}</h3>
                      <Badge className={`text-xs ${p.status === 'completed' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                        {p.status === 'completed' ? <><CheckCircle2 className="w-3 h-3 mr-1" />Paid</> : <><Clock className="w-3 h-3 mr-1" />Pending</>}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="capitalize">{p.plan} Plan</span>
                      <span>R{Number(p.amount).toFixed(2)}</span>
                      <span className="capitalize">{p.payment_method === 'payfast' ? 'PayFast' : 'EFT'}</span>
                      <span>{format(new Date(p.created_at), 'dd MMM yyyy HH:mm')}</span>
                      {p.payment_reference && <span className="font-mono text-primary">{p.payment_reference}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {p.status === 'pending' && (
                      <Button size="sm" className="text-xs gap-1" onClick={() => handleMarkPaid(p)}>
                        <CheckCircle2 className="w-3 h-3" /> Mark as Paid
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => generateInvoice(p)}>
                      <FileText className="w-3 h-3" /> Invoice
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No payments found.</p>}
        </div>
      </div>
    </div>
  );
}
