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
      } as unknown as SupabaseClient;
    }
  }
};

const supabase: SupabaseClient = createSafeClient();

// Debug helper: Expose supabase to window for console debugging
// Usage in console: window.debugSupabase.queryMaps()
if (typeof window !== "undefined" && import.meta.env.DEV) {
  (window as any).debugSupabase = {
    // Query all your maps
    async queryMaps() {
      const session = await supabase.auth.getSession();
      if (!session.data.session?.user) {
        console.log("❌ Not logged in");
        return null;
      }
      const userId = session.data.session.user.id;
      console.log("🔍 Querying maps for user:", userId);
      
      const { data, error } = await supabase
        .from("action_maps")
        .select("id,title,updated_at,state,user_id")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });
      
      if (error) {
        console.error("❌ Error:", error);
        return null;
      }
      
      console.log(`✅ Found ${data?.length || 0} maps:`);
      data?.forEach((map, i) => {
        const state = map.state as any;
        console.log(`\n${i + 1}. ${map.title} (${map.id})`);
        console.log(`   Updated: ${map.updated_at}`);
        console.log(`   Goal: "${state?.goal || "(no goal)"}"`);
        console.log(`   Goal length: ${state?.goal?.length || 0}`);
        console.log(`   Has pillars: ${state?.pillars?.length > 0}`);
        console.log(`   Pillars with content: ${state?.pillars?.filter((p: string) => p?.trim()).length || 0}`);
        console.log(`   Tasks with content: ${state?.tasks?.flat().filter((t: string) => t?.trim()).length || 0}`);
      });
      
      return data;
    },
    
    // Query a specific map by ID
    async queryMap(id: string) {
      const { data, error } = await supabase
        .from("action_maps")
        .select("id,title,updated_at,state,user_id")
        .eq("id", id)
        .single();
      
      if (error) {
        console.error("❌ Error:", error);
        return null;
      }
      
      const state = data.state as any;
      console.log("✅ Map:", data.title);
      console.log("   ID:", data.id);
      console.log("   User ID:", data.user_id);
      console.log("   Updated:", data.updated_at);
      console.log("   Goal:", state?.goal || "(no goal)");
      console.log("   Full state:", state);
      
      return data;
    },
  };
  
  console.log("🔧 Debug helper available: window.debugSupabase.queryMaps() or window.debugSupabase.queryMap(id)");
}

export { supabase };

