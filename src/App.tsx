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

type AppView = "home" | "builder" | "harada" | "dashboard" | "pricing";
type AuthView = "login" | "signup" | null;

type SubscriptionPlan = "free" | "premium" | null;

const PLAN_STORAGE_KEY = "actionmaps-plan";

const getInitialPlan = (): SubscriptionPlan => {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(PLAN_STORAGE_KEY);
  return stored === "free" || stored === "premium" ? stored : null;
};

type ProjectSummary = {
  id: string;
  title: string | null;
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

  const isLoggedIn = !!user;
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL as string | undefined;
  const isAdmin = !!user && !!adminEmail && user.email === adminEmail;

  const loadProjectsForUser = async (u: User) => {
    const { data, error } = await supabase
      .from("action_maps")
      .select("id,title,updated_at")
      .eq("user_id", u.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Failed to load projects", error);
      return;
    }

    const list = (data ?? []) as ProjectSummary[];
    setProjects(list);

    if (list.length === 0) {
      // Brand-new user: send them to pricing first
      if (!plan) {
        setAppView("pricing");
        setStartModalOpen(false);
      } else {
        // If they already chose a plan on this device, go straight to builder
        setAppView("builder");
        setViewMode("grid");
        setStartModalOpen(true);
      }
    } else {
      // Returning user: land on dashboard
      setAppView("dashboard");
      setStartModalOpen(false);
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
        // Decide whether to show builder+modal or dashboard
        loadProjectsForUser(current);
      } else {
        setAppView("home");
        setProjects([]);
        setStartModalOpen(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        loadProjectsForUser(u);
      } else {
        setAppView("home");
        setProjects([]);
        setStartModalOpen(false);
      }
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
          .select("state")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data?.state) {
          setState(data.state as HaradaState);
        }
      } catch (error) {
        console.error("Error loading from cloud:", error);
      }
    };

    loadFromCloud();
  }, [user]);

  // Auto-save grid to Supabase for logged-in users
  useEffect(() => {
    if (!isLoggedIn || !user) return;

    const timeoutId = window.setTimeout(async () => {
      try {
        const { error } = await supabase.from("action_maps").upsert(
          {
            user_id: user.id,
            state,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id",
          }
        );
        if (error) {
          console.error("Error saving to cloud:", error);
        }
      } catch (e) {
        console.error("Error saving to cloud:", e);
      }
    }, 800); // debounce

    return () => window.clearTimeout(timeoutId);
  }, [user, state]);

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
    setState((prev) => withAppliedTemplate(prev, template));
    setActivePillar(0);
    setTemplatesOpen(false);
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

  // AI stub (wire to OpenAI later)
  const handleAiGenerate = () => {
    console.log("AI Helper main goal:", aiGoalText);
    setAiModalOpen(false);
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

  if (appView === "builder") {
    return (
      <BuilderPage
              state={state}
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
        resetOpen={resetOpen}
        setResetOpen={setResetOpen}
        startModalOpen={startModalOpen}
        setStartModalOpen={setStartModalOpen}
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
              templates={TEMPLATES}
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
