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
import { Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format } from 'date-fns';
import ImageCropper from '@/components/ImageCropper';

export default function AdminEvents() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [form, setForm] = useState({
    title: '', description: '', event_type: 'virtual' as string, location: '', virtual_link: '',
    start_date: '', end_date: '', price: '0', member_price: '0', is_members_only: false, max_attendees: '',
  });
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!authLoading && !isAdmin) navigate('/dashboard'); }, [isAdmin, authLoading]);
  useEffect(() => { if (isAdmin) fetchEvents(); }, [isAdmin]);

  const fetchEvents = () => { supabase.from('events').select('*').order('start_date', { ascending: false }).then(({ data }) => setEvents(data || [])); };

  const handleCreate = async () => {
    setSaving(true);
    try {
      let image_url = null;
      if (croppedBlob) {
        const path = `events/${Date.now()}-cropped.jpg`;
        const { error: upErr } = await supabase.storage.from('event-images').upload(path, croppedBlob);
        if (upErr) throw upErr;
        image_url = supabase.storage.from('event-images').getPublicUrl(path).data.publicUrl;
      }
      const { error } = await supabase.from('events').insert({
        title: form.title, description: form.description, event_type: form.event_type as any,
        location: form.location || null, virtual_link: form.virtual_link || null,
        start_date: form.start_date, end_date: form.end_date, price: parseFloat(form.price),
        member_price: parseFloat(form.member_price), is_members_only: form.is_members_only,
        max_attendees: form.max_attendees ? parseInt(form.max_attendees) : null, image_url,
      });
      if (error) throw error;
      toast.success('Event created!');
      setDialogOpen(false);
      setForm({ title: '', description: '', event_type: 'virtual', location: '', virtual_link: '', start_date: '', end_date: '', price: '0', member_price: '0', is_members_only: false, max_attendees: '' });
      setCroppedBlob(null); setImagePreview(null); setRawImageSrc(null); fetchEvents();
    } catch (err: any) { toast.error(err.message); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('events').delete().eq('id', id);
    toast.success('Event deleted'); fetchEvents();
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1">Manage Events</h1>
            <p className="text-muted-foreground text-sm">Create and manage platform events.</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" /> Create Event</Button></DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Create Event</DialogTitle></DialogHeader>
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
                <div><Label>Max Attendees</Label><Input type="number" value={form.max_attendees} onChange={e => setForm(p => ({ ...p, max_attendees: e.target.value }))} /></div>
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
                <Button className="w-full" onClick={handleCreate} disabled={saving}>{saving ? 'Creating...' : 'Create Event'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {events.map(e => (
            <div key={e.id} className="rounded-[5px] border border-border bg-card p-4 flex items-center justify-between shadow-sm">
              <div>
                <h3 className="font-bold text-sm">{e.title}</h3>
                <p className="text-xs text-muted-foreground">{format(new Date(e.start_date), 'MMM dd, yyyy')} · {e.event_type}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">R{e.price}</Badge>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(e.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
          {events.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No events yet.</p>}
        </div>
      </div>
    </div>
  );
}
