# Stripe Success URL Setup

## Option 1: Configure in Stripe Dashboard (Recommended)

Since you're using a Stripe Payment Link (`https://buy.stripe.com/6oU00ieslccXaam3vieME00`), you need to configure the success URL in the Stripe Dashboard:

### Steps:

1. **Go to Stripe Dashboard**: https://dashboard.stripe.com
2. **Navigate to Products → Payment Links**
3. **Find your payment link** (or create a new one)
4. **Click "Edit" or "..." → "Edit payment link"**
5. **Scroll to "After payment" section**
6. **Set the success URL** to:
   ```
   https://harada-grid.pages.dev/#success?session_id={CHECKOUT_SESSION_ID}
   ```
   Or for local development:
   ```
   http://localhost:5173/#success?session_id={CHECKOUT_SESSION_ID}
   ```
7. **Save the changes**

### Important Notes:
- `{CHECKOUT_SESSION_ID}` is a Stripe placeholder that will be replaced with the actual session ID
- The success URL must be an absolute URL (include `https://` or `http://`)
- Make sure your domain matches your production/development environment

---

## Option 2: Use Stripe Checkout Sessions API (More Flexible)

If you want to dynamically set the success URL from code, you'll need to create a backend endpoint that creates a Checkout Session. This gives you more control but requires a serverless function.

### Implementation:

1. **Create a Cloudflare Pages Function** at `functions/api/create-checkout.ts`:

```typescript
import Stripe from "stripe";

export const onRequest: PagesFunction = async (context) => {
  const stripe = new Stripe(context.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-11-20.acacia",
  });

  const origin = context.request.headers.get("origin") || "https://harada-grid.pages.dev";
  const successUrl = `${origin}/#success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${origin}/#pricing`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: "price_XXXXX", // Your Stripe price ID
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: context.request.headers.get("x-user-id") || undefined,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
```

2. **Update PricingPage.tsx** to call this endpoint:

```typescript
onClick={async () => {
  try {
    const response = await fetch("/api/create-checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": user?.id || "",
      },
    });
    const { url } = await response.json();
    if (url) {
      window.location.href = url;
    }
  } catch (error) {
    console.error("Failed to create checkout session:", error);
  }
}}
```

---

## Current Implementation

The current code in `PricingPage.tsx` tries to append `success_url` as a query parameter, but **this won't work** with Stripe Payment Links. You must use **Option 1** (configure in dashboard) or switch to **Option 2** (Checkout Sessions API).

---

## Testing

After configuring the success URL:

1. Click "Upgrade to Premium" on the pricing page
2. Complete the Stripe checkout
3. You should be redirected to: `https://harada-grid.pages.dev/#success?session_id=cs_...`
4. The SuccessPage component should:
   - Restore your session if needed
   - Show the congratulations message
   - Auto-redirect to dashboard after 5 seconds

