/**
 * Magic-link auth.
 *
 * Chosen over passwords because a rep signs in once on a tablet and stays
 * signed in; a password is one more thing to lose in a truck. When Supabase
 * is unconfigured the app runs in local-only mode rather than blocking on a
 * login screen — the appointment still has to work.
 */

import { useEffect, useState } from 'react';
import { isConfigured, supabase } from './supabase';

export type AuthState = {
  ready: boolean;
  email: string | null;
  userId: string | null;
  localOnly: boolean;
};

export function useAuth(): AuthState & {
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
} {
  const [state, setState] = useState<AuthState>({
    ready: !isConfigured,
    email: null,
    userId: null,
    localOnly: !isConfigured,
  });

  useEffect(() => {
    if (!supabase) return;

    void supabase.auth.getSession().then(({ data }) => {
      setState({
        ready: true,
        email: data.session?.user.email ?? null,
        userId: data.session?.user.id ?? null,
        localOnly: false,
      });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({
        ready: true,
        email: session?.user.email ?? null,
        userId: session?.user.id ?? null,
        localOnly: false,
      });
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return {
    ...state,
    signIn: async (email: string) => {
      if (!supabase) throw new Error('Supabase is not configured.');
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw new Error(error.message);
    },
    signOut: async () => {
      if (!supabase) return;
      await supabase.auth.signOut();
    },
  };
}
