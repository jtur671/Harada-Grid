/**
 * Cancel Subscription API
 * 
 * Cancels a user's Stripe subscription and updates the database.
 * 
 * Environment variables:
 * - STRIPE_SECRET_KEY: Stripe secret key
 * - SUPABASE_URL: Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Supabase service role key
 */

import Stripe from "stripe";

interface Env {
  STRIPE_SECRET_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const request = context.request;
  const env = context.env;

  // Validate required environment variables
  if (!env.STRIPE_SECRET_KEY) {
    return new Response(
      JSON.stringify({ error: "STRIPE_SECRET_KEY is not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "Supabase configuration is missing" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // Get user ID from request body
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get user's Stripe customer ID from database
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

    const subscriptionResponse = await fetch(
      `${supabaseUrl}/rest/v1/subscriptions?user_id=eq.${userId}&select=stripe_customer_id,stripe_subscription_id`,
      {
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!subscriptionResponse.ok) {
      console.error("[cancel-subscription] Failed to fetch subscription:", await subscriptionResponse.text());
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscription" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const subscriptions = await subscriptionResponse.json();
    
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ error: "No subscription found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const subscription = subscriptions[0];
    const stripeCustomerId = subscription.stripe_customer_id;
    const stripeSubscriptionId = subscription.stripe_subscription_id;

    if (!stripeCustomerId || !stripeSubscriptionId) {
      return new Response(
        JSON.stringify({ error: "Stripe customer or subscription ID not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Initialize Stripe
    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia",
    });

    // Cancel the subscription in Stripe (at period end)
    const canceledSubscription = await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    console.log("[cancel-subscription] Stripe subscription canceled:", canceledSubscription.id);

    // Update database to reflect cancellation
    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/subscriptions?user_id=eq.${userId}`,
      {
        method: "PATCH",
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation",
        },
        body: JSON.stringify({
          status: "active", // Keep as active until period ends
          plan: "premium", // Keep plan until period ends
          cancel_at_period_end: true,
        }),
      }
    );

    if (!updateResponse.ok) {
      console.error("[cancel-subscription] Failed to update database:", await updateResponse.text());
      // Don't fail the request - Stripe cancellation succeeded
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Subscription canceled successfully",
        cancelAtPeriodEnd: canceledSubscription.cancel_at_period_end,
        currentPeriodEnd: canceledSubscription.current_period_end,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[cancel-subscription] Error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to cancel subscription",
        message: error.message || "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

