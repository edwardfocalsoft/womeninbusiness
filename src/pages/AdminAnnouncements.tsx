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
import { Plus, Trash2, Edit2, Megaphone } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format } from 'date-fns';

export default function AdminAnnouncements() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [form, setForm] = useState({ title: '', content: '', priority: 'normal' });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!authLoading && !isAdmin) navigate('/dashboard'); }, [isAdmin, authLoading]);
  useEffect(() => { if (isAdmin) fetch(); }, [isAdmin]);

  const fetch = () => { supabase.from('announcements').select('*').order('created_at', { ascending: false }).then(({ data }) => setAnnouncements(data || [])); };

  const handleCreate = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('announcements').insert({ title: form.title, content: form.content, priority: form.priority, is_published: true });
      if (error) throw error;
      toast.success('Announcement published!');
      setDialogOpen(false); setForm({ title: '', content: '', priority: 'normal' }); fetch();
    } catch (err: any) { toast.error(err.message); }
    setSaving(false);
  };

  const togglePublish = async (id: string, current: boolean) => {
    await supabase.from('announcements').update({ is_published: !current }).eq('id', id);
    toast.success(current ? 'Unpublished' : 'Published'); fetch();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('announcements').delete().eq('id', id);
    toast.success('Deleted'); fetch();
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1">Announcements</h1>
            <p className="text-muted-foreground text-sm">Create and manage announcements.</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" /> New Announcement</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Announcement</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
                <div><Label>Content</Label><Textarea rows={5} value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} /></div>
                <div><Label>Priority</Label>
                  <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem><SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={handleCreate} disabled={saving}>{saving ? 'Publishing...' : 'Publish'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {announcements.map(a => (
            <div key={a.id} className="rounded-[5px] border border-border bg-card p-4 sm:p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-sm">{a.title}</h3>
                    <Badge className={`text-[10px] ${a.priority === 'urgent' ? 'bg-red-100 text-red-700 border-red-200' : a.priority === 'high' ? 'bg-amber-100 text-amber-700 border-amber-200' : ''}`}>{a.priority}</Badge>
                    <Badge variant={a.is_published ? 'default' : 'secondary'} className="text-[10px]">{a.is_published ? 'Published' : 'Draft'}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{a.content}</p>
                  <p className="text-[11px] text-muted-foreground mt-2">{format(new Date(a.created_at), 'dd MMM yyyy · h:mm a')}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => togglePublish(a.id, a.is_published)}>
                    {a.is_published ? <Edit2 className="w-4 h-4" /> : <Megaphone className="w-4 h-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(a.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </div>
            </div>
          ))}
          {announcements.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No announcements yet.</p>}
        </div>
      </div>
    </div>
  );
}
