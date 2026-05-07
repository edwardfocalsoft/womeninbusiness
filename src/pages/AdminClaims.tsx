import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ShieldCheck, CheckCircle2, XCircle, Clock, Calendar, FileText } from 'lucide-react';
import { format, differenceInHours } from 'date-fns';

export default function AdminClaims() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [claims, setClaims] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewClaim, setReviewClaim] = useState<any>(null);
  const [startsAt, setStartsAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [plan, setPlan] = useState<'monthly' | 'annual'>('annual');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { if (!authLoading && !isAdmin) navigate('/dashboard'); }, [isAdmin, authLoading]);
  useEffect(() => { if (isAdmin) fetchData(); }, [isAdmin]);

  const fetchData = async () => {
    const [claimsRes, profilesRes, paymentsRes] = await Promise.all([
      supabase.from('membership_claims').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('user_id, full_name, business_name'),
      supabase.from('payments')
        .select('id, user_id, proof_of_payment_url, created_at')
        .eq('payment_method', 'offline')
        .not('proof_of_payment_url', 'is', null)
        .order('created_at', { ascending: false }),
    ]);
    setClaims(claimsRes.data || []);
    setProfiles(profilesRes.data || []);
    setPayments(paymentsRes.data || []);
    setLoading(false);
  };

  const getProfile = (userId: string) => profiles.find(p => p.user_id === userId);
  const getProofPayment = (userId: string) => payments.find(p => p.user_id === userId && p.proof_of_payment_url);

  const handleViewProof = async (claim: any) => {
    const payment = getProofPayment(claim.user_id);
    if (!payment?.proof_of_payment_url) {
      toast.error('No proof of payment uploaded for this claim.');
      return;
    }

    const proofWindow = window.open('', '_blank');
    try {
      const { data, error } = await supabase.storage
        .from('proof-of-payment')
        .createSignedUrl(payment.proof_of_payment_url, 60 * 5);
      if (error) throw error;

      if (proofWindow) {
        proofWindow.location.href = data.signedUrl;
      } else {
        window.open(data.signedUrl, '_blank');
      }
    } catch (err: any) {
      if (proofWindow) proofWindow.close();
      toast.error(err.message || 'Could not open proof of payment.');
    }
  };

  const handleApprove = async () => {
    if (!reviewClaim || !startsAt || !expiresAt) { toast.error('Please set membership dates'); return; }
    setActionLoading(true);
    try {
      // Update claim
      await supabase.from('membership_claims').update({
        status: 'approved',
        membership_starts_at: new Date(startsAt).toISOString(),
        membership_expires_at: new Date(expiresAt).toISOString(),
      }).eq('id', reviewClaim.id);

      // Create/update membership
      const { data: existing } = await supabase.from('memberships').select('id').eq('user_id', reviewClaim.user_id).maybeSingle();
      if (existing) {
        await supabase.from('memberships').update({
          status: 'active', plan, starts_at: new Date(startsAt).toISOString(), expires_at: new Date(expiresAt).toISOString(),
        }).eq('user_id', reviewClaim.user_id);
      } else {
        await supabase.from('memberships').insert({
          user_id: reviewClaim.user_id, plan, status: 'active',
          starts_at: new Date(startsAt).toISOString(), expires_at: new Date(expiresAt).toISOString(),
        });
      }

      await supabase.from('user_roles').upsert({ user_id: reviewClaim.user_id, role: 'member' as const }, { onConflict: 'user_id,role' });
      toast.success('Membership claim approved!');
      setReviewClaim(null);
      fetchData();
    } catch (err: any) { toast.error(err.message); }
    setActionLoading(false);
  };

  const handleDecline = async (claim: any) => {
    setActionLoading(true);
    try {
      await supabase.from('membership_claims').update({ status: 'declined' }).eq('id', claim.id);
      // Remove temporary member role if no active membership
      const { data: mem } = await supabase.from('memberships').select('id').eq('user_id', claim.user_id).eq('status', 'active').maybeSingle();
      if (!mem) {
        await supabase.from('user_roles').delete().eq('user_id', claim.user_id).eq('role', 'member' as any);
      }
      // Reset onboarding so user goes back to step 1
      await supabase.from('profiles').update({ onboarding_completed: false }).eq('user_id', claim.user_id);
      toast.success('Claim declined. User will need to select a plan and pay.');
      fetchData();
    } catch (err: any) { toast.error(err.message); }
    setActionLoading(false);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved': return <Badge className="bg-green-100 text-green-700 border-green-200 text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'declined': return <Badge className="bg-red-100 text-red-700 border-red-200 text-xs"><XCircle className="w-3 h-3 mr-1" />Declined</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>;

  const pendingCount = claims.filter(c => c.status === 'pending').length;

  return (
    <div className="py-8">
      <div className="px-0">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">Membership Claims</h1>
          <p className="text-muted-foreground text-sm">Review users who claim they have an active membership.</p>
        </div>

        {pendingCount > 0 && (
          <div className="flex items-center gap-3 p-4 rounded-[5px] bg-amber-50 border border-amber-200 mb-6">
            <ShieldCheck className="w-5 h-5 text-amber-600" />
            <p className="text-sm text-amber-800"><strong>{pendingCount}</strong> pending claim{pendingCount !== 1 ? 's' : ''} require your attention.</p>
          </div>
        )}

        <div className="space-y-3">
          {claims.map(claim => {
            const profile = getProfile(claim.user_id);
            const hoursLeft = claim.granted_until ? Math.max(0, differenceInHours(new Date(claim.granted_until), new Date())) : 0;
            return (
              <div key={claim.id} className="rounded-[5px] border border-border bg-card p-4 sm:p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-bold text-sm sm:text-base">{profile?.full_name || 'Unknown'}</h3>
                      {statusBadge(claim.status)}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Claimed: {format(new Date(claim.created_at), 'dd MMM yyyy HH:mm')}</span>
                      {claim.status === 'pending' && <span className="text-amber-600">{hoursLeft}h temporary access left</span>}
                      {claim.membership_starts_at && <span>Membership: {format(new Date(claim.membership_starts_at), 'dd MMM yyyy')} - {format(new Date(claim.membership_expires_at), 'dd MMM yyyy')}</span>}
                    </div>
                  </div>
                  {claim.status === 'pending' && (
                    <div className="flex gap-2">
                      {getProofPayment(claim.user_id) && (
                        <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => handleViewProof(claim)}>
                          <FileText className="w-3 h-3" /> View POP
                        </Button>
                      )}
                      <Button size="sm" className="text-xs gap-1" onClick={() => { setReviewClaim(claim); setStartsAt('2026-01-01'); setExpiresAt('2026-12-31'); }}>
                        <CheckCircle2 className="w-3 h-3" /> Approve
                      </Button>
                      <Button variant="destructive" size="sm" className="text-xs gap-1" onClick={() => handleDecline(claim)}>
                        <XCircle className="w-3 h-3" /> Decline
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {claims.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No membership claims found.</p>}
        </div>
      </div>

      <Dialog open={!!reviewClaim} onOpenChange={() => setReviewClaim(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Membership Claim</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Set the membership period for {getProfile(reviewClaim?.user_id)?.full_name || 'this user'}.</p>
            <div className="grid gap-4 grid-cols-2">
              <div>
                <Label>Starts At</Label>
                <Input type="date" value={startsAt} onChange={e => setStartsAt(e.target.value)} />
              </div>
              <div>
                <Label>Expires At</Label>
                <Input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleApprove} disabled={actionLoading}>
                {actionLoading ? 'Processing...' : 'Confirm & Approve'}
              </Button>
              <Button variant="outline" onClick={() => setReviewClaim(null)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
