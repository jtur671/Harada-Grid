/**
 * Stripe Webhook Handler
 * 
 * Handles Stripe events to keep subscription status in sync with database.
 * 
 * Required Stripe events:
 * - checkout.session.completed
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * 
 * Environment variables:
 * - STRIPE_WEBHOOK_SECRET: Webhook signing secret from Stripe dashboard
 * - STRIPE_SECRET_KEY: Stripe secret key
 * - SUPABASE_URL: Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Supabase service role key (for admin operations)
 */

import Stripe from "stripe";

interface Env {
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_SECRET_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const request = context.request;
  const env = context.env;

  // Validate required environment variables
  if (!env.SUPABASE_URL) {
    console.error("[webhook] SUPABASE_URL is missing from environment variables");
    console.error("[webhook] Available env keys:", Object.keys(env || {}));
    return new Response(
      JSON.stringify({ 
        error: "Configuration error",
        message: "SUPABASE_URL environment variable is not set. Please add it in Cloudflare Pages Settings → Variables and Secrets."
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[webhook] SUPABASE_SERVICE_ROLE_KEY is missing from environment variables");
    return new Response(
      JSON.stringify({ 
        error: "Configuration error",
        message: "SUPABASE_SERVICE_ROLE_KEY environment variable is not set. Please add it in Cloudflare Pages Settings → Variables and Secrets."
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Initialize Stripe inside the handler (Cloudflare Workers don't have process.env)
  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-12-18.acacia",
  });

  // Get webhook signature
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  // Get raw body for signature verification
  const body = await request.text();

  let event: Stripe.Event;
  try {
    // Verify webhook signature (use async version for Cloudflare Workers)
    // Cloudflare Workers use Web Crypto API which requires async operations
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response(`Webhook signature verification failed: ${err}`, {
      status: 400,
    });
  }

  // Handle different event types
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session, env, stripe);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription, env, stripe);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription, env);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[webhook] Error processing webhook:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      eventType: event?.type,
    });
    return new Response(
      JSON.stringify({ 
        error: "Webhook processing failed",
        message: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

/**
 * Handle checkout.session.completed event
 * This fires when a user completes Stripe checkout
 */
async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  env: Env,
  stripe: Stripe
) {
  console.log("[handleCheckoutCompleted] Processing checkout session:", {
    sessionId: session.id,
    customerId: session.customer,
    subscriptionId: session.subscription,
  });

  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!customerId || !subscriptionId) {
    console.error("[handleCheckoutCompleted] Missing customer or subscription ID:", {
      customerId,
      subscriptionId,
    });
    return;
  }

  try {
    // Get subscription details from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    console.log("[handleCheckoutCompleted] Retrieved subscription:", {
      id: subscription.id,
      status: subscription.status,
    });

    // Get customer to find user email
    const customer = await stripe.customers.retrieve(customerId);
    const customerEmail =
      typeof customer === "object" && !customer.deleted
        ? customer.email
        : null;

    if (!customerEmail) {
      console.error("[handleCheckoutCompleted] Could not find customer email for customer:", customerId);
      return;
    }

    console.log("[handleCheckoutCompleted] Looking up user by email:", customerEmail);

    // Find user by email in Supabase
    const userResponse = await fetch(
      `${env.SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(
        customerEmail
      )}`,
      {
        headers: {
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        },
      }
    );

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error("[handleCheckoutCompleted] Failed to fetch user:", {
        status: userResponse.status,
        error: errorText,
      });
      return;
    }

    const users = await userResponse.json();
    if (!users.users || users.users.length === 0) {
      console.error(`[handleCheckoutCompleted] User not found for email: ${customerEmail}`);
      return;
    }

    const userId = users.users[0].id;
    console.log("[handleCheckoutCompleted] Found user:", {
      userId,
      email: customerEmail,
    });

    // Convert Stripe timestamps to ISO strings (Stripe uses Unix timestamps in seconds)
    const currentPeriodStart = subscription.current_period_start
      ? new Date(subscription.current_period_start * 1000).toISOString()
      : new Date().toISOString();
    
    const currentPeriodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // Default to 30 days from now

    console.log("[handleCheckoutCompleted] Date conversion:", {
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      convertedStart: currentPeriodStart,
      convertedEnd: currentPeriodEnd,
    });

    // Upsert subscription record
    await upsertSubscription(
      {
        userId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        status: subscription.status,
        plan: "premium",
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
      },
      env
    );

    console.log("[handleCheckoutCompleted] Successfully processed checkout");
  } catch (error) {
    console.error("[handleCheckoutCompleted] Error processing checkout:", error);
    throw error; // Re-throw to be caught by main handler
  }
}

/**
 * Handle subscription created/updated events
 */
async function handleSubscriptionUpdate(
  subscription: Stripe.Subscription,
  env: Env,
  stripe: Stripe
) {
  console.log("[handleSubscriptionUpdate] Processing subscription:", {
    subscriptionId: subscription.id,
    customerId: subscription.customer,
    status: subscription.status,
  });

  const customerId = subscription.customer as string;

  try {
    // First, try to find user by Stripe customer ID (if subscription already exists)
    const existingSubResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/subscriptions?stripe_customer_id=eq.${customerId}&select=user_id`,
      {
        headers: {
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    if (!existingSubResponse.ok) {
      const errorText = await existingSubResponse.text();
      console.error("[handleSubscriptionUpdate] Failed to query existing subscription:", {
        status: existingSubResponse.status,
        error: errorText,
      });
    }

    const { data: subscriptions } = await existingSubResponse.json();
    let userId: string | null = null;

    if (subscriptions && subscriptions.length > 0) {
      // Subscription exists, use existing user_id
      userId = subscriptions[0].user_id;
      console.log("[handleSubscriptionUpdate] Found existing subscription with user:", userId);
    } else {
      // Subscription doesn't exist yet, find user by email from Stripe customer
      console.log("[handleSubscriptionUpdate] Subscription not found, looking up user by email");
      
      const customer = await stripe.customers.retrieve(customerId);
      const customerEmail =
        typeof customer === "object" && !customer.deleted
          ? customer.email
          : null;

      if (!customerEmail) {
        console.error("[handleSubscriptionUpdate] Could not find customer email for customer:", customerId);
        return;
      }

      console.log("[handleSubscriptionUpdate] Looking up user by email:", customerEmail);

      // Find user by email in Supabase
      const userResponse = await fetch(
        `${env.SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(
          customerEmail
        )}`,
        {
          headers: {
            Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          },
        }
      );

      if (!userResponse.ok) {
        const errorText = await userResponse.text();
        console.error("[handleSubscriptionUpdate] Failed to fetch user:", {
          status: userResponse.status,
          error: errorText,
        });
        return;
      }

      const users = await userResponse.json();
      if (!users.users || users.users.length === 0) {
        console.error(`[handleSubscriptionUpdate] User not found for email: ${customerEmail}`);
        return;
      }

      userId = users.users[0].id;
      console.log("[handleSubscriptionUpdate] Found user:", {
        userId,
        email: customerEmail,
      });
    }

    if (!userId) {
      console.error("[handleSubscriptionUpdate] Could not determine user_id");
      return;
    }

    // Convert Stripe timestamps to ISO strings (Stripe uses Unix timestamps in seconds)
    const currentPeriodStart = subscription.current_period_start
      ? new Date(subscription.current_period_start * 1000).toISOString()
      : new Date().toISOString();
    
    const currentPeriodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // Default to 30 days from now

    console.log("[handleSubscriptionUpdate] Date conversion:", {
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      convertedStart: currentPeriodStart,
      convertedEnd: currentPeriodEnd,
    });

    // Determine plan based on subscription status
    // trialing, active = premium; canceled, past_due (if canceled) = free
    const plan = (subscription.status === "active" || subscription.status === "trialing")
      ? "premium"
      : "free";

    console.log("[handleSubscriptionUpdate] Plan determination:", {
      status: subscription.status,
      plan: plan,
    });

    // Upsert subscription record
    await upsertSubscription(
      {
        userId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
        plan: plan,
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
      },
      env
    );

    console.log("[handleSubscriptionUpdate] Successfully processed subscription");
  } catch (error) {
    console.error("[handleSubscriptionUpdate] Error processing subscription:", error);
    throw error; // Re-throw to be caught by main handler
  }
}

/**
 * Handle subscription deleted event
 */
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  env: Env
) {
  const customerId = subscription.customer as string;

  // Find and update subscription to canceled/free
  const response = await fetch(
    `${env.SUPABASE_URL}/rest/v1/subscriptions?stripe_customer_id=eq.${customerId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        status: "canceled",
        plan: "free",
        updated_at: new Date().toISOString(),
      }),
    }
  );

  if (!response.ok) {
    console.error("Failed to update subscription:", await response.text());
  }
}

/**
 * Upsert subscription record in Supabase
 */
async function upsertSubscription(
  data: {
    userId: string;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    status: string;
    plan: "free" | "premium";
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  },
  env: Env
) {
  console.log("[upsertSubscription] Attempting to upsert subscription:", {
    userId: data.userId,
    stripeCustomerId: data.stripeCustomerId,
    stripeSubscriptionId: data.stripeSubscriptionId,
    status: data.status,
    plan: data.plan,
    supabaseUrl: env.SUPABASE_URL ? `${env.SUPABASE_URL.substring(0, 20)}...` : "MISSING",
    hasServiceKey: !!env.SUPABASE_SERVICE_ROLE_KEY,
  });

  // Validate dates are valid ISO strings
  const validateDate = (dateStr: string, fieldName: string): string => {
    if (!dateStr) {
      throw new Error(`${fieldName} is required`);
    }
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new Error(`${fieldName} is not a valid date: ${dateStr}`);
    }
    return date.toISOString();
  };

  const payload = {
    user_id: data.userId,
    stripe_customer_id: data.stripeCustomerId,
    stripe_subscription_id: data.stripeSubscriptionId,
    status: data.status,
    plan: data.plan,
    current_period_start: validateDate(data.currentPeriodStart, "currentPeriodStart"),
    current_period_end: validateDate(data.currentPeriodEnd, "currentPeriodEnd"),
    cancel_at_period_end: data.cancelAtPeriodEnd,
    updated_at: new Date().toISOString(),
  };

  console.log("[upsertSubscription] Payload:", JSON.stringify(payload, null, 2));

  try {
    // Try POST first (insert)
    let response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/subscriptions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const responseText = await response.text();
    console.log("[upsertSubscription] POST Response:", {
      status: response.status,
      statusText: response.statusText,
      body: responseText.substring(0, 500),
    });

    // If 409 (conflict) - record already exists, use PATCH to update
    if (response.status === 409) {
      console.log("[upsertSubscription] Record exists (409), updating with PATCH");
      
      // Use PATCH with user_id in the URL to update existing record
      response = await fetch(
        `${env.SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${data.userId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            apikey: env.SUPABASE_SERVICE_ROLE_KEY,
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify({
            stripe_customer_id: data.stripeCustomerId,
            stripe_subscription_id: data.stripeSubscriptionId,
            status: data.status,
            plan: data.plan,
            current_period_start: payload.current_period_start,
            current_period_end: payload.current_period_end,
            cancel_at_period_end: payload.cancel_at_period_end,
            updated_at: payload.updated_at,
          }),
        }
      );

      const patchResponseText = await response.text();
      console.log("[upsertSubscription] PATCH Response:", {
        status: response.status,
        statusText: response.statusText,
        body: patchResponseText.substring(0, 500),
      });
    }

    if (!response.ok) {
      const errorText = responseText || await response.text();
      console.error("[upsertSubscription] Failed to upsert subscription:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        userId: data.userId,
        payload: payload,
      });
      throw new Error(`Failed to upsert subscription: ${response.status} ${errorText}`);
    }

    // Get the final response text (from POST or PATCH)
    const finalResponseText = response.status === 409 
      ? await response.text() 
      : responseText;

    let result;
    try {
      result = JSON.parse(finalResponseText);
    } catch (e) {
      // Response might not be JSON
      result = finalResponseText;
    }

    console.log("[upsertSubscription] Successfully upserted subscription:", {
      userId: data.userId,
      method: response.status === 409 ? "PATCH (updated)" : "POST (created)",
      subscriptionId: Array.isArray(result) ? result[0]?.id : result?.id || "unknown",
      result: Array.isArray(result) ? result[0] : result,
    });
    return result;
  } catch (error) {
    console.error("[upsertSubscription] Exception during upsert:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId: data.userId,
    });
    throw error;
  }
}


