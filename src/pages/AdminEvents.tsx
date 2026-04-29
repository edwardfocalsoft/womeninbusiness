import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil, Eye, Calendar, MapPin, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { format } from 'date-fns';
import ImageCropper from '@/components/ImageCropper';

const emptyForm = {
  title: '', description: '', event_type: 'virtual', location: '', virtual_link: '',
  start_date: '', end_date: '', price: '0', member_price: '0', is_members_only: false, max_attendees: '',
};

export default function AdminEvents() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewEvent, setViewEvent] = useState<any | null>(null);
  const [rsvps, setRsvps] = useState<any[]>([]);

  useEffect(() => { if (!authLoading && !isAdmin) navigate('/dashboard'); }, [isAdmin, authLoading]);
  useEffect(() => { if (isAdmin) fetchEvents(); }, [isAdmin]);

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('start_date', { ascending: true });
    setEvents(data || []);
    const cm: Record<string, number> = {};
    await Promise.all((data || []).map(async (e) => {
      const { data: c } = await supabase.rpc('get_event_rsvp_count', { _event_id: e.id });
      cm[e.id] = (c as number) ?? 0;
    }));
    setCounts(cm);
  };

  const openCreate = () => {
    setEditingId(null); setForm(emptyForm); setCroppedBlob(null); setImagePreview(null); setRawImageSrc(null);
    setDialogOpen(true);
  };

  const openEdit = (e: any) => {
    setEditingId(e.id);
    setForm({
      title: e.title || '', description: e.description || '', event_type: e.event_type || 'virtual',
      location: e.location || '', virtual_link: e.virtual_link || '',
      start_date: e.start_date ? new Date(e.start_date).toISOString().slice(0, 16) : '',
      end_date: e.end_date ? new Date(e.end_date).toISOString().slice(0, 16) : '',
      price: String(e.price ?? 0), member_price: String(e.member_price ?? 0),
      is_members_only: !!e.is_members_only, max_attendees: e.max_attendees ? String(e.max_attendees) : '',
    });
    setImagePreview(e.image_url || null);
    setCroppedBlob(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let image_url: string | null | undefined = imagePreview && !croppedBlob ? imagePreview : undefined;
      if (croppedBlob) {
        const path = `events/${Date.now()}-cropped.jpg`;
        const { error: upErr } = await supabase.storage.from('event-images').upload(path, croppedBlob);
        if (upErr) throw upErr;
        image_url = supabase.storage.from('event-images').getPublicUrl(path).data.publicUrl;
      }
      const payload: any = {
        title: form.title, description: form.description, event_type: form.event_type as any,
        location: form.location || null, virtual_link: form.virtual_link || null,
        start_date: form.start_date, end_date: form.end_date, price: parseFloat(form.price),
        member_price: parseFloat(form.member_price), is_members_only: form.is_members_only,
        max_attendees: form.max_attendees ? parseInt(form.max_attendees) : null,
      };
      if (image_url !== undefined) payload.image_url = image_url;

      if (editingId) {
        const { error } = await supabase.from('events').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('Event updated!');
      } else {
        const { error } = await supabase.from('events').insert(payload);
        if (error) throw error;
        toast.success('Event created!');
      }
      setDialogOpen(false);
      setForm(emptyForm); setEditingId(null);
      setCroppedBlob(null); setImagePreview(null); setRawImageSrc(null);
      fetchEvents();
    } catch (err: any) { toast.error(err.message); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this event?')) return;
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Event deleted'); fetchEvents();
  };

  const openView = async (e: any) => {
    setViewEvent(e);
    const { data: rs } = await supabase.from('rsvps').select('*').eq('event_id', e.id).order('created_at', { ascending: false });
    if (!rs?.length) { setRsvps([]); return; }
    const userIds = rs.map(r => r.user_id);
    const { data: profs } = await supabase.from('profiles').select('user_id, full_name, business_name, phone').in('user_id', userIds);
    const map: Record<string, any> = {};
    (profs || []).forEach((p: any) => { map[p.user_id] = p; });
    setRsvps(rs.map(r => ({ ...r, profile: map[r.user_id] })));
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>;

  return (
    <div className="py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">Manage Events</h1>
          <p className="text-muted-foreground text-sm">Create, edit and view RSVPs.</p>
        </div>
        <Button className="gap-2" onClick={openCreate}><Plus className="w-4 h-4" /> Create Event</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {events.length === 0 && <p className="text-sm text-muted-foreground text-center py-8 col-span-full">No events yet.</p>}
        {events.map(e => {
          const isPast = new Date(e.start_date) < new Date();
          const full = e.max_attendees != null && (counts[e.id] ?? 0) >= e.max_attendees;
          return (
            <div key={e.id} className="rounded-[5px] border border-border bg-card overflow-hidden shadow-sm flex flex-col">
              {e.image_url && <img src={e.image_url} alt={e.title} className="h-32 w-full object-cover" />}
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex flex-wrap items-center gap-1 mb-2">
                  <Badge variant="secondary" className="text-[10px]">{e.event_type}</Badge>
                  {isPast && <Badge variant="outline" className="text-[10px]">Past</Badge>}
                  {full && !isPast && <Badge variant="destructive" className="text-[10px]">Full</Badge>}
                  {e.is_members_only && <Badge className="bg-primary/10 text-primary text-[10px]">Members</Badge>}
                </div>
                <h3 className="font-bold text-sm mb-1 line-clamp-1">{e.title}</h3>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-2">
                  <Calendar className="w-3 h-3" /> {format(new Date(e.start_date), 'MMM dd, yyyy · h:mm a')}
                </div>
                {e.location && <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-2"><MapPin className="w-3 h-3" /> {e.location}</div>}
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-3">
                  <Users className="w-3 h-3" /> {counts[e.id] ?? 0}{e.max_attendees ? ` / ${e.max_attendees}` : ''} RSVPs
                </div>
                <div className="mt-auto flex items-center justify-between gap-2">
                  <Badge variant="secondary">R{e.price}</Badge>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => openView(e)}><Eye className="w-3 h-3" /></Button>
                    <Button variant="outline" size="sm" onClick={() => openEdit(e)}><Pencil className="w-3 h-3" /></Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(e.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? 'Edit Event' : 'Create Event'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div><Label>Event Type</Label>
              <Select value={form.event_type} onValueChange={v => setForm(p => ({ ...p, event_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="physical">Physical</SelectItem>
                  <SelectItem value="virtual">Virtual</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(form.event_type === 'physical' || form.event_type === 'hybrid') && <div><Label>Location</Label><Input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} /></div>}
            {(form.event_type === 'virtual' || form.event_type === 'hybrid') && <div><Label>Virtual Link</Label><Input value={form.virtual_link} onChange={e => setForm(p => ({ ...p, virtual_link: e.target.value }))} /></div>}
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Start Date</Label><Input type="datetime-local" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} /></div>
              <div><Label>End Date</Label><Input type="datetime-local" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Price (R)</Label><Input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} /></div>
              <div><Label>Member Price (R)</Label><Input type="number" value={form.member_price} onChange={e => setForm(p => ({ ...p, member_price: e.target.value }))} /></div>
            </div>
            <div><Label>Max Attendees</Label><Input type="number" value={form.max_attendees} onChange={e => setForm(p => ({ ...p, max_attendees: e.target.value }))} placeholder="Leave blank for unlimited" /></div>
            <div>
              <Label>Event Image</Label>
              <Input type="file" accept="image/*" onChange={e => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = () => { setRawImageSrc(reader.result as string); setCropperOpen(true); };
                  reader.readAsDataURL(file);
                }
              }} />
              {imagePreview && <img src={imagePreview} alt="Preview" className="mt-2 rounded-[5px] max-h-32 object-cover w-full" />}
            </div>
            <ImageCropper
              open={cropperOpen}
              imageSrc={rawImageSrc || ''}
              onClose={() => setCropperOpen(false)}
              onCropComplete={(blob) => {
                setCroppedBlob(blob);
                setImagePreview(URL.createObjectURL(blob));
                setCropperOpen(false);
              }}
            />
            <div className="flex items-center gap-2">
              <input type="checkbox" id="evtMO" checked={form.is_members_only} onChange={e => setForm(p => ({ ...p, is_members_only: e.target.checked }))} />
              <Label htmlFor="evtMO">Members Only</Label>
            </div>
            <Button className="w-full" onClick={handleSave} loading={saving} loadingText={editingId ? 'Saving...' : 'Creating...'}>
              {editingId ? 'Save Changes' : 'Create Event'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View RSVPs dialog */}
      <Dialog open={!!viewEvent} onOpenChange={(o) => !o && setViewEvent(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {viewEvent && (
            <>
              <DialogHeader>
                <DialogTitle>{viewEvent.title}</DialogTitle>
                <DialogDescription>
                  {format(new Date(viewEvent.start_date), 'EEE, MMM dd, yyyy · h:mm a')} · {rsvps.filter(r => r.payment_status === 'free' || r.payment_status === 'paid').length} confirmed
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                {rsvps.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No RSVPs yet.</p>}
                {rsvps.map(r => (
                  <div key={r.id} className="flex items-center justify-between border-b border-border py-2 text-sm">
                    <div>
                      <p className="font-semibold">{r.profile?.full_name || '—'}</p>
                      <p className="text-xs text-muted-foreground">{r.profile?.business_name || ''} {r.profile?.phone ? `· ${r.profile.phone}` : ''}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={r.payment_status === 'paid' ? 'default' : r.payment_status === 'pending' ? 'destructive' : 'secondary'} className="text-[10px]">
                        {r.payment_status}
                      </Badge>
                      <p className="font-mono text-xs mt-1">{r.ticket_number}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
