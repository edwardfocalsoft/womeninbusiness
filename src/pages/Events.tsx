import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Globe, Users, Ticket, History } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Event {
  id: string; title: string; description: string; event_type: string;
  location: string | null; virtual_link: string | null; start_date: string;
  end_date: string; image_url: string | null; max_attendees: number | null;
  price: number; member_price: number; is_members_only: boolean;
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.4 } }),
};

export default function Events() {
  const { user, isMember } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  const [rsvps, setRsvps] = useState<Record<string, string>>({});
  const [ticketDialog, setTicketDialog] = useState<{ open: boolean; ticket: string; eventTitle: string }>({ open: false, ticket: '', eventTitle: '' });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('upcoming');

  useEffect(() => { fetchEvents(); if (user) fetchRsvps(); }, [user]);

  const fetchEvents = async () => {
    const now = new Date().toISOString();
    const [upcomingRes, pastRes] = await Promise.all([
      supabase.from('events').select('*').gte('start_date', now).order('start_date'),
      supabase.from('events').select('*').lt('start_date', now).order('start_date', { ascending: false }),
    ]);
    setEvents((upcomingRes.data as Event[]) || []);
    setPastEvents((pastRes.data as Event[]) || []);
    setLoading(false);
  };

  const fetchRsvps = async () => {
    if (!user) return;
    const { data } = await supabase.from('rsvps').select('event_id, ticket_number').eq('user_id', user.id).eq('status', 'confirmed');
    const map: Record<string, string> = {};
    data?.forEach(r => { map[r.event_id] = r.ticket_number; });
    setRsvps(map);
  };

  const handleRsvp = async (event: Event) => {
    if (!user) { toast.error('Please sign in to RSVP'); return; }
    if (rsvps[event.id]) { setTicketDialog({ open: true, ticket: rsvps[event.id], eventTitle: event.title }); return; }
    const { data, error } = await supabase.from('rsvps').insert({ event_id: event.id, user_id: user.id, ticket_number: '' }).select('ticket_number').single();
    if (error) { toast.error('Failed to RSVP'); return; }
    toast.success('RSVP confirmed!');
    setRsvps(prev => ({ ...prev, [event.id]: data.ticket_number }));
    setTicketDialog({ open: true, ticket: data.ticket_number, eventTitle: event.title });
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) { case 'virtual': return <Globe className="w-4 h-4" />; case 'physical': return <MapPin className="w-4 h-4" />; default: return <Users className="w-4 h-4" />; }
  };

  const renderEventCard = (event: Event, i: number, isPast = false) => (
    <motion.div key={event.id} initial="hidden" animate="visible" variants={fadeUp} custom={i}
      className="rounded-[5px] border border-border overflow-hidden group bg-card hover:shadow-lg transition-all">
      {event.image_url && (
        <div className="h-48 overflow-hidden">
          <img src={event.image_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
      )}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="secondary" className="text-xs gap-1">{getEventTypeIcon(event.event_type)} {event.event_type}</Badge>
          {event.is_members_only && <Badge className="bg-primary/10 text-primary text-xs">Members Only</Badge>}
          {isPast && <Badge variant="outline" className="text-xs">Past</Badge>}
        </div>
        <h3 className="text-lg font-bold mb-2">{event.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{event.description}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
          <Calendar className="w-3 h-3" /> {format(new Date(event.start_date), 'MMM dd, yyyy · h:mm a')}
        </div>
        {!isPast && (
          <div className="flex items-center justify-between">
            <div>
              {isMember && event.member_price < event.price ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-primary">R{event.member_price}</span>
                  <span className="text-xs text-muted-foreground line-through">R{event.price}</span>
                </div>
              ) : (
                <span className="text-sm font-bold">{event.price > 0 ? `R${event.price}` : 'Free'}</span>
              )}
            </div>
            <Button size="sm" className={rsvps[event.id] ? 'bg-secondary text-secondary-foreground' : ''} onClick={() => handleRsvp(event)}>
              {rsvps[event.id] ? <><Ticket className="w-4 h-4 mr-1" /> View Ticket</> : 'RSVP'}
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background">
      <section className="bg-gradient-hero section-padding text-center">
        <div className="container px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">Events</h1>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base">Connect, learn, and grow with fellow members.</p>
          </motion.div>
        </div>
      </section>

      <div className="container py-8 sm:py-12 px-4">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="upcoming" className="gap-2"><Calendar className="w-4 h-4" /> Upcoming</TabsTrigger>
            <TabsTrigger value="past" className="gap-2"><History className="w-4 h-4" /> Previous Events</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            {loading ? (
              <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="rounded-[5px] border border-border p-6 animate-pulse bg-card">
                    <div className="h-40 bg-muted rounded-[5px] mb-4" />
                    <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-20">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">No Upcoming Events</h3>
                <p className="text-muted-foreground text-sm">Check back soon for new events!</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
                {events.map((event, i) => renderEventCard(event, i))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past">
            {pastEvents.length === 0 ? (
              <div className="text-center py-20">
                <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">No Previous Events</h3>
                <p className="text-muted-foreground text-sm">Events you've missed will show here.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
                {pastEvents.map((event, i) => renderEventCard(event, i, true))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={ticketDialog.open} onOpenChange={open => setTicketDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your Ticket</DialogTitle>
            <DialogDescription>{ticketDialog.eventTitle}</DialogDescription>
          </DialogHeader>
          <div className="text-center py-6">
            <div className="inline-block bg-secondary rounded-[5px] px-8 py-6">
              <Ticket className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="font-mono text-2xl font-bold tracking-wider">{ticketDialog.ticket}</p>
              <p className="text-xs text-muted-foreground mt-2">Present this ticket at the event</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
