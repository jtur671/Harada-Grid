/**
 * Subscription Service
 * 
 * Handles fetching subscription status from Supabase database.
 * Replaces localStorage-based plan checking for production.
 */

import { supabase } from "../supabaseClient";
import type { SubscriptionPlan } from "../types";

export type SubscriptionStatus = {
  plan: SubscriptionPlan;
  status: string; // 'active', 'canceled', 'past_due', etc.
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
};

/**
 * Get user's subscription status from database
 */
export const getSubscriptionStatus = async (
  userId: string
): Promise<SubscriptionStatus | null> => {
  try {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("plan, status, cancel_at_period_end, current_period_end")
      .eq("user_id", userId)
      .single();

    if (error) {
      // If subscription not found, user is on free plan
      if (error.code === "PGRST116") {
        return {
          plan: "free",
          status: "free",
          cancelAtPeriodEnd: false,
          currentPeriodEnd: null,
        };
      }
      
      // If table doesn't exist yet (PGRST205), return null to use localStorage fallback
      if (error.code === "PGRST205") {
        console.log("[Subscription] Table not found - using localStorage fallback. Run SQL migration to enable database subscriptions.");
        return null;
      }
      
      // Handle 406 Not Acceptable (might be RLS issue or table structure mismatch)
      if (error.message?.includes("406") || error.message?.includes("Not Acceptable")) {
        console.warn("[Subscription] 406 error - table may not be set up correctly. Using localStorage fallback.");
        return null;
      }
      
      // Only log non-critical errors
      if (error.code !== "PGRST116") {
        console.error("[Subscription] Error fetching subscription:", error);
      }
      return null;
    }

    // Check if subscription is actually active
    const isActive =
      data.status === "active" ||
      data.status === "trialing" ||
      (data.status === "past_due" && !data.cancel_at_period_end);

    // Check if subscription has expired
    const isExpired =
      data.current_period_end &&
      new Date(data.current_period_end) < new Date();

    const plan: SubscriptionPlan =
      isActive && !isExpired ? "premium" : "free";

    return {
      plan,
      status: data.status,
      cancelAtPeriodEnd: data.cancel_at_period_end || false,
      currentPeriodEnd: data.current_period_end,
    };
  } catch (error) {
    console.error("Exception fetching subscription:", error);
    return null;
  }
};

/**
 * Check if user is currently on Pro plan
 */
export const isUserPro = async (userId: string): Promise<boolean> => {
  const subscription = await getSubscriptionStatus(userId);
  return subscription?.plan === "premium" || false;
};

