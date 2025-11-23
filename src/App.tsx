import React, { useEffect, useState } from "react";
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
import { supabase } from "./supabaseClient";
import type { User } from "@supabase/supabase-js";

// For local dev, use relative path (Vite proxy will forward to wrangler)
// For production, defaults to /api/ai-helper (same domain)
// Can override with VITE_AI_HELPER_URL env var
const AI_HELPER_URL =
  (import.meta.env.VITE_AI_HELPER_URL as string | undefined) ?? "/api/ai-helper";

type AppView = "home" | "builder" | "harada" | "dashboard" | "pricing";
type AuthView = "login" | "signup" | null;

type SubscriptionPlan = "free" | "premium" | null;

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
  const [selectedDate] = useState<string>(todayISO()); // static "today"
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

  const handleProjectTitleUpdated = (id: string, newTitle: string) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, title: newTitle } : p))
    );
  };

  const isLoggedIn = !!user;
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL as string | undefined;
  const isAdmin = !!user && !!adminEmail && user.email === adminEmail;

  const ensureProjectForCurrentState = async (
    initialState?: HaradaState
  ) => {
    if (!isLoggedIn || !user || currentProjectId) {
      console.log("[ensureProject] Skipping - isLoggedIn:", isLoggedIn, "user:", !!user, "currentProjectId:", currentProjectId);
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
        // On initial load, check current view and preserve it if not home
        // This prevents redirecting users who are already in builder/dashboard
        setAppView((currentView) => {
          // If already in builder or dashboard, just load projects without changing view
          if (currentView === "builder" || currentView === "dashboard") {
            loadProjectsForUser(current, true);
            return currentView;
          }
          // If on home, load projects and let it decide where to go
          loadProjectsForUser(current, false);
          return currentView; // loadProjectsForUser will set view
        });
      } else {
        setAppView("home");
        setProjects([]);
        setStartModalOpen(false);
      }
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
          // Only redirect on actual sign in, never on token refresh
          setAppView((currentView) => {
            // Always preserve view on token refresh or if already in builder/dashboard
            if (event === "TOKEN_REFRESHED" || currentView === "builder" || currentView === "dashboard") {
              // Just refresh projects list, don't change view
              loadProjectsForUser(u, true);
              return currentView;
            } else if (event === "SIGNED_IN" || (userChanged && currentView === "home")) {
              // Only load projects and potentially redirect on actual sign in
              loadProjectsForUser(u, false);
              return currentView; // loadProjectsForUser will set the view
            } else {
              // For other events, preserve view
              loadProjectsForUser(u, true);
              return currentView;
            }
          });
        } else {
          // Only go to home on actual logout
          if (event === "SIGNED_OUT") {
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
  }, []);

  // When a user logs in, try to load their saved grid
  useEffect(() => {
    const loadFromCloud = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("action_maps")
          .select("id,title,state")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          if (data.state) {
          setState(data.state as HaradaState);
          }
          if (data.id) {
            setCurrentProjectId(data.id);
          }
          if (data.title) {
            setMapTitle(data.title);
          }
        }
      } catch (error) {
        console.error("Error loading from cloud:", error);
      }
    };

    loadFromCloud();
  }, [user]);

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
        authView={authView}
        currentPlan={plan}
        onSetAuthView={setAuthView}
        onSelectPlan={handleSelectPlan}
        onSetAppView={setAppView}
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
        isLoggedIn={isLoggedIn}
        progressForDay={progressForDay}
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
      />
    );
  }

  return (
    <HomePage
      user={user}
      isAdmin={isAdmin}
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
