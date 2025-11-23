# Plan/Pro Status Debugging

## Current Issue
The `isPro` flag is currently based on localStorage, not actual Stripe subscription status. This means if you selected "premium" on the pricing page (even without paying), it gets stored and you show as Pro.

## How to Check Your Current Plan
Open browser console (F12) and run:
```javascript
localStorage.getItem('actionmaps-plan')
```

This will show:
- `"premium"` - You're showing as Pro
- `"free"` - You're showing as Free
- `null` - No plan set

## How to Change Your Plan
In browser console:
```javascript
// Set to Free
localStorage.setItem('actionmaps-plan', 'free')

// Set to Premium (for testing)
localStorage.setItem('actionmaps-plan', 'premium')

// Clear plan (will default to null)
localStorage.removeItem('actionmaps-plan')
```

Then refresh the page.

## Production Fix Needed
In production, `isPro` should be based on actual Stripe subscription status from your database, not localStorage. You'll need to:

1. Store subscription status in Supabase (user metadata or separate table)
2. Check Stripe webhook to update subscription status
3. Update `isPro` calculation to read from database instead of localStorage

