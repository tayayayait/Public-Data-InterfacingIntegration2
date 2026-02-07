import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types';

// If the DB tables haven't been created yet, Supabase returns:
// PGRST205: "Could not find the table 'public.<table>' in the schema cache".
// Avoid spamming the network/console by remembering this for the session.
let profilesTableMissing = false;
let hasWarnedProfilesTableMissing = false;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  signInWithKakao: () => Promise<void>;
  signInWithNaver: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const activeUserIdRef = useRef<string | null>(null);
  const lastProfileUserIdRef = useRef<string | null>(null);
  const cachedProfileRef = useRef<Profile | null>(null);
  const inFlightProfileRef = useRef<{ userId: string; promise: Promise<Profile | null> } | null>(
    null
  );

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async (user: User) => {
      if (profilesTableMissing) return null;

      // `onAuthStateChange` can fire multiple times (SIGNED_IN, INITIAL_SESSION, TOKEN_REFRESHED...).
      // Only refetch the profile when the user actually changes.
      if (lastProfileUserIdRef.current === user.id) {
        const inFlight = inFlightProfileRef.current;
        if (inFlight?.userId === user.id) return await inFlight.promise;
        return cachedProfileRef.current;
      }

      lastProfileUserIdRef.current = user.id;
      const requestUserId = user.id;

      const promise = (async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', requestUserId)
          .maybeSingle();

        if (error) {
          // Missing table (common during initial project setup).
          if (error.code === 'PGRST205') {
            profilesTableMissing = true;
            if (!hasWarnedProfilesTableMissing) {
              hasWarnedProfilesTableMissing = true;
              console.warn(
                `[Auth] Supabase table public.profiles is missing. ` +
                  `Create the table (or run migrations) to enable profiles. ` +
                  `Details: ${error.message}`
              );
            }

            if (lastProfileUserIdRef.current === requestUserId) cachedProfileRef.current = null;
            return null;
          }

          console.error('[Auth] Failed to load profile:', error);
          if (lastProfileUserIdRef.current === requestUserId) cachedProfileRef.current = null;
          return null;
        }

        const nextProfile = (data as Profile | null) ?? null;
        if (lastProfileUserIdRef.current === requestUserId) cachedProfileRef.current = nextProfile;
        return nextProfile;
      })();

      inFlightProfileRef.current = { userId: requestUserId, promise };
      try {
        return await promise;
      } finally {
        if (inFlightProfileRef.current?.userId === requestUserId) inFlightProfileRef.current = null;
      }
    };

    const applySession = async (nextSession: Session | null) => {
      if (!isMounted) return;

      setIsLoading(true);
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      activeUserIdRef.current = nextSession?.user?.id ?? null;

      if (!nextSession?.user) {
        lastProfileUserIdRef.current = null;
        cachedProfileRef.current = null;
        inFlightProfileRef.current = null;
        setProfile(null);
        setIsLoading(false);
        return;
      }

      try {
        const nextProfile = await loadProfile(nextSession.user);
        if (!isMounted) return;
        if (activeUserIdRef.current !== nextSession.user.id) return;
        setProfile(nextProfile);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        try {
          await applySession(nextSession);
        } catch (e) {
          console.error('[Auth] Failed to apply session from auth state change:', e);
          await applySession(null);
        }
      }
    );

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => applySession(session))
      .catch((e) => {
        // If Auth init fails (e.g. lock acquire timeout), don't leave the UI stuck in loading.
        console.error('[Auth] supabase.auth.getSession() failed; treating as signed-out:', e);
        void applySession(null);
      });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    // Supabase `auth.signOut()` can hang if the network request to revoke tokens
    // never resolves. We prioritize making the UI and client state signed-out
    // immediately by clearing the local session and notifying subscribers.
    //
    // This mirrors what GoTrueClient does at the end of signOut(), but without
    // the remote revoke call.
    activeUserIdRef.current = null;
    lastProfileUserIdRef.current = null;
    cachedProfileRef.current = null;
    inFlightProfileRef.current = null;
    setSession(null);
    setUser(null);
    setProfile(null);

    try {
      const authAny = supabase.auth as any;
      if (typeof authAny?._removeSession === 'function') {
        await authAny._removeSession();
      } else {
        // Fallback: clear common storage keys even if the private API changes.
        const storageKey: string | undefined =
          authAny?.storageKey ??
          (() => {
            try {
              const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
              if (!url) return undefined;
              const ref = new URL(url).hostname.split('.')[0];
              return ref ? `sb-${ref}-auth-token` : undefined;
            } catch {
              return undefined;
            }
          })();

        if (storageKey) {
          localStorage.removeItem(storageKey);
          localStorage.removeItem(`${storageKey}-code-verifier`);
          localStorage.removeItem(`${storageKey}-user`);
        }
      }
    } catch (e) {
      console.warn('[Auth] Local sign-out cleanup failed:', e);
    }

    return { error: null };
  };

  const signInWithKakao = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: window.location.origin,
      },
    });
  };

  const signInWithNaver = async () => {
    // Naver는 Supabase에서 기본 지원하지 않으므로 커스텀 구현 필요
    // 현재는 UI만 구현
    console.log('Naver login - requires custom implementation');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        signIn,
        signUp,
        signOut,
        signInWithKakao,
        signInWithNaver,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
