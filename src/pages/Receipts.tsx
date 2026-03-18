import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function Receipts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [payments, setPayments] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    Promise.all([
      supabase.from('payments').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').eq('user_id', user.id).single(),
    ]).then(([p, pr]) => { setPayments(p.data || []); setProfile(pr.data); setLoading(false); });
  }, [user]);

  const generateInvoice = (payment: any) => {
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

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container px-4">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">Invoices & Receipts</h1>
          <p className="text-muted-foreground text-sm">Your payment history and invoices.</p>
        </div>

        {payments.length > 0 ? (
          <div className="space-y-3">
            {payments.map(p => (
              <div key={p.id} className="rounded-[5px] border border-border bg-card p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-sm">{p.plan === 'annual' ? 'Annual' : 'Monthly'} Membership</h3>
                    <Badge className={`text-xs ${p.status === 'completed' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                      {p.status === 'completed' ? 'Paid' : 'Pending'}
                    </Badge>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                    <span>{format(new Date(p.created_at), 'dd MMM yyyy')}</span>
                    <span className="font-semibold text-foreground">R{Number(p.amount).toFixed(2)}</span>
                    <span className="capitalize">{p.payment_method === 'payfast' ? 'PayFast' : 'EFT'}</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => generateInvoice(p)}>
                  <Download className="w-3 h-3" /> Invoice
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">No Payment History</h3>
            <p className="text-sm text-muted-foreground">Subscribe to a plan to see your invoices here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
