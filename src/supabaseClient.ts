// src/supabaseClient.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Helper to validate URL
const isValidUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

// Check if we have valid env vars (not placeholders and valid URL format)
const hasValidConfig =
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== "YOUR_SUPABASE_URL" &&
  supabaseAnonKey !== "YOUR_SUPABASE_ANON_KEY" &&
  isValidUrl(supabaseUrl);

// Create a safe placeholder client that won't crash
const placeholderUrl = "https://placeholder.supabase.co";
const placeholderKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTIwMDAsImV4cCI6MTk2MDc2ODAwMH0.placeholder";

const createSafeClient = (): SupabaseClient => {
  try {
    if (hasValidConfig && supabaseUrl && supabaseAnonKey) {
      return createClient(supabaseUrl, supabaseAnonKey);
    }

    return createClient(placeholderUrl, placeholderKey);
  } catch (error) {
    console.error("Failed to create Supabase client:", error);
    try {
      return createClient(placeholderUrl, placeholderKey);
    } catch (fallbackError) {
      console.error("Failed to create fallback Supabase client:", fallbackError);
      return {
        auth: {
          getSession: async () => ({ data: { session: null }, error: null }),
          onAuthStateChange: () => ({
            data: { subscription: { unsubscribe: () => {} } },
          }),
          signInWithPassword: async () => ({
            data: null,
            error: { message: "Supabase not configured" },
          }),
          signUp: async () => ({
            data: null,
            error: { message: "Supabase not configured" },
          }),
          signOut: async () => ({ error: null }),
        },
        from: () => ({
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: async () => ({ data: null, error: null }),
                }),
              }),
            }),
          }),
          upsert: async () => ({ error: null }),
        }),
      } as SupabaseClient;
    }
  }
};

const supabase: SupabaseClient = createSafeClient();

export { supabase };

