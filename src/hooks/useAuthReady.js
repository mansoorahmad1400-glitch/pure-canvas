import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Returns { user, isReady } and only flips isReady=true after the initial
 * supabase session has been restored from storage. Prevents queries from
 * racing auth hydration (which otherwise causes blank pages on first load).
 */
export function useAuthReady() {
  const [user, setUser] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Subscribe FIRST so we don't miss events fired during getSession()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        setUser(session?.user ?? null);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setIsReady(true);
    }).catch(() => {
      if (!mounted) return;
      setIsReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, isReady };
}

export default useAuthReady;
