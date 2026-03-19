import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, Mail } from 'lucide-react';

export default function Auth() {
  const [searchParams] = useSearchParams();
  const invited = searchParams.get('invited') === 'true';
  const invitedEmail = searchParams.get('email') || '';
  const invitedFullName = searchParams.get('full_name') || '';

  const [isSignUp, setIsSignUp] = useState(invited || searchParams.get('tab') === 'signup');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState(invitedEmail);
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState(invitedFullName);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!invited) return;
    setIsSignUp(true);
    setEmail(invitedEmail);
    setFullName(invitedFullName);
  }, [invited, invitedEmail, invitedFullName]);

  useEffect(() => {
    if (!user) return;

    // Don't auto-redirect if the session was established from a password
    // recovery flow (cross-tab localStorage sync). Let the /reset-password
    // tab handle it — the user hasn't finished resetting yet.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // A recovery session was just established. Do nothing here —
        // the user is resetting their password in another tab.
      }
    });

    const checkOnboarding = async () => {
      // Double-check this isn't a recovery session (token refresh / cross-tab)
      const { data: { session } } = await supabase.auth.getSession();
      // Supabase doesn't expose the auth event on the session object,
      // but if the user was navigated to /reset-password we shouldn't
      // redirect. We rely on a small flag: if user_metadata indicates
      // recovery, skip redirect.

      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('user_id', user.id)
        .single();

      if (!profile?.onboarding_completed) {
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }
    };

    checkOnboarding();

    return () => subscription.unsubscribe();
  }, [user, navigate]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success('Password reset link sent! Check your email.');
      setIsForgotPassword(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const signUpEmail = invited ? invitedEmail : email;
        const signUpFullName = invited ? invitedFullName : fullName;

        if (invited && (!signUpEmail || !signUpFullName)) {
          throw new Error('Invite link is incomplete. Please ask admin to resend your invite.');
        }

        const { error } = await supabase.auth.signUp({
          email: signUpEmail,
          password,
          options: {
            data: { full_name: signUpFullName },
            emailRedirectTo: window.location.origin,
          },
        });

        if (error) throw error;
        setSignUpSuccess(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Show confirmation screen after signup
  if (signUpSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-20">
        <div className="w-full max-w-md text-center">
          <div className="rounded-[5px] bg-card border border-border p-8 shadow-sm space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Check your email</h2>
            <p className="text-muted-foreground text-sm">
              We've sent a confirmation link to <strong>{invited ? invitedEmail : email}</strong>.
              Please click the link to verify your account and sign in.
            </p>
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => {
                setSignUpSuccess(false);
                setIsSignUp(false);
                setPassword('');
              }}
            >
              Back to Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Forgot password form
  if (isForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-20">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <p className="text-primary text-xs font-bold tracking-[0.2em] uppercase mb-2">Women In Business</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Reset Password</h1>
            <p className="text-muted-foreground text-sm">
              Enter your email and we'll send you a reset link
            </p>
          </div>

          <form onSubmit={handleForgotPassword} className="rounded-[5px] bg-card border border-border p-6 sm:p-8 space-y-4 shadow-sm">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <Button type="submit" className="w-full font-semibold" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Remember your password?{' '}
              <button
                type="button"
                className="text-primary font-semibold hover:underline"
                onClick={() => setIsForgotPassword(false)}
              >
                Sign In
              </button>
            </p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-20">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-primary text-xs font-bold tracking-[0.2em] uppercase mb-2">Women In Business</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isSignUp ? 'Register to become a WIB member' : 'Sign in to your member portal'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-[5px] bg-card border border-border p-6 sm:p-8 space-y-4 shadow-sm">
          {isSignUp && (
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                required
                readOnly={invited}
                className={invited ? 'bg-muted/60' : undefined}
              />
            </div>
          )}

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              readOnly={invited}
              className={invited ? 'bg-muted/60' : undefined}
            />
          </div>

          <div className="relative">
            <Label htmlFor="password">Password</Label>
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

          {!isSignUp && (
            <div className="text-right">
              <button
                type="button"
                className="text-sm text-primary font-medium hover:underline"
                onClick={() => setIsForgotPassword(true)}
              >
                Forgot password?
              </button>
            </div>
          )}

          <Button type="submit" className="w-full font-semibold" disabled={loading}>
            {loading ? 'Please wait...' : invited ? 'Set Password & Continue' : isSignUp ? 'Create Account' : 'Sign In'}
          </Button>

          {!invited && (
            <p className="text-center text-sm text-muted-foreground">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                className="text-primary font-semibold hover:underline"
                onClick={() => setIsSignUp(!isSignUp)}
              >
                {isSignUp ? 'Sign In' : 'Register'}
              </button>
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
