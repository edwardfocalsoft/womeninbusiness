import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, ChevronLeft, ChevronRight, Eye } from 'lucide-react';

const PER_PAGE = 10;

export default function AdminUsers() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [detailUser, setDetailUser] = useState<any>(null);

  useEffect(() => { if (!authLoading && !isAdmin) navigate('/dashboard'); }, [isAdmin, authLoading]);
  useEffect(() => { if (isAdmin) supabase.from('profiles').select('*').then(({ data }) => setUsers(data || [])); }, [isAdmin]);

  const filtered = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [u.full_name, u.business_name, u.location, u.industry, u.phone].some(f => f?.toLowerCase().includes(q));
  });

  useEffect(() => { setPage(1); }, [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>;

  return (
    <div className="py-8">
      <div className="px-0">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">All Users ({filtered.length})</h1>
          <p className="text-muted-foreground text-sm">All registered users on the platform.</p>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Search by name, business, location..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="space-y-3">
          {paginated.map(u => (
            <div key={u.id} className="rounded-[5px] border border-border bg-card p-4 flex items-center justify-between shadow-sm cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setDetailUser(u)}>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-bold text-sm">{u.full_name || 'Unnamed'}</h3>
                  {u.onboarding_completed && <Badge variant="secondary" className="text-[10px]">Onboarded</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{u.business_name || 'No business'} · {u.location || 'N/A'}</p>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground hidden sm:block">{u.phone || ''}</p>
                <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={(e) => { e.stopPropagation(); setDetailUser(u); }}>
                  <Eye className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No users found.</p>}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-muted-foreground">Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
              <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        )}

        {/* User Detail Modal */}
        <Dialog open={!!detailUser} onOpenChange={(open) => !open && setDetailUser(null)}>
          <DialogContent className="rounded-[5px] max-w-lg">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
            </DialogHeader>
            {detailUser && (
              <div className="space-y-4 pt-2">
                <h3 className="text-lg font-bold">{detailUser.full_name || 'Unknown'}</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-muted-foreground">Business Name</p><p>{detailUser.business_name || '—'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Industry</p><p>{detailUser.industry || '—'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Location</p><p>{detailUser.location || '—'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Phone</p><p>{detailUser.phone || '—'}</p></div>
                  <div className="col-span-2"><p className="text-xs text-muted-foreground">Website</p><p>{detailUser.website || '—'}</p></div>
                  <div className="col-span-2"><p className="text-xs text-muted-foreground">Products / Services</p><p>{detailUser.products_services || '—'}</p></div>
                  <div className="col-span-2"><p className="text-xs text-muted-foreground">Bio</p><p className="text-muted-foreground">{detailUser.bio || '—'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Onboarding</p><p>{detailUser.onboarding_completed ? '✓ Completed' : '✗ Incomplete'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Joined</p><p>{new Date(detailUser.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</p></div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
