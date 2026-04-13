import { useState } from 'react';
import { Settings, Shield, Bell, Globe, Database, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

export default function AdminSettings() {
  const [orgName, setOrgName] = useState('Livents');
  const [orgEmail, setOrgEmail] = useState('ceo@womeninbusiness.org.za');
  const [orgPhone, setOrgPhone] = useState('074 589 2042');
  const [monthlyPrice, setMonthlyPrice] = useState('50');
  const [annualPrice, setAnnualPrice] = useState('500');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [autoExpire, setAutoExpire] = useState(true);

  const handleSave = () => {
    toast.success('Settings saved successfully');
  };

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
              <div>
                <Label>Contact Phone</Label>
                <Input value={orgPhone} onChange={e => setOrgPhone(e.target.value)} />
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

          {/* Email Integration */}
          <div className="rounded-[5px] border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <Mail className="w-5 h-5 text-primary" />
              <h2 className="text-base font-bold">Email Integration</h2>
            </div>
            <div className="p-4 rounded-[5px] bg-background border border-border">
              <p className="text-sm font-medium text-foreground mb-1">Resend Integration</p>
              <p className="text-xs text-muted-foreground">Not yet configured. Once set up, member invitations and notifications will be sent automatically via Resend.</p>
              <Badge className="mt-2 bg-amber-100 text-amber-700 border-amber-200 text-[10px]">Pending Setup</Badge>
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
                <p className="text-xs text-muted-foreground">Women In Business Membership Portal v1.0</p>
              </div>
            </div>
          </div>

          <Button className="w-full sm:w-auto" onClick={handleSave}>Save Settings</Button>
        </div>
      </div>
    </div>
  );
}

function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={`inline-block px-2 py-0.5 rounded-full border text-xs font-medium ${className}`}>{children}</span>;
}
