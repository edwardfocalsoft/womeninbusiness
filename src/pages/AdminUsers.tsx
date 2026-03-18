import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';

export default function AdminUsers() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => { if (!authLoading && !isAdmin) navigate('/dashboard'); }, [isAdmin, authLoading]);
  useEffect(() => { if (isAdmin) supabase.from('profiles').select('*').then(({ data }) => setUsers(data || [])); }, [isAdmin]);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container px-4">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">All Users ({users.length})</h1>
          <p className="text-muted-foreground text-sm">All registered users on the platform.</p>
        </div>
        <div className="space-y-3">
          {users.map(u => (
            <div key={u.id} className="rounded-[5px] border border-border bg-card p-4 flex items-center justify-between shadow-sm">
              <div>
                <h3 className="font-bold text-sm">{u.full_name || 'Unnamed'}</h3>
                <p className="text-xs text-muted-foreground">{u.business_name || 'No business'} · {u.location || 'N/A'}</p>
              </div>
              <p className="text-xs text-muted-foreground">{u.phone || ''}</p>
            </div>
          ))}
          {users.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No users yet.</p>}
        </div>
      </div>
    </div>
  );
}
