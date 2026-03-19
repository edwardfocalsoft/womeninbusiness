import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [isCheckingLink, setIsCheckingLink] = useState(true);
  const resolvedRef = useRef(false);

  useEffect(() => {
    let active = true;

    const resolve = (value: boolean) => {
      if (!active || resolvedRef.current) return;
      resolvedRef.current = true;
      setIsRecovery(value);
      setIsCheckingLink(false);
    };

    // 1) Listen for PASSWORD_RECOVERY event (fires if Supabase processes
    //    the hash *after* this listener is registered — unlikely but possible)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        resolve(true);
      }
    });

    // 2) Actively check whether we already have a session.
    //    Supabase processes the recovery hash during client init (before
    //    React mounts), so by now the session is already established and
    //    the PASSWORD_RECOVERY event has already fired.  A valid session
    //    on /reset-password is sufficient proof the user came from a
    //    recovery link — normal users never navigate here directly.
    const checkSession = async () => {
      try {
        // Handle PKCE code exchange if present
        const code = searchParams.get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          if (active) {
            window.history.replaceState({}, document.title, '/reset-password');
            resolve(true);
          }
          return;
        }

        // Handle token_hash if present (email OTP flow)
        const tokenHash =
          searchParams.get('token_hash') ||
          new URLSearchParams(window.location.hash.replace(/^#/, '')).get('token_hash');
        const type =
          searchParams.get('type') ||
          new URLSearchParams(window.location.hash.replace(/^#/, '')).get('type');

        if (tokenHash && type === 'recovery') {
          const { error } = await supabase.auth.verifyOtp({
            type: 'recovery',
            token_hash: tokenHash,
          });
          if (error) throw error;
          if (active) {
            window.history.replaceState({}, document.title, '/reset-password');
            resolve(true);
          }
          return;
        }

        // Fallback: check if session already exists (hash was already consumed)
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (active) {
          resolve(Boolean(session));
        }
      } catch (err) {
        console.error('Recovery link processing failed', err);
        if (active) resolve(false);
      }
    };

    checkSession();

    // Safety net: if nothing resolves within 4s, show invalid
    const timeout = setTimeout(() => resolve(false), 4000);

    return () => {
      active = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      // Sign out so the cross-tab session doesn't auto-redirect on /auth
      await supabase.auth.signOut();

      setSuccess(true);
      toast.success('Password updated successfully!');
      setTimeout(() => navigate('/auth'), 2000);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-20">
        <div className="w-full max-w-md text-center">
          <div className="rounded-[5px] bg-card border border-border p-8 shadow-sm space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Password Updated</h2>
            <p className="text-muted-foreground text-sm">
              Your password has been reset. Redirecting you to sign in...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isCheckingLink) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-20">
        <div className="w-full max-w-md text-center">
          <div className="rounded-[5px] bg-card border border-border p-8 shadow-sm space-y-4">
            <p className="text-muted-foreground text-sm">Validating reset link…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-20">
        <div className="w-full max-w-md text-center">
          <div className="rounded-[5px] bg-card border border-border p-8 shadow-sm space-y-4">
            <h2 className="text-xl font-bold text-foreground">Invalid or expired link</h2>
            <p className="text-muted-foreground text-sm">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <Button className="w-full" onClick={() => navigate('/auth')}>
              Back to Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-20">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-primary text-xs font-bold tracking-[0.2em] uppercase mb-2">Women In Business</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Set New Password</h1>
          <p className="text-muted-foreground text-sm">Enter your new password below</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-[5px] bg-card border border-border p-6 sm:p-8 space-y-4 shadow-sm">
          <div>
            <Label htmlFor="password">New Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          <Button type="submit" className="w-full font-semibold" disabled={loading}>
            {loading ? 'Updating...' : 'Update Password'}
          </Button>
        </form>
      </div>
    </div>
  );
}
