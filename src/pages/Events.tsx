import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Globe, Users, Ticket, History, ChevronLeft, ChevronRight, CreditCard, Clock } from 'lucide-react';
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

const PER_PAGE = 9;

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.35 } }),
};

const getMerchantCredentials = (settings: any) => {
  if (settings?.payfast_mode === 'live') {
    return {
      merchantId: settings?.payfast_merchant_id_live || '',
      merchantKey: settings?.payfast_merchant_key_live || '',
      url: 'https://www.payfast.co.za/eng/process',
    };
  }
  return { merchantId: '10000100', merchantKey: '46f0cd694581a', url: 'https://sandbox.payfast.co.za/eng/process' };
};

export default function Events() {
  const { user, isMember } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  const [rsvps, setRsvps] = useState<Record<string, string>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [settings, setSettings] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [detail, setDetail] = useState<Event | null>(null);
  const [ticketDialog, setTicketDialog] = useState<{ open: boolean; ticket: string; eventTitle: string }>({ open: false, ticket: '', eventTitle: '' });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('upcoming');
  const [page, setPage] = useState(1);
  const [pastPage, setPastPage] = useState(1);
  const [rsvpLoading, setRsvpLoading] = useState(false);

  useEffect(() => {
    fetchEvents();
    if (user) {
      fetchRsvps();
      supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle().then(({ data }) => setProfile(data));
    }
    supabase.from('admin_settings').select('*').eq('id', 1).single().then(({ data }) => setSettings(data));
  }, [user]);

  useEffect(() => { setPage(1); }, [tab]);

  const fetchEvents = async () => {
    const now = new Date().toISOString();
    const [upcomingRes, pastRes] = await Promise.all([
      supabase.from('events').select('*').gte('start_date', now).order('start_date', { ascending: true }),
      supabase.from('events').select('*').lt('start_date', now).order('start_date', { ascending: false }),
    ]);
    const upcoming = (upcomingRes.data as Event[]) || [];
    const past = (pastRes.data as Event[]) || [];
    setEvents(upcoming);
    setPastEvents(past);
    // Fetch counts for upcoming events
    const allIds = [...upcoming, ...past].map(e => e.id);
    const countMap: Record<string, number> = {};
    await Promise.all(allIds.map(async (id) => {
      const { data } = await supabase.rpc('get_event_rsvp_count', { _event_id: id });
      countMap[id] = (data as number) ?? 0;
    }));
    setCounts(countMap);
    setLoading(false);
  };

  const fetchRsvps = async () => {
    if (!user) return;
    const { data } = await supabase.from('rsvps').select('event_id, ticket_number, payment_status').eq('user_id', user.id).eq('status', 'confirmed');
    const map: Record<string, string> = {};
    data?.forEach((r: any) => {
      // Only count as RSVP if free or paid (not pending payment)
      if (r.payment_status === 'free' || r.payment_status === 'paid') {
        map[r.event_id] = r.ticket_number;
      }
    });
    setRsvps(map);
  };

  const priceFor = (event: Event) => {
    if (isMember && event.member_price < event.price) return event.member_price;
    return event.price;
  };

  const isFull = (event: Event) => event.max_attendees != null && (counts[event.id] ?? 0) >= event.max_attendees;

  const handleConfirmRsvp = async (event: Event) => {
    if (!user) { toast.error('Please sign in to RSVP'); return; }
    if (rsvps[event.id]) { setTicketDialog({ open: true, ticket: rsvps[event.id], eventTitle: event.title }); return; }
    if (isFull(event)) { toast.error('This event has reached capacity.'); return; }

    const cost = priceFor(event);
    setRsvpLoading(true);
    try {
      if (cost > 0) {
        // Create rsvp with pending payment, then redirect to PayFast
        const paymentRef = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
        const { error } = await supabase.from('rsvps').insert({
          event_id: event.id, user_id: user.id, ticket_number: '',
          payment_status: 'pending', payment_reference: paymentRef,
        } as any);
        if (error) throw error;

        const { merchantId, merchantKey, url } = getMerchantCredentials(settings);
        const data: Record<string, string> = {
          merchant_id: merchantId, merchant_key: merchantKey,
          return_url: `${window.location.origin}/events?event_paid=${event.id}`,
          cancel_url: `${window.location.origin}/events?event_cancelled=${event.id}`,
          notify_url: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payfast-webhook`,
          name_first: profile?.full_name?.split(' ')[0] || '',
          name_last: profile?.full_name?.split(' ').slice(1).join(' ') || '',
          email_address: user.email || '',
          m_payment_id: paymentRef,
          amount: cost.toFixed(2),
          item_name: `Event: ${event.title}`.slice(0, 100),
          item_description: `RSVP for ${event.title}`.slice(0, 255),
          custom_str1: 'event_rsvp',
          custom_str2: event.id,
        };
        const form = document.createElement('form');
        form.method = 'POST'; form.action = url;
        Object.entries(data).forEach(([k, v]) => {
          const i = document.createElement('input');
          i.type = 'hidden'; i.name = k; i.value = v; form.appendChild(i);
        });
        document.body.appendChild(form);
        form.submit();
        return;
      }

      // Free event
      const { data, error } = await supabase.from('rsvps').insert({
        event_id: event.id, user_id: user.id, ticket_number: '',
        payment_status: 'free',
      } as any).select('ticket_number').single();
      if (error) throw error;
      toast.success('RSVP confirmed!');
      setRsvps(prev => ({ ...prev, [event.id]: data.ticket_number }));
      setCounts(prev => ({ ...prev, [event.id]: (prev[event.id] ?? 0) + 1 }));
      setDetail(null);
      setTicketDialog({ open: true, ticket: data.ticket_number, eventTitle: event.title });
    } catch (err: any) {
      toast.error(err.message || 'Failed to RSVP');
    }
    setRsvpLoading(false);
  };

  // Handle paid return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paid = params.get('event_paid');
    if (paid && user) {
      // Mark rsvp as paid
      supabase.from('rsvps').update({ payment_status: 'paid' } as any)
        .eq('user_id', user.id).eq('event_id', paid).eq('payment_status', 'pending')
        .then(() => {
          toast.success('Payment successful! Your RSVP is confirmed.');
          fetchRsvps();
          fetchEvents();
          window.history.replaceState({}, '', '/events');
        });
    }
  }, [user]);

  const getEventTypeIcon = (type: string) => {
    switch (type) { case 'virtual': return <Globe className="w-4 h-4" />; case 'physical': return <MapPin className="w-4 h-4" />; default: return <Users className="w-4 h-4" />; }
  };

  const renderEventCard = (event: Event, i: number, isPast = false) => {
    const full = isFull(event);
    const cost = priceFor(event);
    return (
      <motion.div key={event.id} initial="hidden" animate="visible" variants={fadeUp} custom={i}
        className="rounded-[5px] border border-border overflow-hidden group bg-card hover:shadow-lg transition-all flex flex-col">
        {event.image_url && (
          <div className="h-40 overflow-hidden">
            <img src={event.image_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          </div>
        )}
        <div className="p-4 flex flex-col flex-1">
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            <Badge variant="secondary" className="text-[10px] gap-1">{getEventTypeIcon(event.event_type)} {event.event_type}</Badge>
            {event.is_members_only && <Badge className="bg-primary/10 text-primary text-[10px]">Members Only</Badge>}
            {isPast && <Badge variant="outline" className="text-[10px]">Past</Badge>}
            {full && !isPast && <Badge variant="destructive" className="text-[10px]">Full</Badge>}
          </div>
          <h3 className="text-base font-bold mb-1 line-clamp-1">{event.title}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2 flex-1">{event.description}</p>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-3">
            <Calendar className="w-3 h-3" /> {format(new Date(event.start_date), 'MMM dd, yyyy · h:mm a')}
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold">{cost > 0 ? `R${cost}` : 'Free'}</span>
            {!isPast ? (
              <Button size="sm" className={rsvps[event.id] ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80' : ''} onClick={() => setDetail(event)}>
                {rsvps[event.id] ? <><Ticket className="w-3 h-3 mr-1" /> Ticket</> : 'View / RSVP'}
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setDetail(event)}>View</Button>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const renderPagination = (total: number, current: number, setCurrent: (n: number) => void) => {
    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
    if (totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-center gap-3 mt-6">
        <Button variant="outline" size="sm" disabled={current <= 1} onClick={() => setCurrent(current - 1)}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-xs text-muted-foreground">Page {current} of {totalPages}</span>
        <Button variant="outline" size="sm" disabled={current >= totalPages} onClick={() => setCurrent(current + 1)}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    );
  };

  const pagedUpcoming = events.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const pagedPast = pastEvents.slice((pastPage - 1) * PER_PAGE, pastPage * PER_PAGE);

  return (
    <div className="min-h-screen bg-background">
      <section className="bg-gradient-hero py-10 sm:py-14 text-center">
        <div className="container px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3">Events</h1>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base">Connect, learn, and grow with fellow members.</p>
          </motion.div>
        </div>
      </section>

      <div className="container py-6 sm:py-8 px-4">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="mb-6 grid w-full grid-cols-2">
            <TabsTrigger value="upcoming" className="gap-2"><Calendar className="w-4 h-4" /> Upcoming</TabsTrigger>
            <TabsTrigger value="past" className="gap-2"><History className="w-4 h-4" /> Previous Events</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="rounded-[5px] border border-border p-4 animate-pulse bg-card">
                    <div className="h-32 bg-muted rounded-[5px] mb-3" />
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
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {pagedUpcoming.map((event, i) => renderEventCard(event, i))}
                </div>
                {renderPagination(events.length, page, setPage)}
              </>
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
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {pagedPast.map((event, i) => renderEventCard(event, i, true))}
                </div>
                {renderPagination(pastEvents.length, pastPage, setPastPage)}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Event Detail Modal */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{detail.title}</DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-2 pt-1">
                  <Badge variant="secondary" className="text-[10px] gap-1">{getEventTypeIcon(detail.event_type)} {detail.event_type}</Badge>
                  {detail.is_members_only && <Badge className="bg-primary/10 text-primary text-[10px]">Members Only</Badge>}
                  {isFull(detail) && <Badge variant="destructive" className="text-[10px]">Full</Badge>}
                </DialogDescription>
              </DialogHeader>

              {detail.image_url && (
                <img src={detail.image_url} alt={detail.title} className="w-full h-48 object-cover rounded-[5px]" />
              )}

              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground whitespace-pre-line">{detail.description}</p>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(detail.start_date), 'EEEE, MMM dd, yyyy · h:mm a')}
                </div>
                {detail.location && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" /> {detail.location}
                  </div>
                )}
                {detail.virtual_link && rsvps[detail.id] && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Globe className="w-4 h-4" /> <a className="text-primary underline" href={detail.virtual_link} target="_blank" rel="noopener noreferrer">Join Link</a>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Capacity</p>
                    <p className="text-sm font-semibold">
                      {counts[detail.id] ?? 0}{detail.max_attendees ? ` / ${detail.max_attendees}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Price</p>
                    <p className="text-lg font-bold">{priceFor(detail) > 0 ? `R${priceFor(detail)}` : 'Free'}</p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                {rsvps[detail.id] ? (
                  <div className="rounded-[5px] bg-secondary p-4 text-center">
                    <Ticket className="w-6 h-6 text-primary mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">Your ticket</p>
                    <p className="font-mono font-bold tracking-wider">{rsvps[detail.id]}</p>
                  </div>
                ) : new Date(detail.start_date) < new Date() ? (
                  <p className="text-center text-xs text-muted-foreground">This event has already taken place.</p>
                ) : isFull(detail) ? (
                  <Button className="w-full" disabled><Clock className="w-4 h-4 mr-2" /> Event is Full</Button>
                ) : priceFor(detail) > 0 ? (
                  <Button className="w-full" onClick={() => handleConfirmRsvp(detail)} loading={rsvpLoading} loadingText="Redirecting to PayFast...">
                    <CreditCard className="w-4 h-4 mr-2" /> Pay R{priceFor(detail)} & RSVP
                  </Button>
                ) : (
                  <Button className="w-full" onClick={() => handleConfirmRsvp(detail)} loading={rsvpLoading} loadingText="Confirming...">
                    Confirm RSVP
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

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
