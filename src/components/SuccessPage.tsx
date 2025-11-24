import React, { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
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
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<"free" | "premium" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // SIMPLE: Wait for App.tsx to process OAuth tokens and set user
  // App.tsx's onAuthStateChange will automatically process OAuth tokens from hash
  useEffect(() => {
    if (!window.location.hash.startsWith("#success")) {
      return;
    }

    console.log("[SuccessPage] Waiting for user session to be restored by App.tsx...");
    
    // Wait for user to be set by App.tsx's onAuthStateChange
    const checkUser = setInterval(() => {
      if (user) {
        console.log("[SuccessPage] ✅ User confirmed:", user.email);
        clearInterval(checkUser);
        setIsLoading(false);
        
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
      }
    }, 500);

    // Timeout after 10 seconds
    const timeout = setTimeout(() => {
      clearInterval(checkUser);
      setIsLoading(false);
      setError("Session restoration timed out. Please try logging in again.");
      console.error("[SuccessPage] ❌ User session not restored after 10 seconds");
    }, 10000);

    return () => {
      clearInterval(checkUser);
      clearTimeout(timeout);
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
