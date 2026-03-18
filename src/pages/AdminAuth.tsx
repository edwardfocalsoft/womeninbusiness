import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import wibLogo from '@/assets/wib-logo.png';

export default function AdminAuth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  // Track whether the user just submitted the login form on this page
  const didSubmitRef = useRef(false);

  useEffect(() => {
    // Don't act while auth state is still resolving
    if (authLoading) return;

    if (user && isAdmin) {
      navigate('/admin/members');
      return;
    }

    // Only show the "no admin access" error if the user explicitly
    // submitted the login form on this page. This avoids the flash
    // when auth state is still settling after sign-in.
    if (user && !isAdmin && didSubmitRef.current) {
      toast.error('You do not have admin access.');
      supabase.auth.signOut();
      didSubmitRef.current = false;
    }
  }, [user, isAdmin, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    didSubmitRef.current = true;
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        didSubmitRef.current = false;
        throw error;
      }
      // Redirect handled by useEffect once auth + roles resolve
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-20">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={wibLogo} alt="Women In Business" className="h-16 mx-auto mb-4" />
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase mb-4">
            <ShieldCheck className="w-4 h-4" />
            Admin Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Admin Sign In</h1>
          <p className="text-muted-foreground text-sm">
            Access the Women In Business administration panel
          </p>
        </div>
        <form onSubmit={handleSubmit} className="rounded-[5px] bg-card border border-border p-6 sm:p-8 space-y-4 shadow-sm">
          <div>
            <Label htmlFor="email">Admin Email</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@womeninbusiness.co.za" required />
          </div>
          <div className="relative">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full font-semibold" disabled={submitting}>
            {submitting ? 'Authenticating...' : 'Sign In as Admin'}
          </Button>
        </form>
        <p className="text-center text-xs text-muted-foreground mt-6">
          This portal is restricted to authorized administrators only.
        </p>
      </div>
    </div>
  );
}
