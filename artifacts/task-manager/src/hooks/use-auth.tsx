import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { setAuthTokenGetter } from '@workspace/api-client-react';
import { useGetMe, useSyncMe, getGetMeQueryKey } from '@workspace/api-client-react';
import type { UserProfile } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  role: 'admin' | 'employee' | null;
  status: 'pending' | 'approved' | 'rejected' | null;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  role: null,
  status: null,
  isLoading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const queryClient = useQueryClient();
  
  // Use TanStack queries for profile
  const { data: profile, isLoading: isLoadingProfile, error, refetch: refetchProfile } = useGetMe({
    query: {
      enabled: !!session?.access_token,
      retry: false,
    } as any
  });

  const syncMe = useSyncMe();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.access_token) {
        setAuthTokenGetter(() => Promise.resolve(session.access_token));
      }
      setIsLoadingSession(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.access_token) {
        setAuthTokenGetter(() => Promise.resolve(session.access_token));
      } else {
        setAuthTokenGetter(() => Promise.resolve(null));
        queryClient.clear();
      }
      setIsLoadingSession(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle JIT Provisioning
  useEffect(() => {
    if (error && (error as any).status === 404 && user) {
      // 404 means profile doesn't exist yet, we need to sync it
      const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
      const email = user.email || '';
      
      syncMe.mutate({ data: { fullName, email } }, {
        onSuccess: () => {
          refetchProfile();
        }
      });
    }
  }, [error, user, syncMe, refetchProfile]);

  // A 404 error means we are going to create the profile via JIT provisioning.
  // Any other error is terminal and we should stop loading to prevent an infinite spinner.
  const isTerminalError = error && (error as any).status !== 404;
  const isProfileLoading = !!session && (!profile && !isTerminalError);
  const isLoading = isLoadingSession || isProfileLoading;

  return (
    <AuthContext.Provider value={{ session, user, profile: profile || null, role: profile?.role || null, status: profile?.status || null, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
