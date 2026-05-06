import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ShieldCheck, CheckCircle2, Pencil } from 'lucide-react';

export const COMPLIANCE_FIELDS: { key: string; label: string }[] = [
  { key: 'cipc_registered', label: 'Is your company registered with CIPC?' },
  { key: 'sars_registered', label: 'Is your company registered for SARS income tax?' },
  { key: 'bee_affidavit', label: 'Do you have a valid BEE affidavit?' },
  { key: 'csd_registered', label: 'Is your company registered with CSD?' },
  { key: 'has_website', label: 'Does your company have a website address?' },
  { key: 'has_bank_account', label: 'Does your company have a bank account?' },
  { key: 'is_operational', label: 'Is your company operational?' },
  { key: 'uif_registered', label: 'Is your company registered for UIF?' },
  { key: 'paye_registered', label: 'Is your company registered for PAYE?' },
  { key: 'coida_registered', label: 'Is your company registered for COIDA?' },
];

type AnswerMap = Record<string, 'yes' | 'no' | ''>;

const empty: AnswerMap = COMPLIANCE_FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: '' }), {} as AnswerMap);

export default function Compliance() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [answers, setAnswers] = useState<AnswerMap>(empty);
  const [completed, setCompleted] = useState(false);
  const [editing, setEditing] = useState(false);
  const fromOnboarding = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('from') === 'onboarding';

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/auth'); return; }
    load();
  }, [user, authLoading]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from('compliance_records').select('*').eq('user_id', user.id).maybeSingle();
    if (data) {
      const next: AnswerMap = { ...empty };
      COMPLIANCE_FIELDS.forEach(f => {
        const v = (data as any)[f.key];
        next[f.key] = v === true ? 'yes' : v === false ? 'no' : '';
      });
      setAnswers(next);
      setCompleted(!!data.completed);
    }
    setLoading(false);
  };

  const allAnswered = COMPLIANCE_FIELDS.every(f => answers[f.key] === 'yes' || answers[f.key] === 'no');

  const handleSave = async () => {
    if (!user) return;
    if (!allAnswered) { toast.error('Please answer all compliance questions.'); return; }
    setSaving(true);
    try {
      const payload: any = { user_id: user.id, completed: true };
      COMPLIANCE_FIELDS.forEach(f => { payload[f.key] = answers[f.key] === 'yes'; });
      const { error } = await supabase.from('compliance_records').upsert(payload as any, { onConflict: 'user_id' });
      if (error) throw error;
      toast.success('Compliance details saved.');
      setCompleted(true);
      setEditing(false);
      // If user came from onboarding gate, send them to dashboard
      const params = new URLSearchParams(window.location.search);
      if (params.get('from') === 'onboarding') navigate('/dashboard', { replace: true });
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    }
    setSaving(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;

  return (
    <div className="py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <ShieldCheck className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Compliance</h1>
            <p className="text-muted-foreground text-sm">Help us understand your business needs.</p>
          </div>
          {completed && (
            <span className="ml-auto inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-[5px]">
              <CheckCircle2 className="w-3 h-3" /> Completed
            </span>
          )}
        </div>

        <div className="rounded-[5px] border border-border bg-card p-5 sm:p-6 shadow-sm space-y-5">
          {COMPLIANCE_FIELDS.map(f => (
            <div key={f.key} className="border-b border-border last:border-b-0 pb-4 last:pb-0">
              <Label className="text-sm mb-2 block">{f.label} <span className="text-destructive">*</span></Label>
              <Select value={answers[f.key]} onValueChange={(v) => setAnswers(p => ({ ...p, [f.key]: v as 'yes' | 'no' }))}>
                <SelectTrigger className="rounded-[5px]"><SelectValue placeholder="Yes / No" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}

          <Button className="w-full" size="lg" onClick={handleSave} loading={saving} loadingText="Saving..." disabled={!allAnswered}>
            Save Compliance Details
          </Button>
        </div>
      </div>
    </div>
  );
}
