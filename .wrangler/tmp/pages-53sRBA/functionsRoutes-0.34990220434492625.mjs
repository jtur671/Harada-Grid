import { onRequestOptions as __api_ai_helper_ts_onRequestOptions } from "/Users/jason/Desktop/harada-grid/harada-grid/functions/api/ai-helper.ts"
import { onRequestPost as __api_ai_helper_ts_onRequestPost } from "/Users/jason/Desktop/harada-grid/harada-grid/functions/api/ai-helper.ts"
import { onRequestOptions as __api_pillar_refine_ts_onRequestOptions } from "/Users/jason/Desktop/harada-grid/harada-grid/functions/api/pillar-refine.ts"
import { onRequestPost as __api_pillar_refine_ts_onRequestPost } from "/Users/jason/Desktop/harada-grid/harada-grid/functions/api/pillar-refine.ts"
import { onRequestPost as __api_stripe_webhook_ts_onRequestPost } from "/Users/jason/Desktop/harada-grid/harada-grid/functions/api/stripe-webhook.ts"

export const routes = [
    {
      routePath: "/api/ai-helper",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_ai_helper_ts_onRequestOptions],
    },
  {
      routePath: "/api/ai-helper",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_ai_helper_ts_onRequestPost],
    },
  {
      routePath: "/api/pillar-refine",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_pillar_refine_ts_onRequestOptions],
    },
  {
      routePath: "/api/pillar-refine",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_pillar_refine_ts_onRequestPost],
    },
  {
      routePath: "/api/stripe-webhook",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_stripe_webhook_ts_onRequestPost],
    },
  ]