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
  onSetAppView: (view: "home" | "builder" | "harada" | "dashboard" | "pricing" | "support" | "success" | "subscription") => void;
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
        // Step 0: CRITICAL - Process OAuth tokens from Stripe redirect
        // When Stripe redirects back, OAuth tokens are in the hash
        // Supabase needs to process these, but sometimes a hard reload is needed
        const initialHashParams = new URLSearchParams(window.location.hash.substring(1));
        const hasOAuthTokens = initialHashParams.has("access_token");
        const hardReloadKey = "stripe-oauth-processed";
        const hasProcessedOAuth = sessionStorage.getItem(hardReloadKey);
        
        if (hasOAuthTokens && !hasProcessedOAuth) {
          console.log("[SuccessPage] OAuth tokens detected - forcing hard reload to process session...");
          // Mark that we're about to process OAuth
          sessionStorage.setItem(hardReloadKey, "true");
          
          // Preserve the hash with OAuth tokens for the reload
          // This ensures Supabase can process them on the fresh page load
          const currentHash = window.location.hash;
          
          // Clear caches but preserve the hash
          if (typeof window !== "undefined") {
            window.localStorage.removeItem("actionmaps-projects-cache");
            window.localStorage.removeItem("actionmaps-last-view");
            // Don't clear Supabase session cache
          }
          
          // Hard reload with the OAuth hash preserved
          // This will trigger Supabase's onAuthStateChange listener properly
          window.location.hash = currentHash;
          window.location.reload();
          return; // Exit early - page will reload
        }
        
        // If we've already processed OAuth (after reload), check for session
        if (hasProcessedOAuth) {
          console.log("[SuccessPage] OAuth already processed, checking session...");
          // Clear the flag for next time
          sessionStorage.removeItem(hardReloadKey);
          
          // Wait a moment for Supabase to process
          await new Promise((resolve) => setTimeout(resolve, 1500));
          
          // Check for session
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session?.user) {
            console.log("[SuccessPage] ✅ Session found after OAuth processing:", sessionData.session.user.email);
            if (onSetUser) {
              onSetUser(sessionData.session.user);
            }
          } else {
            console.warn("[SuccessPage] ⚠️ No session found after OAuth processing");
          }
        }
        
        // Step 1: Check for Stripe success parameters (in both search and hash)
        const urlParams = new URLSearchParams(window.location.search);
        const successHashParams = new URLSearchParams(window.location.hash.substring(1));
        const sessionId = urlParams.get("session_id") || successHashParams.get("session_id");
        const redirectStatus = urlParams.get("redirect_status") || successHashParams.get("redirect_status");
        
        // Clean up the reload parameter if present
        if (urlParams.has("_reload")) {
          urlParams.delete("_reload");
          const newSearch = urlParams.toString();
          window.history.replaceState(
            null,
            "",
            `${window.location.pathname}${newSearch ? `?${newSearch}` : ""}${window.location.hash}`
          );
        }

        // Clean up URL - remove success params from both search and hash
        if (sessionId || redirectStatus) {
          const cleanParams = new URLSearchParams(urlParams);
          cleanParams.delete("session_id");
          cleanParams.delete("redirect_status");
          const newSearch = cleanParams.toString();
          
          // Clean hash but preserve OAuth tokens if present
          const cleanHashParams = new URLSearchParams(successHashParams);
          cleanHashParams.delete("session_id");
          cleanHashParams.delete("redirect_status");
          const newHash = cleanHashParams.toString();
          const finalHash = newHash ? `#${newHash}` : (successHashParams.has("access_token") ? window.location.hash : "");
          
          window.history.replaceState(
            null,
            "",
            `${window.location.pathname}${newSearch ? `?${newSearch}` : ""}${finalHash}`
          );
        }

        // Step 2: Ensure user session is active
        // Check if we have OAuth tokens in hash (Stripe redirect might include them)
        // hasOAuthTokens already checked above
        
        let currentUser = user;
        
        // If we have a user already, use it (App.tsx should have loaded it)
        if (currentUser) {
          console.log("[SuccessPage] User already in state:", currentUser.email);
        } else {
          // No user in state - try to get it directly from Supabase
          console.log("[SuccessPage] No user in state, getting session directly...");
          
          // If OAuth tokens detected, wait a moment for Supabase to process them
          if (hasOAuthTokens) {
            console.log("[SuccessPage] OAuth tokens detected, waiting for Supabase to process...");
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
          
          // Try to get session - with retries
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
              
              if (sessionError) {
                console.warn(`[SuccessPage] Session check attempt ${attempt + 1} error:`, sessionError);
                if (attempt < 2) {
                  await new Promise((resolve) => setTimeout(resolve, 500));
                  continue;
                }
              }
              
              if (sessionData?.session?.user) {
                currentUser = sessionData.session.user;
                console.log("[SuccessPage] Session found on attempt", attempt + 1, ":", currentUser.email);
                if (onSetUser) {
                  onSetUser(currentUser);
                }
                break;
              }
              
              // If no session but not last attempt, wait and retry
              if (attempt < 2) {
                console.log(`[SuccessPage] No session on attempt ${attempt + 1}, waiting and retrying...`);
                await new Promise((resolve) => setTimeout(resolve, 1000));
              }
            } catch (err) {
              console.warn(`[SuccessPage] Session check attempt ${attempt + 1} exception:`, err);
              if (attempt < 2) {
                await new Promise((resolve) => setTimeout(resolve, 500));
              }
            }
          }
          
          // If still no user after retries, check if user prop was updated by App.tsx
          if (!currentUser && !cancelled) {
            // Wait a bit more for App.tsx to finish loading
            console.log("[SuccessPage] No session found, waiting for App.tsx to load user...");
            for (let i = 0; i < 4; i++) {
              await new Promise((resolve) => setTimeout(resolve, 500));
              if (user && !cancelled) {
                currentUser = user;
                console.log("[SuccessPage] User loaded by App.tsx after wait:", currentUser.email);
                break;
              }
            }
          }
          
          // If still no user, don't block - allow user to continue anyway
          // The subscription check will happen in the background if user is found later
          if (!currentUser) {
            console.warn("[SuccessPage] No user found after all attempts, but allowing user to continue");
            // Don't set error - just continue without user verification
            // The user can still proceed to dashboard
          }
        }

        // Step 3: Wait for webhook to process (give it 2 seconds)
        console.log("[SuccessPage] Waiting for webhook to process subscription...");
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Step 4: Check subscription status (don't block if no user)
        if (!cancelled) {
          // Check subscription even if no user found (might be in database)
          const userIdToCheck = currentUser?.id;
          if (userIdToCheck) {
            try {
              const status = await Promise.race([
                getSubscriptionStatus(userIdToCheck),
                new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
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
          } else {
            console.warn("[SuccessPage] No user ID available for subscription check");
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

  // Auto-redirect to dashboard - but FIRST ensure session is restored
  // This effect runs AFTER initializeSuccess has processed OAuth tokens
  useEffect(() => {
    const redirectKey = "stripe-success-redirect";
    const hasRedirected = sessionStorage.getItem(redirectKey);
    
    if (!hasRedirected && window.location.hash.startsWith("#success")) {
      sessionStorage.setItem(redirectKey, "true");
      console.log("[SuccessPage] Auto-redirecting to dashboard after session restoration...");
      
      // Wait a moment to ensure session is restored by initializeSuccess
      setTimeout(() => {
        // Clear caches (but NOT Supabase session cache)
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("actionmaps-projects-cache");
          window.localStorage.removeItem("actionmaps-last-view");
          // Don't clear Supabase session cache - we need it!
        }
        
        // Redirect to dashboard (without hard reload to preserve session)
        console.log("[SuccessPage] Redirecting to dashboard...");
        onSetAppView("dashboard");
        
        // Clear the hash after a moment
        setTimeout(() => {
          window.history.replaceState(null, "", window.location.pathname);
        }, 500);
      }, 1000);
    }
  }, [onSetAppView]);

  return (
    <div className="app app-dark">
      <div className="home-shell">
        <AppHeader
          user={user}
          isAdmin={isAdmin}
          isPro={isPro}
          onSetAuthView={onSetAuthView}
          onGoToHome={() => onSetAppView("home")}
          onGoToPricing={() => onSetAppView("pricing")}
          onGoToDashboard={() => onSetAppView("dashboard")}
          onGoToSupport={() => onSetAppView("support")}
          onGoToSubscription={() => onSetAppView("subscription")}
        />

        <main className="home-main">
          <div className="pricing-main" style={{ maxWidth: "600px", margin: "0 auto", padding: "4rem 2rem" }}>
            {isLoading ? (
              <div style={{ textAlign: "center" }}>
                <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>Processing your upgrade...</h1>
                <p style={{ fontSize: "1.125rem", color: "#888", marginBottom: "2rem" }}>
                  Redirecting to dashboard...
                </p>
                <button
                  type="button"
                  className="hero-primary-cta"
                  onClick={() => {
                    // Allow user to skip waiting and go to dashboard
                    console.log("[SuccessPage] User clicked to skip waiting");
                    window.location.href = "/#dashboard";
                    window.location.reload();
                  }}
                  style={{ marginTop: "1rem" }}
                >
                  Go to Dashboard Now
                </button>
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

