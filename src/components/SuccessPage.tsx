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

  // CRITICAL: Ensure user session is restored after Stripe redirect
  // Strategy:
  // 1. Check if user is already in state (from App.tsx)
  // 2. If not, try to restore from Supabase's localStorage session
  // 3. If still no session, use saved user info to verify and potentially re-authenticate
  useEffect(() => {
    if (!window.location.hash.startsWith("#success")) {
      return;
    }

    console.log("[SuccessPage] Ensuring user session is restored...");
    
    let checkInterval: number | null = null;
    let timeoutId: number | null = null;
    
    const restoreAndProceed = async () => {
      // If we already have a user, proceed
      if (user) {
        console.log("[SuccessPage] ✅ User already in state:", user.email);
        setIsLoading(false);
        sessionStorage.removeItem("stripe-checkout-user");
        
        // Check subscription status
        getSubscriptionStatus(user.id).then((status) => {
          if (status) {
            setSubscriptionStatus(status.plan);
          }
        }).catch((err) => {
          console.warn("[SuccessPage] Error checking subscription:", err);
        });
        
        // Redirect to dashboard
        setTimeout(() => {
          window.localStorage.removeItem("actionmaps-projects-cache");
          window.localStorage.removeItem("actionmaps-last-view");
          onSetAppView("dashboard");
          window.history.replaceState(null, "", window.location.pathname);
        }, 2000);
        
        if (checkInterval) clearInterval(checkInterval);
        if (timeoutId) clearTimeout(timeoutId);
        return true;
      }
      
      // No user yet - try to get session from Supabase
      console.log("[SuccessPage] No user in state, checking Supabase session...");
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionData?.session?.user) {
        console.log("[SuccessPage] ✅ Session found in Supabase:", sessionData.session.user.email);
        if (onSetUser) {
          onSetUser(sessionData.session.user);
        }
        // Will proceed on next check when user is set
        return false;
      }
      
      // No session found - check if we have saved user info
      const savedUserInfo = sessionStorage.getItem("stripe-checkout-user");
      if (savedUserInfo) {
        try {
          const userInfo = JSON.parse(savedUserInfo);
          console.log("[SuccessPage] Found saved user info but no session:", userInfo.email);
          console.log("[SuccessPage] Session error:", sessionError?.message || "No error");
          
          // Try to refresh the session - sometimes it's there but needs refresh
          const { data: refreshData } = await supabase.auth.refreshSession();
          if (refreshData?.session?.user) {
            console.log("[SuccessPage] ✅ Session refreshed:", refreshData.session.user.email);
            if (onSetUser) {
              onSetUser(refreshData.session.user);
            }
            return false; // Will proceed on next check
          }
          
          // If still no session, the session was lost during redirect
          // We can't restore it without the actual token, but we can check localStorage directly
          console.log("[SuccessPage] ⚠️ Session lost during redirect - checking localStorage...");
          
          // Check Supabase's localStorage keys
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          if (supabaseUrl) {
            const urlObj = new URL(supabaseUrl);
            const projectRef = urlObj.hostname.split('.')[0];
            const storageKey = `sb-${projectRef}-auth-token`;
            const storedSession = localStorage.getItem(storageKey);
            
            if (storedSession) {
              console.log("[SuccessPage] Found session in localStorage, attempting to restore...");
              try {
                // Force Supabase to recognize the stored session
                const { data: forceSession } = await supabase.auth.getSession();
                if (forceSession?.session?.user) {
                  console.log("[SuccessPage] ✅ Session restored from localStorage:", forceSession.session.user.email);
                  if (onSetUser) {
                    onSetUser(forceSession.session.user);
                  }
                  return false;
                }
              } catch (err) {
                console.error("[SuccessPage] Error restoring stored session:", err);
              }
            }
          }
        } catch (err) {
          console.error("[SuccessPage] Error parsing saved user info:", err);
        }
      }
      
      return false;
    };
    
    // Try immediately
    restoreAndProceed().then((proceeded) => {
      if (proceeded) return;
      
      // If not proceeded, check every 500ms
      checkInterval = window.setInterval(async () => {
        const proceeded = await restoreAndProceed();
        if (proceeded && checkInterval) {
          clearInterval(checkInterval);
        }
      }, 500);
      
      // Timeout after 10 seconds
      timeoutId = window.setTimeout(async () => {
        if (checkInterval) clearInterval(checkInterval);
        
        const finalCheck = await restoreAndProceed();
        if (!finalCheck) {
          setIsLoading(false);
          setError("Session could not be restored. Please log in again.");
          console.error("[SuccessPage] ❌ Failed to restore session after all attempts");
        }
      }, 10000);
    });
    
    return () => {
      if (checkInterval) clearInterval(checkInterval);
      if (timeoutId) clearTimeout(timeoutId);
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
                  Restoring your session...
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
                      ⚠️ Subscription status is being processed. This may take a few moments.
                    </p>
                  </div>
                )}
                <button
                  type="button"
                  className="hero-primary-cta"
                  onClick={() => {
                    window.localStorage.removeItem("actionmaps-projects-cache");
                    window.localStorage.removeItem("actionmaps-last-view");
                    onSetAppView("dashboard");
                    window.history.replaceState(null, "", window.location.pathname);
                  }}
                >
                  Continue to Dashboard
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
