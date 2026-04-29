import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Search, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { COMPLIANCE_FIELDS } from './Compliance';

const PER_PAGE = 10;

export default function AdminCompliance() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => { if (!authLoading && !isAdmin) navigate('/dashboard'); }, [isAdmin, authLoading]);
  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const load = async () => {
    const [{ data: rs }, { data: ps }] = await Promise.all([
      supabase.from('compliance_records').select('*').order('updated_at', { ascending: false }),
      supabase.from('profiles').select('user_id, full_name, business_name, phone'),
    ]);
    setRecords(rs || []);
    const map: Record<string, any> = {};
    (ps || []).forEach((p: any) => { map[p.user_id] = p; });
    setProfiles(map);
  };

  const filtered = records.filter(r => {
    const p = profiles[r.user_id];
    const q = search.toLowerCase();
    return !q || p?.full_name?.toLowerCase().includes(q) || p?.business_name?.toLowerCase().includes(q);
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>;

  return (
    <div className="py-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1">Member Compliance</h1>
        <p className="text-muted-foreground text-sm">View business compliance answers from members.</p>
      </div>
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-10" placeholder="Search by name or business..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
      </div>

      <div className="space-y-2">
        {paged.length === 0 && <p className="text-sm text-muted-foreground text-center py-12">No compliance records yet.</p>}
        {paged.map(r => {
          const p = profiles[r.user_id];
          const yesCount = COMPLIANCE_FIELDS.reduce((c, f) => c + (r[f.key] === true ? 1 : 0), 0);
          return (
            <div key={r.id} className="rounded-[5px] border border-border bg-card p-4 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate">{p?.full_name || '—'}</p>
                <p className="text-xs text-muted-foreground truncate">{p?.business_name || '—'}</p>
              </div>
              <div className="text-xs text-muted-foreground hidden sm:block">{yesCount}/10 ✓</div>
              <div className="text-xs text-muted-foreground hidden md:block">{format(new Date(r.updated_at), 'dd MMM yyyy')}</div>
              <Button variant="outline" size="sm" onClick={() => setDetail(r)}><Eye className="w-4 h-4" /></Button>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{profiles[detail?.user_id]?.full_name || 'Member'} — Compliance</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {detail && COMPLIANCE_FIELDS.map(f => (
              <div key={f.key} className="flex items-center justify-between text-sm border-b border-border py-2">
                <span className="text-muted-foreground pr-2">{f.label}</span>
                <span className={`font-semibold ${detail[f.key] ? 'text-green-600' : 'text-destructive'}`}>{detail[f.key] ? 'Yes' : 'No'}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
