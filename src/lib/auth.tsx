import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isMember: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  isAdmin: false,
  isMember: false,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const syncIdRef = useRef(0);

  const fetchRoleFlags = useCallback(async (userId: string) => {
    const [rolesResult, membershipResult] = await Promise.all([
      supabase.from('user_roles').select('role').eq('user_id', userId),
      supabase
        .from('memberships')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle(),
    ]);

    return {
      isAdmin: rolesResult.data?.some((row) => row.role === 'admin') ?? false,
      isMember: Boolean(membershipResult.data),
    };
  }, []);

  const syncAuthState = useCallback(
    async (nextSession: Session | null) => {
      const syncId = ++syncIdRef.current;
      setLoading(true);
      setSession(nextSession);

      if (!nextSession?.user) {
        if (syncId !== syncIdRef.current) return;
        setIsAdmin(false);
        setIsMember(false);
        setLoading(false);
        return;
      }

      try {
        const flags = await fetchRoleFlags(nextSession.user.id);
        if (syncId !== syncIdRef.current) return;
        setIsAdmin(flags.isAdmin);
        setIsMember(flags.isMember);
      } catch (error) {
        console.error('Failed to load role flags', error);
        if (syncId !== syncIdRef.current) return;
        setIsAdmin(false);
        setIsMember(false);
      } finally {
        if (syncId === syncIdRef.current) {
          setLoading(false);
        }
      }
    },
    [fetchRoleFlags],
  );

  useEffect(() => {
    let active = true;

    const handleSession = (nextSession: Session | null) => {
      if (!active) return;
      void syncAuthState(nextSession);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      handleSession(nextSession);
    });

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      handleSession(currentSession);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [syncAuthState]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        isAdmin,
        isMember,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
