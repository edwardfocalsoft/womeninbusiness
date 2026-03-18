import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, Ticket } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function EventHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [eventHistory, setEventHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    supabase.from('rsvps').select('*, events(title, start_date, event_type, location)').eq('user_id', user.id).order('created_at', { ascending: false })
      .then(({ data }) => { setEventHistory(data || []); setLoading(false); });
  }, [user]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;

  return (
    <div className="py-8">
      <div className="px-0">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">Event History</h1>
          <p className="text-muted-foreground text-sm">Your past and upcoming event RSVPs.</p>
        </div>

        {eventHistory.length === 0 ? (
          <div className="text-center py-20">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">No Event History</h3>
            <p className="text-sm text-muted-foreground">You haven't RSVP'd to any events yet.</p>
            <Button className="mt-4" asChild><Link to="/events">Browse Events</Link></Button>
          </div>
        ) : (
          <div className="space-y-3">
            {eventHistory.map(r => (
              <div key={r.id} className="rounded-[5px] border border-border bg-card p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm sm:text-base">{(r as any).events?.title || 'Event'}</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                    <span>{(r as any).events?.start_date ? format(new Date((r as any).events.start_date), 'dd MMM yyyy · h:mm a') : '—'}</span>
                    <span className="capitalize">{(r as any).events?.event_type}</span>
                    {(r as any).events?.location && <span>{(r as any).events.location}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={r.status === 'confirmed' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}>{r.status}</Badge>
                  <div className="text-right">
                    <p className="font-mono text-xs font-bold text-primary">{r.ticket_number}</p>
                    <p className="text-[10px] text-muted-foreground">Ticket</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
