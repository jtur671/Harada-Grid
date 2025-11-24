import React, { useEffect, useState, useRef, useCallback } from "react";
import { TEMPLATES, type Template } from "./templates";
import type { HaradaState, AppView, AuthView, SubscriptionPlan, ExampleId } from "./types";
import { loadState, saveState, createEmptyState } from "./utils/harada";
import {
  withGoal,
  withPillar,
  withTask,
  withToggledTaskForDay,
  withAppliedTemplate,
} from "./utils/stateHelpers";
import { useProgressStats } from "./hooks/useProgressStats";
import { useDateSync } from "./hooks/useDateSync";
import { useProjects } from "./hooks/useProjects";
import { getInitialPlan, hasDismissedStartModal, setStartModalDismissed, setPlan as savePlanToStorage } from "./utils/storage";
import { buildExampleState } from "./utils/projects";
import { generateAiMap, refinePillar, applyAiResponseToState } from "./services/ai";
import { getSubscriptionStatus } from "./services/subscriptions";
import { FREE_PLAN_MAP_LIMIT, PRO_PLAN_MAP_LIMIT } from "./config/constants";
import { DashboardPage } from "./components/DashboardPage";
import { HaradaInfoPage } from "./components/HaradaInfoPage";
import { HomePage } from "./components/HomePage";
import { BuilderPage } from "./components/BuilderPage";
import { PricingPage } from "./components/PricingPage";
import { SupportPage } from "./components/SupportPage";
import { supabase } from "./supabaseClient";
import type { User } from "@supabase/supabase-js";

const App: React.FC = () => {
  const [state, setState] = useState<HaradaState>(() => loadState());
  const [mapTitle, setMapTitle] = useState<string>("Your Action Map");
  const selectedDate = useDateSync();
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
  const [user, setUser] = useState<User | null>(null);
  const [authView, setAuthView] = useState<AuthView>(null);
  const [plan, setPlan] = useState<SubscriptionPlan>(getInitialPlan());
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionPlan>(null);
  const authInitializedRef = useRef<boolean>(false);

  const isLoggedIn = !!user;
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL as string | undefined;
  const isAdmin = !!user && !!adminEmail && user.email === adminEmail;
  
  // Use database subscription status if available, fallback to localStorage for development
  const isPro = subscriptionStatus === "premium" || (subscriptionStatus === null && plan === "premium");

  // Use projects hook
  const {
    projects,
    currentProjectId,
    setCurrentProjectId,
    loadProjects,
    createProject,
    openProject: openProjectFromHook,
    deleteProject,
    updateProjectTitle,
    updateProjectInList,
  } = useProjects({
    user,
    isPro,
    plan,
    onViewChange: setAppView,
    onViewModeChange: setViewMode,
    onStartModalChange: setStartModalOpen,
    hasDismissedStartModal,
  });

  // Check if user has reached their map limit
  const mapLimit = isPro ? PRO_PLAN_MAP_LIMIT : FREE_PLAN_MAP_LIMIT;
  const hasReachedMapLimit = !isPro && projects.length >= FREE_PLAN_MAP_LIMIT;

  const handleProjectTitleUpdated = (id: string, newTitle: string) => {
    updateProjectTitle(id, newTitle);
  };

  // Load subscription status from database when user logs in
  // Only check once per user login to avoid excessive requests
  useEffect(() => {
    if (isLoggedIn && user) {
      let cancelled = false;
      
      // Debounce to avoid too many requests
      const timeoutId = setTimeout(() => {
        getSubscriptionStatus(user.id)
          .then((status) => {
            if (cancelled) return;
            if (status) {
              setSubscriptionStatus(status.plan);
            } else {
              // Fallback to localStorage for development/testing or if table doesn't exist
              setSubscriptionStatus(plan);
            }
          })
          .catch(() => {
            if (cancelled) return;
            // Silently fallback to localStorage on error (table might not exist yet)
            setSubscriptionStatus(plan);
          });
      }, 200); // Small delay to debounce

      return () => {
        cancelled = true;
        clearTimeout(timeoutId);
      };
    } else {
      setSubscriptionStatus(null);
    }
  }, [isLoggedIn, user?.id]); // Only depend on user.id, not plan

  // Debug: Log plan status
  useEffect(() => {
    if (isLoggedIn && user) {
      console.log("[Plan Status]", {
        plan: subscriptionStatus || plan,
        isPro,
        email: user.email,
        mapsCount: projects.length,
        mapLimit,
        hasReachedMapLimit,
        source: subscriptionStatus ? "database" : "localStorage (dev)",
      });
    }
  }, [subscriptionStatus, plan, isPro, isLoggedIn, user, projects.length, mapLimit, hasReachedMapLimit]);

  const ensureProjectForCurrentState = async (
    initialState?: HaradaState
  ) => {
    if (!isLoggedIn || !user || currentProjectId) {
      console.log("[ensureProject] Skipping - isLoggedIn:", isLoggedIn, "user:", !!user, "currentProjectId:", currentProjectId);
      return;
    }

    const snapshot = initialState ?? state;
    const projectId = await createProject(snapshot, snapshot);
    if (projectId) {
      setCurrentProjectId(projectId);
    }
  };

  const loadProjectsForUser = useCallback(async (_u: User, preserveView = false) => {
    await loadProjects(preserveView);
  }, [loadProjects]);

  const openProject = async (projectId: string) => {
    const projectState = await openProjectFromHook(projectId);
    if (projectState) {
      setState(projectState);
      setViewMode("grid");
      setStartModalOpen(false);
      setAppView("builder");
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    await deleteProject(projectId);
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
    savePlanToStorage(plan);
  }, [plan]);

  // Load current session + watch for changes
  useEffect(() => {
    let cancelled = false;
    
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const current = data.session?.user ?? null;
      setUser(current);
      if (current) {
        // On initial load, STRICTLY preserve current view
        setAppView((currentView) => {
          // Always preserve the current view, just load projects
          // Debounce to avoid rapid calls
          setTimeout(() => {
            if (!cancelled) {
              loadProjectsForUser(current, true);
            }
          }, 100);
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
            // Debounce project loading to avoid rapid calls
            setTimeout(() => {
              // If auth is already initialized, NEVER change view - just refresh projects
              if (authInitializedRef.current) {
                loadProjectsForUser(u, true);
                return;
              }
              
              // Only on initial sign-in (before authInitialized is true)
              if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
                // Token refresh or user update - just refresh projects, never change view
                loadProjectsForUser(u, true);
              } else if (event === "SIGNED_IN" && userChanged) {
                // Only on actual sign in with user change (and only before initialization)
                if (currentView === "home") {
                  // Only redirect from home, preserve all other views
                  loadProjectsForUser(u, false);
                } else {
                  // Already in builder/dashboard/etc - preserve it
                  loadProjectsForUser(u, true);
                }
              } else {
                // For any other event, preserve view completely
                loadProjectsForUser(u, true);
              }
            }, 150); // Debounce to prevent rapid calls
            
            return currentView;
          });
        } else {
          // Only go to home on actual logout, and only if auth is initialized
          // (to avoid redirecting during initial load)
          if (event === "SIGNED_OUT" && authInitializedRef.current) {
            setAppView("home");
            setStartModalOpen(false);
          }
        }
        
        return u;
      });
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [loadProjectsForUser]); // Include loadProjectsForUser in deps

  // Date sync is handled by useDateSync hook

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
          updateProjectInList(currentProjectId, {
            goal: stateSnapshot.goal || null,
            updated_at: now,
          });
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

  const handleAiGenerate = async () => {
    const trimmedGoal = aiGoalText.trim();
    if (!trimmedGoal) {
      setAiModalOpen(false);
      return;
    }

    setIsAiGenerating(true);

    try {
      const aiResponse = await generateAiMap(trimmedGoal);
      const { newState } = applyAiResponseToState(state, aiResponse, trimmedGoal);

      // Apply it to the current grid (same as picking a template)
      setState(newState);
      setActivePillar(0);
      setViewMode("grid");
      
      // Close the modal on success
      setAiModalOpen(false);
      setAiGoalText("");
    } catch (error) {
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : "Failed to generate AI map. Please try again.";
      alert(errorMessage);
      console.error("AI generation error:", error);
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handlePillarRefine = async (pillarIndex: number) => {
    if (pillarIndex < 0 || pillarIndex >= state.pillars.length) return;

    setPillarRefineIndex(pillarIndex);
    setPillarRefineModalOpen(true);
    setPillarRefineSuggestions([]);
    setIsPillarRefining(true);

    try {
      const data = await refinePillar(
        state.goal || "",
        state.pillars[pillarIndex] || ""
      );
      setPillarRefineSuggestions(data.suggestions || []);
    } catch (error) {
      console.error("Pillar refine request failed", error);
      alert("Sorry, something went wrong generating pillar suggestions.");
      setIsPillarRefining(false);
      setPillarRefineModalOpen(false);
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
