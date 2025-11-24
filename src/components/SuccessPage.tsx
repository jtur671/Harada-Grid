import React, { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../supabaseClient";
import { getSubscriptionStatus } from "../services/subscriptions";
import { AppHeader } from "./AppHeader";

type AuthView = "login" | "signup" | null;

type SuccessPageProps = {
  user: User | null;
  isAdmin: boolean;
  isPro?: boolean;
  authView: AuthView;
  onSetAuthView: (view: AuthView) => void;
  onSetAppView: (view: "home" | "builder" | "harada" | "dashboard" | "pricing" | "support" | "success") => void;
  onSetUser?: (user: User | null) => void;
};

export const SuccessPage: React.FC<SuccessPageProps> = ({
  user,
  isAdmin,
  isPro = false,
  onSetAuthView,
  onSetAppView,
  onSetUser,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<"free" | "premium" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    let cancelled = false;
    let countdownInterval: number | null = null;

    const initializeSuccess = async () => {
      try {
        // Step 1: Check for Stripe success parameters (in both search and hash)
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const sessionId = urlParams.get("session_id") || hashParams.get("session_id");
        const redirectStatus = urlParams.get("redirect_status") || hashParams.get("redirect_status");

        // Clean up URL - remove success params from both search and hash
        if (sessionId || redirectStatus) {
          const cleanParams = new URLSearchParams(urlParams);
          cleanParams.delete("session_id");
          cleanParams.delete("redirect_status");
          const newSearch = cleanParams.toString();
          
          // Clean hash but preserve OAuth tokens if present
          const cleanHashParams = new URLSearchParams(hashParams);
          cleanHashParams.delete("session_id");
          cleanHashParams.delete("redirect_status");
          const newHash = cleanHashParams.toString();
          const finalHash = newHash ? `#${newHash}` : (hashParams.has("access_token") ? window.location.hash : "");
          
          window.history.replaceState(
            null,
            "",
            `${window.location.pathname}${newSearch ? `?${newSearch}` : ""}${finalHash}`
          );
        }

        // Step 2: Ensure user session is active
        // Check if we have OAuth tokens in hash (Stripe redirect might include them)
        const hasOAuthTokens = hashParams.has("access_token");
        
        let currentUser = user;
        
        // If we have a user already, use it (App.tsx should have loaded it)
        if (currentUser) {
          console.log("[SuccessPage] User already in state:", currentUser.email);
        } else if (hasOAuthTokens) {
          // OAuth tokens detected - wait for Supabase to process them
          console.log("[SuccessPage] OAuth tokens detected, waiting for Supabase to process...");
          await new Promise((resolve) => setTimeout(resolve, 1000));
          
          // Try to get session with timeout
          try {
            const sessionPromise = supabase.auth.getSession();
            const timeoutPromise = new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error("Session check timeout")), 5000)
            );
            
            const { data: sessionData, error: sessionError } = await Promise.race([
              sessionPromise,
              timeoutPromise,
            ]) as Awaited<ReturnType<typeof supabase.auth.getSession>>;
            
            if (sessionError) {
              console.error("[SuccessPage] Error getting session:", sessionError);
              setError("Failed to restore session. Please log in again.");
              setIsLoading(false);
              return;
            }
            currentUser = sessionData.session?.user ?? null;
            if (!currentUser) {
              console.error("[SuccessPage] No session found after OAuth");
              setError("No active session found. Please log in again.");
              setIsLoading(false);
              return;
            }
            console.log("[SuccessPage] Session restored for user:", currentUser.email);
            if (onSetUser) {
              onSetUser(currentUser);
            }
          } catch (err) {
            console.error("[SuccessPage] Session check failed:", err);
            setError("Unable to verify session. Please try logging in again.");
            setIsLoading(false);
            return;
          }
        } else {
          // No user and no OAuth tokens - try a quick session check
          console.log("[SuccessPage] No user in state, checking session...");
          try {
            const { data: sessionData, error: sessionError } = await Promise.race([
              supabase.auth.getSession(),
              new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error("Session check timeout")), 3000)
              ),
            ]) as Awaited<ReturnType<typeof supabase.auth.getSession>>;
            
            if (!sessionError && sessionData?.session?.user) {
              currentUser = sessionData.session.user;
              console.log("[SuccessPage] Session found for user:", currentUser.email);
              if (onSetUser) {
                onSetUser(currentUser);
              }
            } else {
              console.warn("[SuccessPage] No session found, but continuing anyway (user may be logged in via App.tsx)");
              // Don't error out - App.tsx might be loading the user
            }
          } catch (err) {
            console.warn("[SuccessPage] Session check failed, but continuing:", err);
            // Don't error out - App.tsx might be loading the user
          }
        }
        
        // If still no user after all checks, show error
        if (!currentUser) {
          console.error("[SuccessPage] No user found after all checks");
          setError("Please log in to continue.");
          setIsLoading(false);
          return;
        }

        // Step 3: Wait for webhook to process (give it 3 seconds)
        console.log("[SuccessPage] Waiting for webhook to process subscription...");
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Step 4: Check subscription status
        if (!cancelled && currentUser) {
          try {
            const status = await Promise.race([
              getSubscriptionStatus(currentUser.id),
              new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
            ]);
            if (status) {
              console.log("[SuccessPage] Subscription status:", status.plan);
              setSubscriptionStatus(status.plan);
            } else {
              console.warn("[SuccessPage] No subscription found yet, webhook may still be processing");
              // Don't set error - webhook might still be processing
            }
          } catch (err) {
            console.warn("[SuccessPage] Error checking subscription status:", err);
            // Don't block on subscription check - webhook might still be processing
          }
        }

        // Always set loading to false, even if subscription check fails
        setIsLoading(false);
        console.log("[SuccessPage] Initialization complete, showing success message");

        // Step 5: Start countdown to redirect
        if (!cancelled) {
          countdownInterval = window.setInterval(() => {
            setCountdown((prev) => {
              if (prev <= 1) {
                if (countdownInterval) {
                  clearInterval(countdownInterval);
                }
                onSetAppView("dashboard");
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      } catch (err) {
        console.error("[SuccessPage] Error:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
        setIsLoading(false);
      }
    };

    initializeSuccess();

    return () => {
      cancelled = true;
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
  }, [user, onSetAppView, onSetUser]);

  return (
    <div className="app app-dark">
      <div className="home-shell">
        <AppHeader
          user={user}
          isAdmin={isAdmin}
          isPro={isPro}
          onSetAuthView={onSetAuthView}
          onGoToPricing={() => onSetAppView("pricing")}
          onGoToDashboard={() => onSetAppView("dashboard")}
          onGoToSupport={() => onSetAppView("support")}
        />

        <main className="home-main">
          <div className="pricing-main" style={{ maxWidth: "600px", margin: "0 auto", padding: "4rem 2rem" }}>
            {isLoading ? (
              <div style={{ textAlign: "center" }}>
                <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>Processing your upgrade...</h1>
                <p style={{ fontSize: "1.125rem", color: "#888" }}>
                  Please wait while we confirm your subscription.
                </p>
              </div>
            ) : error ? (
              <div style={{ textAlign: "center" }}>
                <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem", color: "#ff4444" }}>Oops!</h1>
                <p style={{ fontSize: "1.125rem", marginBottom: "2rem", color: "#888" }}>{error}</p>
                <button
                  type="button"
                  className="hero-primary-cta"
                  onClick={() => onSetAppView("dashboard")}
                >
                  Go to Dashboard
                </button>
              </div>
            ) : (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🎉</div>
                <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>Welcome to Premium!</h1>
                <p style={{ fontSize: "1.125rem", marginBottom: "2rem", color: "#888" }}>
                  Your subscription is now active. You now have access to unlimited Action Maps and all premium features.
                </p>
                {subscriptionStatus === "premium" ? (
                  <div style={{ marginBottom: "2rem", padding: "1rem", background: "#f0f0f0", borderRadius: "8px" }}>
                    <p style={{ margin: 0, fontWeight: "600" }}>✓ Premium Status Confirmed</p>
                  </div>
                ) : (
                  <div style={{ marginBottom: "2rem", padding: "1rem", background: "#fff3cd", borderRadius: "8px" }}>
                    <p style={{ margin: 0, color: "#856404" }}>
                      ⏳ Subscription is being processed. Your premium access will be available shortly.
                    </p>
                  </div>
                )}
                <div style={{ marginTop: "2rem" }}>
                  <p style={{ fontSize: "0.875rem", color: "#888", marginBottom: "1rem" }}>
                    Redirecting to dashboard in {countdown} second{countdown !== 1 ? "s" : ""}...
                  </p>
                  <button
                    type="button"
                    className="hero-primary-cta"
                    onClick={() => onSetAppView("dashboard")}
                  >
                    Go to Dashboard Now
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

