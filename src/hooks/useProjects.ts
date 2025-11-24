import { useState, useCallback, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../supabaseClient";
import type { HaradaState, ProjectSummary, AppView, SubscriptionPlan } from "../types";
import { getNextDefaultTitle } from "../utils/projects";
import { FREE_PLAN_MAP_LIMIT } from "../config/constants";

type UseProjectsOptions = {
  user: User | null;
  isPro: boolean;
  plan: SubscriptionPlan;
  onViewChange?: (view: AppView) => void;
  onViewModeChange?: (mode: "map" | "grid") => void;
  onStartModalChange?: (open: boolean) => void;
  hasDismissedStartModal: () => boolean;
};

export const useProjects = ({
  user,
  isPro,
  plan,
  onViewChange,
  onViewModeChange,
  onStartModalChange,
}: UseProjectsOptions) => {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const loadingRef = useRef<boolean>(false);
  const loadTimeoutRef = useRef<number | null>(null);

  const loadProjects = useCallback(async (preserveView = false) => {
    if (!user) return;
    
    // Prevent concurrent requests, but allow retry after a delay if previous request failed
    if (loadingRef.current) {
      // If we've been loading for more than 3 seconds, allow a retry
      // This prevents getting stuck if a request hangs
      const timeSinceLastLoad = Date.now() - (loadTimeoutRef.current || 0);
      if (timeSinceLastLoad > 3000) {
        console.log("[loadProjects] Previous load took too long, allowing retry");
        loadingRef.current = false;
      } else {
        return;
      }
    }
    
    loadingRef.current = true;
    loadTimeoutRef.current = Date.now();
    
    // Safety timeout: if loading takes more than 10 seconds, reset the flag
    const safetyTimeout = setTimeout(() => {
      if (loadingRef.current) {
        console.warn("[loadProjects] Loading timeout - resetting flag");
        loadingRef.current = false;
      }
    }, 10000);

    try {
      const { data, error } = await supabase
        .from("action_maps")
        .select("id,title,updated_at,state")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      console.log("[loadProjects] Database query result:", {
        count: data?.length || 0,
        error: error?.message || null,
        projects: data?.map(p => ({
          id: p.id,
          title: p.title,
          goal: (p.state as any)?.goal || null,
          updated_at: p.updated_at,
        })),
      });

      if (error) {
        // Don't log network errors that might be temporary
        if (error.message?.includes("Failed to fetch") || error.message?.includes("ERR_INSUFFICIENT_RESOURCES")) {
          console.warn("Network error loading projects (may be temporary):", error.message);
        } else {
          console.error("Failed to load projects", error);
        }
        // Clear projects list on error so UI shows empty state
        setProjects([]);
        // Don't return - let finally block clear the loading flag
        return;
      }

    // Extract goal from state for each project
    const list = ((data ?? []).map((p) => {
      const state = (p as any).state as HaradaState | null;
      const goal = state?.goal || null;
      return {
        id: p.id,
        title: p.title,
        goal,
        updated_at: p.updated_at,
      };
    })) as ProjectSummary[];

      setProjects(list);

      // Only reset currentProjectId if we're not preserving the view
      if (!preserveView) {
        setCurrentProjectId(null);
      }

      // Only change view if we're not preserving it
      if (!preserveView && onViewChange) {
        if (list.length === 0) {
          // Brand-new user: send them to pricing first
          if (!plan) {
            onViewChange("pricing");
            if (onStartModalChange) onStartModalChange(false);
          } else {
            // If they already chose a plan on this device, go straight to builder
            onViewChange("builder");
            if (onViewModeChange) onViewModeChange("grid");
            // Only show start modal if they haven't dismissed it before
            // This would need to be passed in or checked here
          }
        } else {
          // Returning user: land on dashboard
          onViewChange("dashboard");
          if (onStartModalChange) onStartModalChange(false);
        }
      }
    } catch (error) {
      // Handle network errors gracefully
      if (error instanceof Error && (
        error.message.includes("Failed to fetch") || 
        error.message.includes("ERR_INSUFFICIENT_RESOURCES")
      )) {
        console.warn("Network error loading projects (may be temporary):", error.message);
      } else {
        console.error("Exception loading projects:", error);
      }
    } finally {
      clearTimeout(safetyTimeout);
      loadingRef.current = false;
    }
  }, [user, plan, onViewChange, onViewModeChange, onStartModalChange]);

  const createProject = async (
    state: HaradaState,
    initialState?: HaradaState
  ): Promise<string | null> => {
    if (!user) return null;

    // Check map limit for free users BEFORE creating project
    if (!isPro && projects.length >= FREE_PLAN_MAP_LIMIT) {
      console.log("[createProject] Map limit reached for free user:", projects.length, ">=", FREE_PLAN_MAP_LIMIT);
      alert(`You've reached the limit of ${FREE_PLAN_MAP_LIMIT} maps on the free plan. Upgrade to Pro to create unlimited maps.`);
      return null;
    }

    const snapshot = initialState ?? state;
    const title = getNextDefaultTitle(projects);

    console.log("[createProject] Creating project:", { title, goal: snapshot.goal, projectsCount: projects.length, userId: user.id });

    // Check if Supabase is properly configured
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl === "YOUR_SUPABASE_URL" || supabaseUrl.includes("placeholder")) {
      console.error("[createProject] ERROR: Supabase not configured!");
      alert("Database not configured. Maps will not be saved. Please check your Supabase configuration.");
      return null;
    }

    try {
      // Debug: Log what we're creating
      console.log("[createProject] Creating with state:", {
        title,
        goal: snapshot.goal || "(empty)",
        goalLength: snapshot.goal?.length || 0,
        hasPillars: snapshot.pillars.length > 0,
        pillarsCount: snapshot.pillars.filter(p => p && p.trim()).length,
        hasTasks: snapshot.tasks.length > 0,
        tasksCount: snapshot.tasks.flat().filter(t => t && t.trim()).length,
      });

      const insertPayload = {
        user_id: user.id,
        title,
        state: snapshot,
      };

      const { data, error } = await supabase
        .from("action_maps")
        .insert(insertPayload)
        .select("id,title,updated_at")
        .single();

      if (error) {
        console.error("[createProject] Error creating project:", error);
        alert(`Failed to save map: ${error.message}. Check the browser console for details.`);
        return null;
      }

      if (data) {
        // Extract goal from state for display
        const goalFromState = snapshot.goal || null;
        const project = { ...data, goal: goalFromState } as ProjectSummary;
        setCurrentProjectId(project.id);
        setProjects((prev) => [project, ...prev]);
        console.log("[createProject] ✅ Project created successfully:", project.id, project.title);
        return project.id;
      } else {
        console.error("[createProject] No data returned from insert");
        alert("Failed to save map: No data returned from database.");
        return null;
      }
    } catch (e) {
      console.error("[createProject] Exception creating project:", e);
      alert(`Failed to save map: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  };

  const openProject = async (projectId: string): Promise<HaradaState | null> => {
    if (!user) {
      console.error("[openProject] No user - cannot open project");
      return null;
    }

    // SECURITY: Always verify user_id to prevent access to other users' projects
    const { data, error } = await supabase
      .from("action_maps")
      .select("state")
      .eq("id", projectId)
      .eq("user_id", user.id) // CRITICAL: Prevent access to other users' projects
      .single();

    if (error || !data?.state) {
      console.error("[openProject] Failed to open project", error);
      return null;
    }

    const loadedState = data.state as HaradaState;
    console.log("[openProject] Loading project state:", {
      projectId,
      hasState: !!data.state,
      goal: loadedState?.goal || "(no goal)",
      goalLength: loadedState?.goal?.length || 0,
      goalPreview: loadedState?.goal?.substring(0, 50) || "(no goal)",
      hasPillars: loadedState?.pillars?.length > 0,
      pillarsWithContent: loadedState?.pillars?.filter(p => p?.trim()).length || 0,
      hasTasks: loadedState?.tasks?.length > 0,
      tasksWithContent: loadedState?.tasks?.flat().filter(t => t?.trim()).length || 0,
    });

    setCurrentProjectId(projectId);
    return loadedState;
  };

  const deleteProject = async (projectId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("action_maps")
        .delete()
        .eq("id", projectId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error deleting project", error);
        return false;
      }

      // Remove from projects list
      setProjects((prev) => prev.filter((p) => p.id !== projectId));

      // If the deleted project was the current one, clear it
      if (currentProjectId === projectId) {
        setCurrentProjectId(null);
      }

      return true;
    } catch (e) {
      console.error("Error deleting project", e);
      return false;
    }
  };

  const updateProjectTitle = (id: string, newTitle: string) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, title: newTitle } : p))
    );
  };

  const updateProjectInList = (id: string, updates: Partial<ProjectSummary>) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  return {
    projects,
    currentProjectId,
    setCurrentProjectId,
    loadProjects,
    createProject,
    openProject,
    deleteProject,
    updateProjectTitle,
    updateProjectInList,
  };
};

