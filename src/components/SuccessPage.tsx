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

  // CRITICAL: Restore session after Stripe checkout
  // Strategy:
  // 1. Check for session_id from Stripe (in query params or hash)
  // 2. Try to restore session from saved user info in sessionStorage
  // 3. Try to get session from Supabase
  // 4. If OAuth tokens are in hash, force Supabase to process them
  useEffect(() => {
    if (!window.location.hash.startsWith("#success")) {
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const sessionId = urlParams.get("session_id") || hashParams.get("session_id");
    const hasOAuthTokens = hashParams.has("access_token");
    
    console.log("[SuccessPage] Stripe redirect detected:", { sessionId, hasOAuthTokens });
    
    const restoreSession = async () => {
      // If we already have a user, we're good
      if (user) {
        console.log("[SuccessPage] ✅ User already in state:", user.email);
        setIsLoading(false);
        setTimeout(() => {
          window.localStorage.removeItem("actionmaps-projects-cache");
          window.localStorage.removeItem("actionmaps-last-view");
          onSetAppView("dashboard");
          window.history.replaceState(null, "", window.location.pathname);
        }, 2000);
        return;
      }

      // Try to restore from saved user info
      const savedUserInfo = sessionStorage.getItem("stripe-checkout-user");
      if (savedUserInfo) {
        try {
          const userInfo = JSON.parse(savedUserInfo);
          console.log("[SuccessPage] Found saved user info:", userInfo.email);
          
          // Try to get session from Supabase
          for (let attempt = 0; attempt < 5; attempt++) {
            console.log(`[SuccessPage] Attempt ${attempt + 1}: Getting session...`);
            
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionData?.session?.user) {
              console.log("[SuccessPage] ✅ Session restored:", sessionData.session.user.email);
              if (onSetUser) {
                onSetUser(sessionData.session.user);
              }
              setIsLoading(false);
              
              // Clean up saved user info
              sessionStorage.removeItem("stripe-checkout-user");
              
              // Check subscription status
              getSubscriptionStatus(sessionData.session.user.id).then((status) => {
                if (status) {
                  setSubscriptionStatus(status.plan);
                }
              }).catch((err) => {
                console.warn("[SuccessPage] Error checking subscription:", err);
              });
              
              // Redirect to dashboard after 2 seconds
              setTimeout(() => {
                window.localStorage.removeItem("actionmaps-projects-cache");
                window.localStorage.removeItem("actionmaps-last-view");
                onSetAppView("dashboard");
                window.history.replaceState(null, "", window.location.pathname);
              }, 2000);
              return;
            } else {
              console.warn(`[SuccessPage] No session (attempt ${attempt + 1}):`, sessionError?.message || "No session");
              if (attempt < 4) {
                await new Promise((resolve) => setTimeout(resolve, 1000));
              }
            }
          }
        } catch (err) {
          console.error("[SuccessPage] Error parsing saved user info:", err);
        }
      }

      // If OAuth tokens are in hash, force Supabase to process them
      if (hasOAuthTokens) {
        console.log("[SuccessPage] OAuth tokens detected - forcing Supabase to process them...");
        
        for (let attempt = 0; attempt < 5; attempt++) {
          console.log(`[SuccessPage] OAuth attempt ${attempt + 1}: Getting session...`);
          
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionData?.session?.user) {
            console.log("[SuccessPage] ✅ Session found via OAuth:", sessionData.session.user.email);
            if (onSetUser) {
              onSetUser(sessionData.session.user);
            }
            setIsLoading(false);
            
            // Clean up saved user info
            sessionStorage.removeItem("stripe-checkout-user");
            
            // Check subscription status
            getSubscriptionStatus(sessionData.session.user.id).then((status) => {
              if (status) {
                setSubscriptionStatus(status.plan);
              }
            }).catch((err) => {
              console.warn("[SuccessPage] Error checking subscription:", err);
            });
            
            // Redirect to dashboard after 2 seconds
            setTimeout(() => {
              window.localStorage.removeItem("actionmaps-projects-cache");
              window.localStorage.removeItem("actionmaps-last-view");
              onSetAppView("dashboard");
              window.history.replaceState(null, "", window.location.pathname);
            }, 2000);
            return;
          } else {
            console.warn(`[SuccessPage] No session via OAuth (attempt ${attempt + 1}):`, sessionError?.message || "No session");
            if (attempt < 4) {
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          }
        }
      }
      
      // If we get here, session wasn't restored
      console.error("[SuccessPage] ❌ Failed to restore session");
      setIsLoading(false);
      setError("Session restoration failed. Please try logging in again.");
    };

    restoreSession();
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
