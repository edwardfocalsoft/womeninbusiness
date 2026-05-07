import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Settings, Shield, Bell, Globe, Database, Mail, CreditCard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function AdminSettings() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [orgName, setOrgName] = useState('Livents');
  const [orgEmail, setOrgEmail] = useState('');
  const [monthlyPrice, setMonthlyPrice] = useState('100');
  const [annualPrice, setAnnualPrice] = useState('1000');
  const [chargeFeeToClient, setChargeFeeToClient] = useState(true);
  const [forceRecurring, setForceRecurring] = useState(true);
  const [payfastMode, setPayfastMode] = useState('sandbox');
  const [merchantIdLive, setMerchantIdLive] = useState('');
  const [merchantKeyLive, setMerchantKeyLive] = useState('');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [autoExpire, setAutoExpire] = useState(true);

  useEffect(() => { if (!authLoading && !isAdmin) navigate('/dashboard'); }, [isAdmin, authLoading]);

  useEffect(() => {
    if (!isAdmin) return;
    supabase.from('admin_settings').select('*').eq('id', 1).single().then(({ data }) => {
      if (data) {
        setOrgName(data.org_name);
        setOrgEmail(data.org_email);
        setMonthlyPrice(String(data.monthly_price));
        setAnnualPrice(String(data.annual_price));
        setChargeFeeToClient((data as any).charge_fee_to_client ?? true);
        setForceRecurring((data as any).force_payfast_recurring ?? true);
        setPayfastMode((data as any).payfast_mode ?? 'sandbox');
        setMerchantIdLive((data as any).payfast_merchant_id_live ?? '');
        setMerchantKeyLive((data as any).payfast_merchant_key_live ?? '');
      }
      setLoading(false);
    });
  }, [isAdmin]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('admin_settings').update({
      org_name: orgName,
      org_email: orgEmail,
      monthly_price: Number(monthlyPrice),
      annual_price: Number(annualPrice),
      charge_fee_to_client: chargeFeeToClient,
      force_payfast_recurring: forceRecurring,
      payfast_mode: payfastMode,
      payfast_merchant_id_live: merchantIdLive,
      payfast_merchant_key_live: merchantKeyLive,
    } as any).eq('id', 1);

    if (error) toast.error('Failed to save settings');
    else toast.success('Settings saved successfully');
    setSaving(false);
  };

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>;

  return (
    <div className="py-8">
      <div className="max-w-3xl mx-auto px-4 lg:px-0">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">Admin Settings</h1>
          <p className="text-muted-foreground text-sm">Manage system configuration and preferences.</p>
        </div>

        <div className="space-y-6">
          {/* Organisation Info */}
          <div className="rounded-[5px] border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <Globe className="w-5 h-5 text-primary" />
              <h2 className="text-base font-bold">Organisation Details</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Organisation Name</Label>
                <Input value={orgName} onChange={e => setOrgName(e.target.value)} />
              </div>
              <div>
                <Label>Contact Email</Label>
                <Input type="email" value={orgEmail} onChange={e => setOrgEmail(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Membership Pricing */}
          <div className="rounded-[5px] border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <Database className="w-5 h-5 text-primary" />
              <h2 className="text-base font-bold">Membership Pricing</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Monthly Plan (ZAR)</Label>
                <Input type="number" value={monthlyPrice} onChange={e => setMonthlyPrice(e.target.value)} />
              </div>
              <div>
                <Label>Annual Plan (ZAR)</Label>
                <Input type="number" value={annualPrice} onChange={e => setAnnualPrice(e.target.value)} />
              </div>
            </div>
          </div>

          {/* PayFast Configuration */}
          <div className="rounded-[5px] border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <CreditCard className="w-5 h-5 text-primary" />
              <h2 className="text-base font-bold">Payment Gateway (PayFast)</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Charge Transaction Fee to Client</p>
                  <p className="text-xs text-muted-foreground">If enabled, an 8% PayFast fee is added to the client's total. If disabled, you absorb the fee.</p>
                </div>
                <Switch checked={chargeFeeToClient} onCheckedChange={setChargeFeeToClient} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Force Recurring PayFast Payments</p>
                  <p className="text-xs text-muted-foreground">When enabled, PayFast checkouts are set up as subscriptions so members are auto-debited on renewal (applies to both monthly and annual plans). Manual EFT payers are reminded instead.</p>
                </div>
                <Switch checked={forceRecurring} onCheckedChange={setForceRecurring} />
              </div>
              <Separator />
              <div>
                <Label>PayFast Mode</Label>
                <Select value={payfastMode} onValueChange={setPayfastMode}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
                    <SelectItem value="live">Live (Production)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {payfastMode === 'sandbox' ? '⚠️ Currently in sandbox mode — no real payments will be processed.' : '✅ Live mode — real payments will be processed.'}
                </p>
              </div>
              {payfastMode === 'live' && (
                <div className="grid gap-4 sm:grid-cols-2 p-4 rounded-[5px] bg-amber-50 border border-amber-200">
                  <div>
                    <Label>Live Merchant ID</Label>
                    <Input value={merchantIdLive} onChange={e => setMerchantIdLive(e.target.value)} placeholder="Your PayFast Merchant ID" />
                  </div>
                  <div>
                    <Label>Live Merchant Key</Label>
                    <Input value={merchantKeyLive} onChange={e => setMerchantKeyLive(e.target.value)} placeholder="Your PayFast Merchant Key" />
                  </div>
                  <p className="sm:col-span-2 text-xs text-amber-700">⚠️ Ensure these are your live PayFast credentials. Incorrect values will cause payment failures.</p>
                </div>
              )}
            </div>
          </div>

          {/* Notifications & Automation */}
          <div className="rounded-[5px] border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <Bell className="w-5 h-5 text-primary" />
              <h2 className="text-base font-bold">Notifications & Automation</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Email Notifications</p>
                  <p className="text-xs text-muted-foreground">Send email alerts for new members and expiring memberships</p>
                </div>
                <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Auto-expire Memberships</p>
                  <p className="text-xs text-muted-foreground">Automatically mark memberships as expired past due date</p>
                </div>
                <Switch checked={autoExpire} onCheckedChange={setAutoExpire} />
              </div>
            </div>
          </div>

          {/* System */}
          <div className="rounded-[5px] border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <Shield className="w-5 h-5 text-primary" />
              <h2 className="text-base font-bold">System</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Maintenance Mode</p>
                  <p className="text-xs text-muted-foreground">Temporarily disable member access to the portal</p>
                </div>
                <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
              </div>
              <Separator />
              <div className="p-4 rounded-[5px] bg-background border border-border">
                <p className="text-sm font-medium text-foreground mb-1">Platform Version</p>
                <p className="text-xs text-muted-foreground">Livents Event & Membership Platform v2.0</p>
              </div>
            </div>
          </div>

          <Button className="w-full sm:w-auto gap-2" onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
}
