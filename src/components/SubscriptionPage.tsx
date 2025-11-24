import React, { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { getSubscriptionStatus, type SubscriptionStatus } from "../services/subscriptions";
import { AppHeader } from "./AppHeader";

type AuthView = "login" | "signup" | null;

type SubscriptionPageProps = {
  user: User | null;
  isAdmin: boolean;
  isPro?: boolean;
  onSetAuthView: (view: AuthView) => void;
  onSetAppView: (view: "home" | "builder" | "harada" | "dashboard" | "pricing" | "support" | "success" | "subscription") => void;
  onRefreshSubscription: () => void;
};

export const SubscriptionPage: React.FC<SubscriptionPageProps> = ({
  user,
  isAdmin,
  isPro = false,
  onSetAuthView,
  onSetAppView,
  onRefreshSubscription,
}) => {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const loadSubscription = async () => {
      try {
        const status = await getSubscriptionStatus(user.id);
        setSubscription(status);
      } catch (err) {
        console.error("[SubscriptionPage] Error loading subscription:", err);
        setError("Failed to load subscription information.");
      } finally {
        setIsLoading(false);
      }
    };

    loadSubscription();
  }, [user]);

  const handleCancelSubscription = async () => {
    if (!user || !subscription) return;

    const confirmed = window.confirm(
      "Are you sure you want to cancel your subscription? You'll lose access to Pro features at the end of your current billing period."
    );

    if (!confirmed) return;

    setIsCancelling(true);
    setError(null);
    setSuccess(null);

    try {
      // Call backend API to cancel subscription in Stripe
      const response = await fetch("/api/cancel-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[SubscriptionPage] Error canceling subscription:", errorData);
        setError(errorData.error || "Failed to cancel subscription. Please try again or contact support.");
        setIsCancelling(false);
        return;
      }

      const result = await response.json();
      console.log("[SubscriptionPage] Subscription canceled successfully:", result);

      setSuccess("Your subscription has been cancelled. You'll retain Pro access until the end of your billing period.");
      
      // Refresh subscription status
      const updatedStatus = await getSubscriptionStatus(user.id);
      setSubscription(updatedStatus);
      
      // Notify parent to refresh subscription status
      onRefreshSubscription();

      // Reload subscription info after a moment
      setTimeout(async () => {
        const status = await getSubscriptionStatus(user.id);
        setSubscription(status);
      }, 1000);
    } catch (err) {
      console.error("[SubscriptionPage] Exception canceling subscription:", err);
      setError("An error occurred while canceling your subscription. Please try again.");
    } finally {
      setIsCancelling(false);
    }
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  if (!user) {
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
          />
          <main className="home-main">
            <div className="pricing-main" style={{ maxWidth: "600px", margin: "0 auto", padding: "4rem 2rem" }}>
              <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>Please log in</h1>
              <p style={{ fontSize: "1.125rem", color: "#888" }}>
                You need to be logged in to manage your subscription.
              </p>
            </div>
          </main>
        </div>
      </div>
    );
  }

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
        />

        <main className="home-main">
          <div className="pricing-main" style={{ maxWidth: "800px", margin: "0 auto", padding: "4rem 2rem" }}>
            <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>Manage Subscription</h1>

            {isLoading ? (
              <p style={{ fontSize: "1.125rem", color: "#888" }}>Loading subscription information...</p>
            ) : error ? (
              <div style={{ padding: "1rem", background: "#ffebee", borderRadius: "8px", marginBottom: "2rem" }}>
                <p style={{ color: "#c62828", margin: 0 }}>{error}</p>
              </div>
            ) : success ? (
              <div style={{ padding: "1rem", background: "#e8f5e9", borderRadius: "8px", marginBottom: "2rem" }}>
                <p style={{ color: "#2e7d32", margin: 0 }}>{success}</p>
              </div>
            ) : null}

            {subscription && (
              <div style={{ marginTop: "2rem" }}>
                <div style={{ padding: "2rem", background: "#1a1a1a", borderRadius: "12px", marginBottom: "2rem" }}>
                  <h2 style={{ fontSize: "1.5rem", marginBottom: "1.5rem" }}>Current Plan</h2>
                  
                  <div style={{ marginBottom: "1.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                      <span style={{ color: "#888" }}>Status:</span>
                      <span style={{ fontWeight: "600", textTransform: "capitalize" }}>
                        {subscription.plan === "premium" ? "Premium" : "Free"}
                      </span>
                    </div>
                    
                    {subscription.status && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <span style={{ color: "#888" }}>Subscription Status:</span>
                        <span style={{ textTransform: "capitalize" }}>{subscription.status}</span>
                      </div>
                    )}

                    {subscription.currentPeriodEnd && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <span style={{ color: "#888" }}>Current Period Ends:</span>
                        <span>{formatDate(subscription.currentPeriodEnd)}</span>
                      </div>
                    )}

                    {subscription.cancelAtPeriodEnd && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <span style={{ color: "#888" }}>Cancellation:</span>
                        <span style={{ color: "#ff9800" }}>Cancels at period end</span>
                      </div>
                    )}
                  </div>

                  {subscription.plan === "premium" && !subscription.cancelAtPeriodEnd && (
                    <div style={{ marginTop: "2rem", paddingTop: "2rem", borderTop: "1px solid #333" }}>
                      <h3 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>Cancel Subscription</h3>
                      <p style={{ color: "#888", marginBottom: "1.5rem" }}>
                        Cancel your subscription to revert to the free plan. You'll retain access to Pro features until the end of your current billing period.
                      </p>
                      <button
                        type="button"
                        className="hero-secondary-cta"
                        onClick={handleCancelSubscription}
                        disabled={isCancelling}
                        style={{ 
                          background: "#d32f2f",
                          color: "white",
                          border: "none"
                        }}
                      >
                        {isCancelling ? "Cancelling..." : "Cancel Subscription"}
                      </button>
                    </div>
                  )}

                  {subscription.plan === "free" && (
                    <div style={{ marginTop: "2rem", paddingTop: "2rem", borderTop: "1px solid #333" }}>
                      <p style={{ color: "#888", marginBottom: "1.5rem" }}>
                        You're currently on the free plan. Upgrade to Pro for unlimited Action Maps and premium features.
                      </p>
                      <button
                        type="button"
                        className="hero-primary-cta"
                        onClick={() => onSetAppView("pricing")}
                      >
                        Upgrade to Pro
                      </button>
                    </div>
                  )}

                  {subscription.cancelAtPeriodEnd && (
                    <div style={{ marginTop: "2rem", padding: "1rem", background: "#fff3cd", borderRadius: "8px" }}>
                      <p style={{ color: "#856404", margin: 0 }}>
                        ⚠️ Your subscription is set to cancel at the end of your billing period ({formatDate(subscription.currentPeriodEnd)}). 
                        You'll retain Pro access until then.
                      </p>
                    </div>
                  )}
                </div>

                <div style={{ textAlign: "center" }}>
                  <button
                    type="button"
                    className="home-nav-link"
                    onClick={() => onSetAppView("dashboard")}
                    style={{ background: "transparent", border: "none", color: "#888", cursor: "pointer" }}
                  >
                    ← Back to Dashboard
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

