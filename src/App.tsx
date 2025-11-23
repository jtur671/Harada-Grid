import React, { useEffect, useState, useRef } from "react";
import { TEMPLATES, type Template } from "./templates";
import type { HaradaState } from "./types";
import { todayISO } from "./utils/date";
import { loadState, saveState, createEmptyState } from "./utils/harada";
import {
  withGoal,
  withPillar,
  withTask,
  withToggledTaskForDay,
  withAppliedTemplate,
} from "./utils/stateHelpers";
import { useProgressStats } from "./hooks/useProgressStats";
import { DashboardPage } from "./components/DashboardPage";
import { HaradaInfoPage } from "./components/HaradaInfoPage";
import { HomePage } from "./components/HomePage";
import { BuilderPage } from "./components/BuilderPage";
import { PricingPage } from "./components/PricingPage";
import { SupportPage } from "./components/SupportPage";
import { supabase } from "./supabaseClient";
import type { User } from "@supabase/supabase-js";

// For local dev, use relative path (Vite proxy will forward to wrangler)
// For production, defaults to /api/ai-helper (same domain)
// Can override with VITE_AI_HELPER_URL env var
const AI_HELPER_URL =
  (import.meta.env.VITE_AI_HELPER_URL as string | undefined) ?? "/api/ai-helper";
const PILLAR_REFINE_URL =
  (import.meta.env.VITE_PILLAR_REFINE_URL as string | undefined) ?? "/api/pillar-refine";

type AppView = "home" | "builder" | "harada" | "dashboard" | "pricing" | "support";
type AuthView = "login" | "signup" | null;

type SubscriptionPlan = "free" | "premium" | null;

// Map limits per plan
const FREE_PLAN_MAP_LIMIT = 3;
const PRO_PLAN_MAP_LIMIT = Infinity; // No limit for pro users

export const deriveTitleFromState = (state: HaradaState) => {
  const trimmed = state.goal?.trim();
  if (trimmed) {
    return trimmed.length > 80 ? `${trimmed.slice(0, 77)}...` : trimmed;
  }
  return "Untitled map";
};

const getNextDefaultTitle = (projects: ProjectSummary[]): string => {
  const base = "Action Map ";

  let max = 0;

  for (const p of projects) {
    const name = (p.title ?? "").trim();
    if (name.toLowerCase().startsWith(base.toLowerCase())) {
      const suffix = name.slice(base.length).trim();
      const num = parseInt(suffix, 10);
      if (!Number.isNaN(num) && num > max) {
        max = num;
      }
    }
  }

  return `${base}${max + 1}`;
};

const PLAN_STORAGE_KEY = "actionmaps-plan";
const START_MODAL_DISMISSED_KEY = "actionmaps-start-modal-dismissed";

const getInitialPlan = (): SubscriptionPlan => {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(PLAN_STORAGE_KEY);
  return stored === "free" || stored === "premium" ? stored : null;
};

const hasDismissedStartModal = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(START_MODAL_DISMISSED_KEY) === "true";
};

const setStartModalDismissed = (): void => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(START_MODAL_DISMISSED_KEY, "true");
};

type ProjectSummary = {
  id: string;
  title: string | null;
  goal: string | null;
  updated_at: string;
};

type ExampleId = "career" | "sidebiz" | "wellbeing";

const buildExampleState = (id: ExampleId): HaradaState => {
  const templateIdMap: Record<ExampleId, string> = {
    career: "career",
    sidebiz: "sidebiz",
    wellbeing: "wellbeing",
  };

  const template = TEMPLATES.find((t) => t.id === templateIdMap[id]);
  const base = createEmptyState();

  if (!template) return base;

  return {
    ...base,
    goal: template.goal,
    pillars: template.pillars,
    tasks: template.tasks,
  };
};

const App: React.FC = () => {
  const [state, setState] = useState<HaradaState>(() => loadState());
  const [mapTitle, setMapTitle] = useState<string>("Your Action Map");
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(todayISO());
  const [activePillar, setActivePillar] = useState<number>(0);
  const [viewMode, setViewMode] = useState<"map" | "grid">("grid");
  const [collapsedPillars, setCollapsedPillars] = useState<boolean[]>(() =>
    Array(8).fill(false)
  );

  // Diary history UI
  const [historyOpen, setHistoryOpen] = useState<boolean>(true);
  const [expandedDiaryDates, setExpandedDiaryDates] = useState<
    Record<string, boolean>
  >({});
  const [olderExpanded, setOlderExpanded] = useState<boolean>(false);

  // Templates, AI, reset
  const [templatesOpen, setTemplatesOpen] = useState<boolean>(false);
  const [aiModalOpen, setAiModalOpen] = useState<boolean>(false);
  const [aiGoalText, setAiGoalText] = useState<string>("");
  const [isAiGenerating, setIsAiGenerating] = useState<boolean>(false);
  const [pillarRefineModalOpen, setPillarRefineModalOpen] = useState<boolean>(false);
  const [pillarRefineIndex, setPillarRefineIndex] = useState<number>(-1);
  const [pillarRefineSuggestions, setPillarRefineSuggestions] = useState<string[]>([]);
  const [isPillarRefining, setIsPillarRefining] = useState<boolean>(false);
  const [resetOpen, setResetOpen] = useState<boolean>(false);
  const [startModalOpen, setStartModalOpen] = useState<boolean>(false);

  const [exampleId, setExampleId] = useState<ExampleId>("career");
  const [exampleState, setExampleState] = useState<HaradaState>(() =>
    buildExampleState("career")
  );

  const [appView, setAppView] = useState<AppView>("home");
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [authView, setAuthView] = useState<AuthView>(null);
  const [plan, setPlan] = useState<SubscriptionPlan>(getInitialPlan());
  // Track if we've completed initial auth check - after this, NEVER auto-redirect
  // Use ref to avoid stale closure issues
  const authInitializedRef = useRef<boolean>(false);

  const handleProjectTitleUpdated = (id: string, newTitle: string) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, title: newTitle } : p))
    );
  };

  const isLoggedIn = !!user;
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL as string | undefined;
  const isAdmin = !!user && !!adminEmail && user.email === adminEmail;
  const isPro = plan === "premium";
  
  // Check if user has reached their map limit
  const mapLimit = isPro ? PRO_PLAN_MAP_LIMIT : FREE_PLAN_MAP_LIMIT;
  const hasReachedMapLimit = !isPro && projects.length >= FREE_PLAN_MAP_LIMIT;

  // Debug: Log plan status (remove in production)
  useEffect(() => {
    if (isLoggedIn && user) {
      console.log("[Plan Status]", {
        plan,
        isPro,
        email: user.email,
        mapsCount: projects.length,
        mapLimit,
        hasReachedMapLimit,
        note: "⚠️ Currently based on localStorage, not actual payment. In production, this should check Stripe subscription status from database.",
      });
    }
  }, [plan, isPro, isLoggedIn, user, projects.length, mapLimit, hasReachedMapLimit]);

  const ensureProjectForCurrentState = async (
    initialState?: HaradaState
  ) => {
    if (!isLoggedIn || !user || currentProjectId) {
      console.log("[ensureProject] Skipping - isLoggedIn:", isLoggedIn, "user:", !!user, "currentProjectId:", currentProjectId);
      return;
    }

    // Check map limit for free users BEFORE creating project
    if (!isPro && projects.length >= FREE_PLAN_MAP_LIMIT) {
      console.log("[ensureProject] Map limit reached for free user:", projects.length, ">=", FREE_PLAN_MAP_LIMIT);
      alert(`You've reached the limit of ${FREE_PLAN_MAP_LIMIT} maps on the free plan. Upgrade to Pro to create unlimited maps.`);
      return;
    }

    const snapshot = initialState ?? state;
    const title = getNextDefaultTitle(projects);

    console.log("[ensureProject] Creating project:", { title, goal: snapshot.goal, projectsCount: projects.length, userId: user.id });

    // Check if Supabase is properly configured
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl === "YOUR_SUPABASE_URL" || supabaseUrl.includes("placeholder")) {
      console.error("[ensureProject] ERROR: Supabase not configured! Check your .env file for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY");
      alert("Database not configured. Maps will not be saved. Please check your Supabase configuration.");
      return;
    }

    try {
      // Insert without goal column (goal is stored in state.goal)
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
        console.error("[ensureProject] Error creating project:", error);
        console.error("[ensureProject] Full error details:", JSON.stringify(error, null, 2));
        alert(`Failed to save map: ${error.message}. Check the browser console for details.`);
        return;
      }

      if (data) {
        // Extract goal from state for display
        const goalFromState = snapshot.goal || null;
        const project = { ...data, goal: goalFromState } as ProjectSummary;
        setCurrentProjectId(project.id);
        setProjects((prev) => [project, ...prev]);
        console.log("[ensureProject] ✅ Project created successfully:", project.id, project.title);
      } else {
        console.error("[ensureProject] No data returned from insert");
        alert("Failed to save map: No data returned from database.");
      }
    } catch (e) {
      console.error("[ensureProject] Exception creating project:", e);
      alert(`Failed to save map: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const loadProjectsForUser = async (u: User, preserveView = false) => {
    // Load projects with state to extract goal
    const { data, error } = await supabase
      .from("action_maps")
      .select("id,title,updated_at,state")
      .eq("user_id", u.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Failed to load projects", error);
      return;
    }

    // Extract goal from state for each project
    const list = ((data ?? []).map(p => {
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
      setCurrentProjectId(null); // Don't assume which project is open
    }

    // Only change view if we're not preserving it
    if (!preserveView) {
      if (list.length === 0) {
        // Brand-new user: send them to pricing first
        if (!plan) {
          setAppView("pricing");
          setStartModalOpen(false);
        } else {
          // If they already chose a plan on this device, go straight to builder
          setAppView("builder");
          setViewMode("grid");
          // Only show start modal if they haven't dismissed it before
          setStartModalOpen(!hasDismissedStartModal());
        }
      } else {
        // Returning user: land on dashboard
        setAppView("dashboard");
        setStartModalOpen(false);
      }
    }
  };

  const openProject = async (projectId: string) => {
    // Load the project's state from Supabase
    const { data, error } = await supabase
      .from("action_maps")
      .select("state")
      .eq("id", projectId)
      .single();

    if (error || !data?.state) {
      console.error("Failed to open project", error);
      return;
    }

    setState(data.state as HaradaState);
    setCurrentProjectId(projectId);
    setViewMode("grid"); // or keep current viewMode if you prefer
    setStartModalOpen(false);
    setAppView("builder");
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("action_maps")
        .delete()
        .eq("id", projectId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error deleting project", error);
        return;
      }

      // Remove from projects list
      setProjects((prev) => prev.filter((p) => p.id !== projectId));

      // If the deleted project was the current one, clear it
      if (currentProjectId === projectId) {
        setCurrentProjectId(null);
      }
    } catch (e) {
      console.error("Error deleting project", e);
    }
  };

  const handleExampleChange = (id: ExampleId) => {
    setExampleId(id);
    setExampleState(buildExampleState(id));
  };

  useEffect(() => {
    saveState(state);
  }, [state]);

  // Persist plan to localStorage
  useEffect(() => {
    if (!plan) return;
    window.localStorage.setItem(PLAN_STORAGE_KEY, plan);
  }, [plan]);

  // Load current session + watch for changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const current = data.session?.user ?? null;
      setUser(current);
      if (current) {
        // On initial load, STRICTLY preserve current view
        setAppView((currentView) => {
          // Always preserve the current view, just load projects
          loadProjectsForUser(current, true);
          return currentView;
        });
      } else {
        // Only set to home if not logged in AND not already in a logged-out view
        // BUT only on initial load - after that, preserve view
        setAppView((currentView) => {
          if (authInitializedRef.current) {
            // Already initialized - preserve view even if logged out
            return currentView;
          }
          // Initial load - only set to home if not already in a logged-out view
          if (currentView === "home" || currentView === "pricing" || currentView === "support") {
            return currentView;
          }
          // Otherwise go to home
          return "home";
        });
        setProjects([]);
        setStartModalOpen(false);
      }
      // Mark auth as initialized after first check
      authInitializedRef.current = true;
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null;
      
      // Use functional updates to avoid stale closure issues
      setUser((prevUser) => {
        // Check if user actually changed (not just token refresh)
        const userChanged = (prevUser?.id !== u?.id);
        
        if (u) {
          // ULTRA STRICT: After initial load, NEVER change view automatically
          setAppView((currentView) => {
            // If auth is already initialized, NEVER change view - just refresh projects
            if (authInitializedRef.current) {
              loadProjectsForUser(u, true);
              return currentView;
            }
            
            // Only on initial sign-in (before authInitialized is true)
            if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
              // Token refresh or user update - just refresh projects, never change view
              loadProjectsForUser(u, true);
              return currentView;
            } else if (event === "SIGNED_IN" && userChanged) {
              // Only on actual sign in with user change (and only before initialization)
              if (currentView === "home") {
                // Only redirect from home, preserve all other views
                loadProjectsForUser(u, false);
                return currentView; // loadProjectsForUser will set the view
              } else {
                // Already in builder/dashboard/etc - preserve it
                loadProjectsForUser(u, true);
                return currentView;
              }
            } else {
              // For any other event, preserve view completely
              loadProjectsForUser(u, true);
              return currentView;
            }
          });
        } else {
          // Only go to home on actual logout, and only if auth is initialized
          // (to avoid redirecting during initial load)
          if (event === "SIGNED_OUT" && authInitializedRef.current) {
            setAppView("home");
            setProjects([]);
            setStartModalOpen(false);
          }
        }
        
        return u;
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []); // Empty deps - authInitializedRef.current doesn't need to be in deps

  // Update selectedDate at midnight and on mount
  useEffect(() => {
    const updateDateIfNeeded = () => {
      const today = todayISO();
      if (selectedDate !== today) {
        setSelectedDate(today);
      }
    };

    // Update immediately on mount
    updateDateIfNeeded();

    // Calculate time until next midnight
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = midnight.getTime() - now.getTime();

    // Set timeout for midnight
    const midnightTimeout = setTimeout(() => {
      updateDateIfNeeded();
      // Then set up interval to check every minute (in case user's clock is slightly off)
      const interval = setInterval(updateDateIfNeeded, 60000);
      return () => clearInterval(interval);
    }, msUntilMidnight);

    // Also check periodically (every 5 minutes) in case the timeout was missed
    const periodicCheck = setInterval(updateDateIfNeeded, 5 * 60 * 1000);

    return () => {
      clearTimeout(midnightTimeout);
      clearInterval(periodicCheck);
    };
  }, [selectedDate]);

  // REMOVED: This effect was causing redirects and state conflicts
  // Projects are now loaded via loadProjectsForUser in the auth effect
  // Loading the first project's state here was interfering with the current state

  // Auto-save grid to Supabase for logged-in users & current project
  useEffect(() => {
    // Don't auto-save if not in builder view or if no current project
    if (!isLoggedIn || !user || !currentProjectId || appView !== "builder") return;

    const timeoutId = window.setTimeout(async () => {
      try {
        const stateSnapshot = state;
        const now = new Date().toISOString();

        // Update without goal column (goal is stored in state.goal)
        const updatePayload = {
          state: stateSnapshot,
        };

        const { error } = await supabase
          .from("action_maps")
          .update(updatePayload)
          .eq("id", currentProjectId)
          .eq("user_id", user.id);

        if (error) {
          console.error("[autosave] Error saving to cloud:", error);
        } else {
          // Keep dashboard list up to date (goal comes from state)
          setProjects((prev) =>
            prev.map((p) =>
              p.id === currentProjectId
                ? { ...p, goal: stateSnapshot.goal || null, updated_at: now }
                : p
            )
          );
        }
      } catch (e) {
        console.error("[autosave] Exception saving to cloud:", e);
      }
    }, 800); // debounce

    return () => window.clearTimeout(timeoutId);
  }, [user, state, isLoggedIn, currentProjectId]);

  const {
    progressForDay,
    allCompletedTasks,
    diaryEntry,
    pillarCompletion,
    totalDefinedTasks,
    completedDefinedTasks,
    progressPercent,
  } = useProgressStats(state, selectedDate, setState);

  // ---- Basic updates ----

  const updateGoal = (value: string) => {
    setState((prev) => withGoal(prev, value));
  };

  const updatePillar = (index: number, value: string) => {
    setState((prev) => withPillar(prev, index, value));
  };

  const updateTask = (pillarIndex: number, taskIndex: number, value: string) => {
    setState((prev) => withTask(prev, pillarIndex, taskIndex, value));
  };

  // Toggle a task for TODAY only
  const toggleTaskForDay = (taskId: string) => {
    setState((prev) => withToggledTaskForDay(prev, selectedDate, taskId));
  };

  const updateDiary = (value: string) => {
    setState((prev) => ({
      ...prev,
      diaryByDate: {
        ...prev.diaryByDate,
        [selectedDate]: value,
      },
    }));
  };


  const handleTogglePillarCollapse = (pillarIndex: number) => {
    setCollapsedPillars((prev) => {
      const next = [...prev];
      next[pillarIndex] = !next[pillarIndex];
      return next;
    });
  };

  const applyTemplate = (template: Template) => {
    const nextState = withAppliedTemplate(state, template);
    setState(nextState);
    setActivePillar(0);
    setTemplatesOpen(false);

    // If this is the first edit and the user is logged in, create a project row
    ensureProjectForCurrentState(nextState);
  };

  // Reset EVERYTHING (goal, pillars, tasks, diary, progress, completions)
  const handleConfirmReset = () => {
    const empty = createEmptyState();
    setState(empty);
    setActivePillar(0);
    setCollapsedPillars(Array(8).fill(false));
    setExpandedDiaryDates({});
    setOlderExpanded(false);
    setResetOpen(false);
  };

  const toggleDiaryDateExpanded = (date: string) => {
    setExpandedDiaryDates((prev) => ({
      ...prev,
      [date]: !prev[date],
    }));
  };

  const handleToggleHistory = () => {
    setHistoryOpen((prev) => !prev);
  };

  const handleToggleOlder = () => {
    setOlderExpanded((prev) => !prev);
  };

  const handleDismissStartModal = () => {
    setStartModalDismissed();
    setStartModalOpen(false);
  };

  type AiHelperResponse = {
    goal: string;
    pillars: string[]; // 8 items
    tasks: string[][]; // 8 x 8
    name?: string;
    description?: string;
  };

  const handleAiGenerate = async () => {
    const trimmedGoal = aiGoalText.trim();
    if (!trimmedGoal) {
      setAiModalOpen(false);
      return;
    }

    setIsAiGenerating(true);

    try {
      // 1) Call your backend AI helper
      const response = await fetch(AI_HELPER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ goal: trimmedGoal }),
      });

      if (!response.ok) {
        console.error("AI helper error:", response.status, await response.text());
        // you can swap this for a nicer toast UI later
        alert("Sorry, something went wrong generating your plan.");
        setIsAiGenerating(false);
        return;
      }

      const data = (await response.json()) as AiHelperResponse;

      // 2) Turn the response into a Template
      const template: Template = {
        id: `ai-${Date.now()}`,
        name: data.name ?? "AI-generated map",
        description:
          data.description ??
          `Generated automatically from your goal: ${trimmedGoal}`,
        goal: data.goal ?? trimmedGoal,
        pillars: data.pillars,
        tasks: data.tasks,
      };

      // 3) Apply it to the current grid (same as picking a template)
      setState((prev) => withAppliedTemplate(prev, template));
      setActivePillar(0);
      setViewMode("grid");
      
      // 4) Close the modal on success
      setAiModalOpen(false);
      setAiGoalText("");
    } catch (error) {
      console.error("AI helper request failed", error);
      alert("Sorry, something went wrong generating your plan.");
    } finally {
      setIsAiGenerating(false);
    }
  };

  type PillarRefineResponse = {
    suggestions: string[];
  };

  const handlePillarRefine = async (pillarIndex: number) => {
    if (pillarIndex < 0 || pillarIndex >= state.pillars.length) return;

    setPillarRefineIndex(pillarIndex);
    setPillarRefineModalOpen(true);
    setPillarRefineSuggestions([]);
    setIsPillarRefining(true);

    try {
      const response = await fetch(PILLAR_REFINE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          goal: state.goal || "",
          currentPillar: state.pillars[pillarIndex] || "",
        }),
      });

      if (!response.ok) {
        console.error("Pillar refine error:", response.status, await response.text());
        alert("Sorry, something went wrong generating pillar suggestions.");
        setIsPillarRefining(false);
        setPillarRefineModalOpen(false);
        return;
      }

      const data = (await response.json()) as PillarRefineResponse;
      setPillarRefineSuggestions(data.suggestions || []);
    } catch (error) {
      console.error("Pillar refine request failed", error);
      alert("Sorry, something went wrong generating pillar suggestions.");
    } finally {
      setIsPillarRefining(false);
    }
  };

  const handleSelectRefinedPillar = (suggestion: string) => {
    if (pillarRefineIndex >= 0 && pillarRefineIndex < state.pillars.length) {
      updatePillar(pillarRefineIndex, suggestion);
    }
    setPillarRefineModalOpen(false);
    setPillarRefineIndex(-1);
    setPillarRefineSuggestions([]);
  };

  const handleSelectPlan = (nextPlan: "free" | "premium") => {
    setPlan(nextPlan);
    setAppView("builder");
    setViewMode("grid");
    setStartModalOpen(true); // show intro wizard after picking plan
  };

  if (appView === "dashboard") {
  return (
      <DashboardPage
        projects={projects}
        user={user}
        isAdmin={isAdmin}
        isPro={isPro}
        hasReachedMapLimit={hasReachedMapLimit}
        authView={authView}
        onSetState={setState}
        onSetViewMode={setViewMode}
        onSetStartModalOpen={setStartModalOpen}
        onSetAppView={setAppView}
        onSetAuthView={setAuthView}
        onSetCurrentProjectId={setCurrentProjectId}
        onDeleteProject={handleDeleteProject}
        onProjectTitleUpdated={handleProjectTitleUpdated}
      />
    );
  }

  if (appView === "harada") {
    return (
      <HaradaInfoPage
        user={user}
        isAdmin={isAdmin}
        isPro={isPro}
        onSetAppView={setAppView}
        onSetAuthView={setAuthView}
      />
    );
  }

  if (appView === "pricing") {
    return (
      <PricingPage
        user={user}
        isAdmin={isAdmin}
        isPro={isPro}
        authView={authView}
        currentPlan={plan}
        onSetAuthView={setAuthView}
        onSelectPlan={handleSelectPlan}
        onSetAppView={setAppView}
      />
    );
  }

  if (appView === "support") {
    return (
      <SupportPage
        user={user}
        isAdmin={isAdmin}
        isPro={isPro}
        onSetAuthView={setAuthView}
        onGoToPricing={() => setAppView("pricing")}
        onGoToDashboard={() => setAppView("dashboard")}
      />
    );
  }

  const currentProject =
    currentProjectId ? projects.find((p) => p.id === currentProjectId) : null;

  const currentProjectTitle = currentProject?.title || "Action Map";

  if (appView === "builder") {
    return (
      <BuilderPage
              state={state}
        mapTitle={mapTitle}
        setMapTitle={setMapTitle}
        viewMode={viewMode}
        setViewMode={setViewMode}
              selectedDate={selectedDate}
              activePillar={activePillar}
        setActivePillar={setActivePillar}
        collapsedPillars={collapsedPillars}
        setCollapsedPillars={setCollapsedPillars}
        historyOpen={historyOpen}
        setHistoryOpen={setHistoryOpen}
        expandedDiaryDates={expandedDiaryDates}
        setExpandedDiaryDates={setExpandedDiaryDates}
        olderExpanded={olderExpanded}
        setOlderExpanded={setOlderExpanded}
        templatesOpen={templatesOpen}
        setTemplatesOpen={setTemplatesOpen}
        aiModalOpen={aiModalOpen}
        setAiModalOpen={setAiModalOpen}
        aiGoalText={aiGoalText}
        setAiGoalText={setAiGoalText}
        isAiGenerating={isAiGenerating}
        resetOpen={resetOpen}
        setResetOpen={setResetOpen}
        startModalOpen={startModalOpen}
        setStartModalOpen={setStartModalOpen}
        onDismissStartModalPermanently={handleDismissStartModal}
        authView={authView}
        setAuthView={setAuthView}
        user={user}
        isAdmin={isAdmin}
        isPro={isPro}
        isLoggedIn={isLoggedIn}
              progressForDay={progressForDay}
              allCompletedTasks={allCompletedTasks}
              diaryEntry={diaryEntry}
              pillarCompletion={pillarCompletion}
              totalDefinedTasks={totalDefinedTasks}
              completedDefinedTasks={completedDefinedTasks}
              progressPercent={progressPercent}
        onUpdateGoal={updateGoal}
        onUpdatePillar={updatePillar}
        onUpdateTask={updateTask}
        onToggleTaskForDay={toggleTaskForDay}
        onUpdateDiary={updateDiary}
        onTogglePillarCollapse={handleTogglePillarCollapse}
              onToggleHistory={handleToggleHistory}
        onToggleDiaryDateExpanded={toggleDiaryDateExpanded}
              onToggleOlder={handleToggleOlder}
        onApplyTemplate={applyTemplate}
        onAiGenerate={handleAiGenerate}
        onConfirmReset={handleConfirmReset}
        onSetAppView={setAppView}
        onEnsureProject={ensureProjectForCurrentState}
              templates={TEMPLATES}
        currentProjectTitle={currentProjectTitle}
        currentProjectId={currentProjectId}
        onProjectTitleUpdated={handleProjectTitleUpdated}
        projects={projects}
        onOpenProjectFromSidebar={openProject}
        onNewMapFromSidebar={() => {
          // Quick "New" from sidebar
          setState(createEmptyState());
          setCurrentProjectId(null);
          setViewMode("map");
          setStartModalOpen(true);
          setAppView("builder");
        }}
        hasReachedMapLimit={hasReachedMapLimit}
        pillarRefineModalOpen={pillarRefineModalOpen}
        setPillarRefineModalOpen={setPillarRefineModalOpen}
        pillarRefineIndex={pillarRefineIndex}
        pillarRefineSuggestions={pillarRefineSuggestions}
        isPillarRefining={isPillarRefining}
        onPillarRefine={handlePillarRefine}
        onSelectRefinedPillar={handleSelectRefinedPillar}
      />
    );
  }

  return (
    <HomePage
      user={user}
      isAdmin={isAdmin}
      isPro={isPro}
      authView={authView}
      exampleId={exampleId}
      exampleState={exampleState}
      onSetAppView={setAppView}
      onSetAuthView={setAuthView}
      onExampleChange={handleExampleChange}
    />
  );
};

export default App;
