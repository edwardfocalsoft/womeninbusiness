import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

// Routes a non-admin member is allowed to access while compliance is pending.
const ALLOWED_PATHS = ['/compliance', '/onboarding', '/auth', '/reset-password', '/', '/settings', '/profile'];

export default function ComplianceGate() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user || isAdmin) { setChecked(true); return; }

    let cancelled = false;
    (async () => {
      // Only enforce after onboarding is complete
      const { data: profile } = await supabase
        .from('profiles').select('onboarding_completed').eq('user_id', user.id).maybeSingle();
      if (!profile?.onboarding_completed) { if (!cancelled) setChecked(true); return; }

      const { data: rec } = await supabase
        .from('compliance_records').select('completed').eq('user_id', user.id).maybeSingle();
      const done = !!rec?.completed;

      if (!done && !ALLOWED_PATHS.includes(location.pathname)) {
        navigate('/compliance?from=onboarding', { replace: true });
      }
      if (!cancelled) setChecked(true);
    })();
    return () => { cancelled = true; };
  }, [user, isAdmin, authLoading, location.pathname, navigate]);

  return null;
}
