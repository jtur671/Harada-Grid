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
        // First check if we have OAuth tokens in hash (Stripe redirect might include them)
        const hasOAuthTokens = hashParams.has("access_token");
        
        let currentUser = user;
        if (!currentUser || hasOAuthTokens) {
          console.log("[SuccessPage] No user in state or OAuth tokens detected, checking session...");
          
          // If OAuth tokens in hash, wait a moment for Supabase to process them
          if (hasOAuthTokens) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
          
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) {
            console.error("[SuccessPage] Error getting session:", sessionError);
            setError("Failed to restore session. Please log in again.");
            setIsLoading(false);
            return;
          }
          currentUser = sessionData.session?.user ?? null;
          if (!currentUser) {
            console.error("[SuccessPage] No session found");
            setError("No active session found. Please log in again.");
            setIsLoading(false);
            return;
          }
          console.log("[SuccessPage] Session restored for user:", currentUser.email);
          // Update user state if callback provided
          if (onSetUser) {
            onSetUser(currentUser);
          }
        }

        // Step 3: Wait for webhook to process (give it 3 seconds)
        console.log("[SuccessPage] Waiting for webhook to process subscription...");
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Step 4: Check subscription status
        if (!cancelled && currentUser) {
          const status = await getSubscriptionStatus(currentUser.id);
          if (status) {
            console.log("[SuccessPage] Subscription status:", status.plan);
            setSubscriptionStatus(status.plan);
          } else {
            console.warn("[SuccessPage] No subscription found yet, webhook may still be processing");
            // Don't set error - webhook might still be processing
          }
        }

        setIsLoading(false);

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
  }, [user, onSetAppView]);

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

