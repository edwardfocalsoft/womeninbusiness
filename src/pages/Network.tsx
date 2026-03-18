import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, Globe, Briefcase } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Profile {
  id: string; full_name: string; business_name: string | null; industry: string | null;
  products_services: string | null; bio: string | null; avatar_url: string | null;
  location: string | null; website: string | null;
}

export default function Network() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('profiles').select('*').not('business_name', 'is', null).then(({ data }) => {
      setProfiles((data as Profile[]) || []); setLoading(false);
    });
  }, []);

  const filtered = profiles.filter(p =>
    [p.full_name, p.business_name, p.industry, p.products_services].some(f => f?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-background">
      <section className="bg-gradient-hero section-padding text-center">
        <div className="container px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">Member Directory</h1>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base">Discover women-owned businesses and connect.</p>
          </motion.div>
        </div>
      </section>

      <div className="container py-8 sm:py-12 px-4">
        <div className="relative max-w-md mx-auto mb-10">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Search by name, industry, or service..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="rounded-[5px] border border-border p-6 animate-pulse bg-card">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-muted" />
                  <div className="flex-1"><div className="h-4 bg-muted rounded w-1/2 mb-2" /><div className="h-3 bg-muted rounded w-1/3" /></div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No members found matching your search.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="rounded-[5px] border border-border p-6 bg-card hover:shadow-lg transition-all">
                <div className="flex items-center gap-4 mb-4">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={p.avatar_url || ''} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">{p.full_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-bold text-base">{p.full_name}</h3>
                    {p.business_name && <p className="text-sm text-primary">{p.business_name}</p>}
                  </div>
                </div>
                {p.industry && <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2"><Briefcase className="w-3 h-3" /> {p.industry}</div>}
                {p.location && <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2"><MapPin className="w-3 h-3" /> {p.location}</div>}
                {p.products_services && <p className="text-xs text-muted-foreground line-clamp-2 mt-2">{p.products_services}</p>}
                {p.website && <a href={p.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary mt-3 hover:underline"><Globe className="w-3 h-3" /> Website</a>}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
