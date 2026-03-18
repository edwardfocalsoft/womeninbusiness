import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Trash2, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function AdminResources() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [resources, setResources] = useState<any[]>([]);
  const [form, setForm] = useState({ title: '', description: '', category: '', is_members_only: false });
  const [file, setFile] = useState<File | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!authLoading && !isAdmin) navigate('/dashboard'); }, [isAdmin, authLoading]);
  useEffect(() => { if (isAdmin) fetch(); }, [isAdmin]);

  const fetch = () => { supabase.from('resources').select('*').order('created_at', { ascending: false }).then(({ data }) => setResources(data || [])); };

  const handleCreate = async () => {
    setSaving(true);
    try {
      let file_url = null;
      if (file) {
        const path = `resources/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from('resources').upload(path, file);
        if (upErr) throw upErr;
        file_url = supabase.storage.from('resources').getPublicUrl(path).data.publicUrl;
      }
      const { error } = await supabase.from('resources').insert({ title: form.title, description: form.description, category: form.category || null, is_members_only: form.is_members_only, file_url });
      if (error) throw error;
      toast.success('Resource created!');
      setDialogOpen(false); setForm({ title: '', description: '', category: '', is_members_only: false }); setFile(null); fetch();
    } catch (err: any) { toast.error(err.message); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('resources').delete().eq('id', id);
    toast.success('Deleted'); fetch();
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1">Manage Resources</h1>
            <p className="text-muted-foreground text-sm">Upload and manage member resources.</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" /> Add Resource</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Resource</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
                <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
                <div><Label>Category</Label><Input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="e.g. Guide, Template" /></div>
                <div><Label>File</Label><Input type="file" onChange={e => setFile(e.target.files?.[0] || null)} /></div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="resMO" checked={form.is_members_only} onChange={e => setForm(p => ({ ...p, is_members_only: e.target.checked }))} />
                  <Label htmlFor="resMO">Members Only</Label>
                </div>
                <Button className="w-full" onClick={handleCreate} disabled={saving}>{saving ? 'Uploading...' : 'Add Resource'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {resources.map(r => (
            <div key={r.id} className="rounded-[5px] border border-border bg-card p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-sm">{r.title}</h3>
                  <div className="flex gap-2 text-xs text-muted-foreground mt-0.5">
                    {r.category && <span>{r.category}</span>}
                    <span>{r.is_members_only ? 'Members Only' : 'Public'}</span>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </div>
          ))}
          {resources.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No resources yet.</p>}
        </div>
      </div>
    </div>
  );
}
