import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const currentUserIdRef = useRef<string | null>(null);

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

  useEffect(() => {
    let active = true;

    const handleSession = async (
      nextSession: Session | null,
      isInitial: boolean,
      authEvent: AuthChangeEvent | 'INITIAL_SESSION',
    ) => {
      if (!active) return;

      const nextUser = nextSession?.user ?? null;
      const nextUserId = nextUser?.id ?? null;
      const userChanged = nextUserId !== currentUserIdRef.current;
      const shouldUpdateUserObject = userChanged || authEvent === 'USER_UPDATED' || (isInitial && Boolean(nextUser));

      // Keep user object stable on background auth updates (tab focus / token refresh)
      // so form initialization effects depending on [user] don't run again and wipe drafts.
      if (!isInitial && !userChanged && authEvent !== 'USER_UPDATED') {
        setSession(nextSession);
        return;
      }

      currentUserIdRef.current = nextUserId;
      setSession(nextSession);

      if (shouldUpdateUserObject) {
        setUser(nextUser);
      }

      if (!nextUser) {
        setUser(null);
        setIsAdmin(false);
        setIsMember(false);
        setLoading(false);
        return;
      }

      try {
        const flags = await fetchRoleFlags(nextUser.id);
        if (!active) return;
        setIsAdmin(flags.isAdmin);
        setIsMember(flags.isMember);
      } catch (error) {
        console.error('Failed to load role flags', error);
        if (!active) return;
        setIsAdmin(false);
        setIsMember(false);
      } finally {
        if (active) setLoading(false);
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      handleSession(nextSession, false, event);
    });

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      handleSession(currentSession, true, 'INITIAL_SESSION');
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [fetchRoleFlags]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
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