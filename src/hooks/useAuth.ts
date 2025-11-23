import { useEffect, useState, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../supabaseClient";

type UseAuthOptions = {
  onProjectsLoaded: (user: User, preserveView: boolean) => Promise<void>;
  onSignedOut: () => void;
};

export const useAuth = ({
  onProjectsLoaded,
  onSignedOut,
}: UseAuthOptions) => {
  const [user, setUser] = useState<User | null>(null);
  const authInitializedRef = useRef<boolean>(false);

  useEffect(() => {
    // Load current session
    supabase.auth.getSession().then(({ data }) => {
      const current = data.session?.user ?? null;
      setUser(current);
      if (current) {
        // On initial load, STRICTLY preserve current view
        onProjectsLoaded(current, true);
      } else {
        // Only set to home if not logged in AND not already in a logged-out view
        // BUT only on initial load - after that, preserve view
        if (!authInitializedRef.current) {
          // Initial load - only set to home if not already in a logged-out view
          // This is handled by the caller
        }
        onSignedOut();
      }
      // Mark auth as initialized after first check
      authInitializedRef.current = true;
    });

    // Watch for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null;

      // Use functional updates to avoid stale closure issues
      setUser((prevUser) => {
        // Check if user actually changed (not just token refresh)
        const userChanged = prevUser?.id !== u?.id;

        if (u) {
          // ULTRA STRICT: After initial load, NEVER change view automatically
          // If auth is already initialized, NEVER change view - just refresh projects
          if (authInitializedRef.current) {
            onProjectsLoaded(u, true);
            return u;
          }

          // Only on initial sign-in (before authInitialized is true)
          if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
            // Token refresh or user update - just refresh projects, never change view
            onProjectsLoaded(u, true);
            return u;
          } else if (event === "SIGNED_IN" && userChanged) {
            // Only on actual sign in with user change (and only before initialization)
            // The caller will handle view changes
            onProjectsLoaded(u, false);
            return u;
          } else {
            // For any other event, preserve view completely
            onProjectsLoaded(u, true);
            return u;
          }
        } else {
          // Only go to home on actual logout, and only if auth is initialized
          // (to avoid redirecting during initial load)
          if (event === "SIGNED_OUT" && authInitializedRef.current) {
            onSignedOut();
          }
        }

        return u;
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [onProjectsLoaded, onSignedOut]);

  return { user, authInitialized: authInitializedRef.current };
};

