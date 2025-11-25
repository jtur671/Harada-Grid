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

  // NEW APPROACH: Wait for App.tsx to load the session, then proceed
  // App.tsx's initial getSession() should restore the session from localStorage
  // We just need to wait for it and then redirect
  useEffect(() => {
    if (!window.location.hash.startsWith("#success")) {
      return;
    }

    console.log("[SuccessPage] Waiting for App.tsx to restore session...");
    
    // Strategy: Wait for user to be set by App.tsx (which calls getSession on mount)
    // If user is already set, proceed immediately
    // Otherwise, wait up to 10 seconds for App.tsx to restore it
    
    let checkInterval: number | null = null;
    let timeoutId: number | null = null;
    
    const checkUserAndProceed = () => {
      if (user) {
        console.log("[SuccessPage] ✅ User found:", user.email);
        setIsLoading(false);
        
        // Clean up saved user info
        sessionStorage.removeItem("stripe-checkout-user");
        
        // Check subscription status
        getSubscriptionStatus(user.id).then((status) => {
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
        
        // Clean up
        if (checkInterval) clearInterval(checkInterval);
        if (timeoutId) clearTimeout(timeoutId);
        return true;
      }
      return false;
    };
    
    // Check immediately
    if (checkUserAndProceed()) {
      return;
    }
    
    // If no user yet, wait for App.tsx to restore it
    // Check every 500ms
    checkInterval = window.setInterval(() => {
      if (checkUserAndProceed()) {
        // Cleanup handled in checkUserAndProceed
      }
    }, 500);
    
    // Timeout after 10 seconds
    timeoutId = window.setTimeout(() => {
      if (checkInterval) clearInterval(checkInterval);
      setIsLoading(false);
      
      // Last attempt: try to get session directly
      supabase.auth.getSession().then(({ data: sessionData }) => {
        if (sessionData?.session?.user) {
          console.log("[SuccessPage] ✅ Found session on timeout:", sessionData.session.user.email);
          if (onSetUser) {
            onSetUser(sessionData.session.user);
          }
          // Proceed with redirect
          setTimeout(() => {
            window.localStorage.removeItem("actionmaps-projects-cache");
            window.localStorage.removeItem("actionmaps-last-view");
            onSetAppView("dashboard");
            window.history.replaceState(null, "", window.location.pathname);
          }, 2000);
        } else {
          console.error("[SuccessPage] ❌ No session found after timeout");
          setError("Session not found. Please log in again.");
        }
      });
    }, 10000);
    
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
