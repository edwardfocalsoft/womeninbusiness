import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function Announcements() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    supabase.from('announcements').select('*').eq('is_published', true).order('created_at', { ascending: false })
      .then(({ data }) => { setAnnouncements(data || []); setLoading(false); });
  }, [user]);

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'urgent': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container px-4">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">Announcements</h1>
          <p className="text-muted-foreground text-sm">Updates and news from Women In Business.</p>
        </div>

        {announcements.length === 0 ? (
          <div className="text-center py-20">
            <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">No Announcements</h3>
            <p className="text-sm text-muted-foreground">Check back later for updates.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map(a => (
              <div key={a.id} className="rounded-[5px] border border-border bg-card p-5 sm:p-6 shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-bold text-base">{a.title}</h3>
                  <Badge className={getPriorityColor(a.priority)}>{a.priority}</Badge>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{a.content}</p>
                <p className="text-xs text-muted-foreground mt-3">{format(new Date(a.created_at), 'dd MMM yyyy · h:mm a')}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
