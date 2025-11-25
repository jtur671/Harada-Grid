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

  // SIMPLE APPROACH: Use saved user ID to restore session from localStorage
  // When user comes back from Stripe, Supabase session is in localStorage
  // We just need to force Supabase to read it and set the user
  useEffect(() => {
    if (!window.location.hash.startsWith("#success")) {
      return;
    }

    console.log("[SuccessPage] Restoring user session from saved ID...");
    
    const restoreSession = async () => {
      // If user is already set, proceed
      if (user) {
        console.log("[SuccessPage] ✅ User already in state:", user.email);
        setIsLoading(false);
        sessionStorage.removeItem("stripe-checkout-user");
        
        getSubscriptionStatus(user.id).then((status) => {
          if (status) {
            setSubscriptionStatus(status.plan);
          }
        }).catch((err) => {
          console.warn("[SuccessPage] Error checking subscription:", err);
        });
        
        setTimeout(() => {
          window.localStorage.removeItem("actionmaps-projects-cache");
          window.localStorage.removeItem("actionmaps-last-view");
          onSetAppView("dashboard");
          window.history.replaceState(null, "", window.location.pathname);
        }, 2000);
        return;
      }
      
      // Get saved user ID from sessionStorage
      const savedUserInfo = sessionStorage.getItem("stripe-checkout-user");
      if (!savedUserInfo) {
        console.error("[SuccessPage] ❌ No saved user info found");
        setIsLoading(false);
        setError("User information not found. Please log in again.");
        return;
      }
      
      let userInfo;
      try {
        userInfo = JSON.parse(savedUserInfo);
        console.log("[SuccessPage] Found saved user ID:", userInfo.id, userInfo.email);
      } catch (err) {
        console.error("[SuccessPage] Error parsing saved user info:", err);
        setIsLoading(false);
        setError("Invalid user information. Please log in again.");
        return;
      }
      
      // Find Supabase session in localStorage
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        console.error("[SuccessPage] ❌ No Supabase URL configured");
        setIsLoading(false);
        setError("Configuration error. Please log in again.");
        return;
      }
      
      const urlObj = new URL(supabaseUrl);
      const projectRef = urlObj.hostname.split('.')[0];
      const storageKey = `sb-${projectRef}-auth-token`;
      
      console.log("[SuccessPage] Looking for Supabase session in localStorage:", storageKey);
      const storedSession = localStorage.getItem(storageKey);
      
      if (!storedSession) {
        console.error("[SuccessPage] ❌ No Supabase session found in localStorage");
        setIsLoading(false);
        setError("Session not found. Please log in again.");
        return;
      }
      
      console.log("[SuccessPage] Found Supabase session in localStorage, parsing...");
      let sessionData;
      try {
        sessionData = JSON.parse(storedSession);
      } catch (err) {
        console.error("[SuccessPage] Error parsing session data:", err);
        setIsLoading(false);
        setError("Invalid session data. Please log in again.");
        return;
      }
      
      // Verify the session belongs to our saved user
      if (sessionData?.user?.id !== userInfo.id) {
        console.warn("[SuccessPage] ⚠️ Session user ID mismatch:", sessionData?.user?.id, "vs", userInfo.id);
        // Still try to use it - might be a different format
      }
      
      // Force Supabase to recognize the session by calling getSession multiple times
      // Sometimes it needs a moment to initialize
      console.log("[SuccessPage] Forcing Supabase to recognize session...");
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data: sessionResult, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionResult?.session?.user) {
          console.log("[SuccessPage] ✅ Session restored on attempt", attempt + 1, ":", sessionResult.session.user.email);
          if (onSetUser) {
            onSetUser(sessionResult.session.user);
          }
          setIsLoading(false);
          sessionStorage.removeItem("stripe-checkout-user");
          
          getSubscriptionStatus(sessionResult.session.user.id).then((status) => {
            if (status) {
              setSubscriptionStatus(status.plan);
            }
          }).catch((err) => {
            console.warn("[SuccessPage] Error checking subscription:", err);
          });
          
          setTimeout(() => {
            window.localStorage.removeItem("actionmaps-projects-cache");
            window.localStorage.removeItem("actionmaps-last-view");
            onSetAppView("dashboard");
            window.history.replaceState(null, "", window.location.pathname);
          }, 2000);
          return;
        }
        
        if (attempt < 4) {
          console.log(`[SuccessPage] Attempt ${attempt + 1} failed, retrying...`);
          await new Promise((resolve) => setTimeout(resolve, 500));
        } else {
          console.error("[SuccessPage] ❌ Failed to restore session after 5 attempts");
          console.error("[SuccessPage] Session error:", sessionError?.message || "No error");
          setIsLoading(false);
          setError("Session could not be restored. Please log in again.");
        }
      }
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
