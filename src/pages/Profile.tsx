import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Camera } from 'lucide-react';

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    full_name: '', business_name: '', industry: '', products_services: '',
    bio: '', avatar_url: '', website: '', phone: '', location: '',
  });

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    supabase.from('profiles').select('*').eq('user_id', user.id).single().then(({ data }) => {
      if (data) setForm({
        full_name: data.full_name || '', business_name: data.business_name || '',
        industry: data.industry || '', products_services: data.products_services || '',
        bio: data.bio || '', avatar_url: data.avatar_url || '',
        website: data.website || '', phone: data.phone || '', location: data.location || '',
      });
    });
  }, [user, navigate]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (uploadError) { toast.error('Upload failed'); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
    setForm(prev => ({ ...prev, avatar_url: publicUrl }));
    setUploading(false);
    toast.success('Photo uploaded!');
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from('profiles').update(form).eq('user_id', user.id);
    if (error) toast.error('Failed to save');
    else toast.success('Profile updated!');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-2xl px-4">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">My Profile</h1>
          <p className="text-muted-foreground text-sm">Manage your personal and business details.</p>
        </div>

        <div className="rounded-[5px] border border-border bg-card p-5 sm:p-8 space-y-6 shadow-sm">
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="w-20 h-20">
                <AvatarImage src={form.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">{form.full_name?.charAt(0) || '?'}</AvatarFallback>
              </Avatar>
              <label className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors">
                <Camera className="w-4 h-4" />
                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} />
              </label>
            </div>
            <div>
              <h3 className="text-lg font-bold">{form.full_name || 'Your Name'}</h3>
              <p className="text-sm text-muted-foreground">{uploading ? 'Uploading...' : 'Click the camera to upload a photo'}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div><Label>Full Name</Label><Input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} /></div>
            <div><Label>Business Name</Label><Input value={form.business_name} onChange={e => setForm(p => ({ ...p, business_name: e.target.value }))} /></div>
            <div><Label>Industry</Label><Input value={form.industry} onChange={e => setForm(p => ({ ...p, industry: e.target.value }))} placeholder="e.g. Technology, Fashion" /></div>
            <div><Label>Location</Label><Input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="City, Country" /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
            <div><Label>Website</Label><Input value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} placeholder="https://" /></div>
          </div>
          <div><Label>Products / Services</Label><Input value={form.products_services} onChange={e => setForm(p => ({ ...p, products_services: e.target.value }))} placeholder="What does your business offer?" /></div>
          <div><Label>Bio</Label><Textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} rows={4} placeholder="Tell us about yourself..." /></div>

          <Button className="w-full font-semibold" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      </div>
    </div>
  );
}
