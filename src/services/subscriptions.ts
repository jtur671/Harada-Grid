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
      .maybeSingle(); // Use maybeSingle() instead of single() - returns null if no row found instead of error

    if (error) {
      // If table doesn't exist yet (PGRST205), return null to use localStorage fallback
      if (error.code === "PGRST205") {
        console.log("[Subscription] Table not found - using localStorage fallback. Run SQL migration to enable database subscriptions.");
        return null;
      }
      
      // Handle 406 Not Acceptable (RLS issue or Accept header mismatch)
      // This can happen if:
      // 1. RLS policy is blocking the request
      // 2. The subscription record doesn't exist yet (webhook hasn't run)
      // 3. Accept header mismatch
      if (error.code === "PGRST406" || error.message?.includes("406") || error.message?.includes("Not Acceptable")) {
        console.warn("[Subscription] 406 error - Possible causes:", {
          code: error.code,
          message: error.message,
          hint: "Check: 1) RLS policies allow SELECT, 2) Subscription record exists, 3) Webhook has run after Stripe checkout"
        });
        // Return null to fall back to localStorage - user might need to refresh after webhook processes
        return null;
      }
      
      // Log other errors
      console.error("[Subscription] Error fetching subscription:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      return null;
    }

    // If no data (subscription not found), user is on free plan
    if (!data) {
      return {
        plan: "free",
        status: "free",
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
      };
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

