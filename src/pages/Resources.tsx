import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Download, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Resource {
  id: string; title: string; description: string | null; category: string | null;
  file_url: string | null; is_members_only: boolean;
}

export default function Resources() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('resources').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      setResources((data as Resource[]) || []); setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <section className="bg-gradient-hero section-padding text-center">
        <div className="container px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">Resources</h1>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base">Guides, templates, and insights for members.</p>
          </motion.div>
        </div>
      </section>

      <div className="container py-8 sm:py-12 px-4">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1,2,3].map(i => <div key={i} className="rounded-[5px] border border-border p-6 animate-pulse bg-card"><div className="h-4 bg-muted rounded w-3/4 mb-2" /><div className="h-3 bg-muted rounded w-1/2" /></div>)}
          </div>
        ) : resources.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">No Resources Yet</h3>
            <p className="text-muted-foreground text-sm">Check back soon!</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {resources.map((r, i) => (
              <motion.div key={r.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="rounded-[5px] border border-border p-6 bg-card hover:shadow-lg transition-all">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-5 h-5 text-primary" />
                  {r.category && <Badge variant="secondary" className="text-xs">{r.category}</Badge>}
                </div>
                <h3 className="font-bold text-base mb-2">{r.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{r.description}</p>
                {r.file_url && (
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => window.open(r.file_url!, '_blank')}>
                    <Download className="w-3 h-3" /> Download
                  </Button>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
