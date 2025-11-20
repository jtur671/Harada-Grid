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
import { triggerPrintWithBodyClass } from "./utils/print";
import { useProgressStats } from "./hooks/useProgressStats";
import { EditMode } from "./components/EditMode";
import { ViewMode } from "./components/ViewMode";
import { TemplateModal } from "./components/TemplateModal";
import { AiHelperModal } from "./components/AiHelperModal";
import { ResetModal } from "./components/ResetModal";
import { TraditionalGrid } from "./components/TraditionalGrid";
import { AuthModal } from "./components/AuthModal";
import { DashboardPage } from "./components/DashboardPage";
import { supabase } from "./supabaseClient";
import type { User } from "@supabase/supabase-js";

type AppView = "home" | "builder" | "harada" | "dashboard";
type AuthView = "login" | "signup" | null;

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
      // Brand-new user: go straight to builder, show onboarding modal once
      setAppView("builder");
      setViewMode("grid");
      setStartModalOpen(true);
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

  const handleExport = () => {
    // We only show the button in View mode, but keep this guard just in case
    if (viewMode !== "grid") {
      setViewMode("grid");
    }

    // Remember current history UI state so we can restore after printing
    const prevHistoryOpen = historyOpen;
    const prevOlderExpanded = olderExpanded;

    // Make sure diary history + older block are expanded for print
    setHistoryOpen(true);
    setOlderExpanded(true);

    // Wait a tick so React can render the expanded history,
    // then trigger print with a special body class
    setTimeout(() => {
      triggerPrintWithBodyClass("print-mode");

      // Restore previous UI state after printing
      setHistoryOpen(prevHistoryOpen);
      setOlderExpanded(prevOlderExpanded);
    }, 50);
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
      <div className="app builder-app">
        <div className="builder-shell">
          <header className="home-nav">
            <div className="home-logo">
              <span className="home-logo-mark">◆</span>
              <span className="home-logo-text">
                Action<span>Maps</span>
              </span>
                </div>

            <nav className="home-nav-actions">
                <button
                  type="button"
                className="home-nav-link"
                onClick={() => setAppView("home")}
                >
                ← Back
                </button>

              {isLoggedIn && user?.email ? (
                <>
                  {isAdmin && <span className="home-nav-user-pill">Admin</span>}
                  {!isAdmin && (
                    <span className="home-nav-user-pill">{user.email}</span>
                  )}
                <button
                  type="button"
                  className="home-nav-link"
                  onClick={() => supabase.auth.signOut()}
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="home-nav-link"
                  onClick={() => setAuthView("login")}
                >
                  Log in
                </button>
                <button
                  type="button"
                  className="home-nav-cta"
                  onClick={() => setAuthView("signup")}
                >
                  Sign up
                </button>
              </>
            )}
          </nav>
        </header>

          <main className="info-main">
            <div className="info-card">
              <p className="info-kicker">Harada Method 101</p>
              <h1 className="info-title">What is the Harada Method?</h1>
              <p className="info-lede">
                The Harada Method is a goal-achievement framework from Japan that
                helps people turn a single, clear objective into specific, daily
                actions they can actually follow through on.
              </p>

              <section className="info-section">
                <h2>Where it comes from</h2>
                <p>
                  The method was developed by coach Takashi Harada, who worked
                  with underperforming students and athletes. By helping them set
                  one ambitious goal and break it into focused areas and habits,
                  he saw dramatic improvements in results and confidence.
                </p>
          </section>

              <section className="info-section">
                <h2>How it works</h2>
                <ul>
                  <li>
                    You choose <strong>one main goal</strong> you want to achieve.
              </li>
                  <li>
                    You identify <strong>key pillars</strong> that support that
                    goal (skills, health, relationships, finances, etc.).
              </li>
                  <li>
                    You list out <strong>concrete actions</strong> under each
                    pillar and track them daily in a visual grid.
              </li>
                </ul>
              </section>

              <section className="info-section">
                <h2>Why it works for modern planning</h2>
                <ul className="info-bullets">
                  <li>
                    It forces you to move from vague intentions to clear steps.
              </li>
                  <li>
                    The grid shows how all your actions connect to your goal.
                  </li>
                  <li>
                    It fits busy lives—you can tweak actions while keeping the
                    main goal steady.
                  </li>
                </ul>
          </section>

              <section className="info-section">
                <h2>How Action Maps adapts it</h2>
                <p>
                  Action Maps keeps the spirit of Harada—one big goal, supporting
                  pillars, and daily actions—but adds modern touches like cloud
                  sync and
                  <span className="info-highlight"> AI-assisted templates</span>.
                  You can start from a blank sheet, load a template, or let AI
                  help you generate pillars and actions based on your goal.
                </p>
              </section>

              <div className="info-ctas">
                <button
                  type="button"
                  className="hero-primary-cta"
                  onClick={() => setAppView("builder")}
                >
                  Start your first map
                </button>
                <button
                  type="button"
                  className="hero-secondary-cta hero-outline-cta info-secondary"
                  onClick={() => setAppView("home")}
                >
                  Back to homepage
                </button>
              </div>
              </div>
          </main>
            </div>
                </div>
    );
  }

  if (appView === "builder") {
    return (
      <div className="app builder-app">
        <div className="builder-shell">
        <header className="home-nav">
          <div className="home-logo">
            <span className="home-logo-mark">◆</span>
            <span className="home-logo-text">
                Action<span>Maps</span>
            </span>
            </div>

          <nav className="home-nav-actions">
            <button
              type="button"
              className="home-nav-link"
              onClick={() => setAppView("home")}
            >
              ← Back
              </button>

            {isLoggedIn && user?.email ? (
              <>
                {isAdmin && <span className="home-nav-user-pill">Admin</span>}
                {!isAdmin && (
                  <span className="home-nav-user-pill">{user.email}</span>
                )}
              <button
                type="button"
                  className="home-nav-link"
                  onClick={() => supabase.auth.signOut()}
                >
                  Log out
              </button>
              </>
            ) : (
              <>
              <button
                type="button"
                className="home-nav-link"
                onClick={() => setAuthView("login")}
              >
                Log in
              </button>
              <button
                type="button"
                className="home-nav-cta"
                onClick={() => setAuthView("signup")}
              >
                Sign up
              </button>
              </>
            )}
          </nav>
        </header>

          <main className="builder-main">
            <div className="builder-top-row">
              <h1 className="builder-title">Your Action Map</h1>
              <div className="builder-status">
                {isLoggedIn ? (
                  <span>Changes will be saved to your account automatically.</span>
                ) : (
                  <span>
                    You&apos;re in demo mode.{" "}
                    <button
                      type="button"
                      className="builder-status-link"
                      onClick={() => setAuthView("signup")}
                    >
                      Sign up
                    </button>{" "}
                    to save this map.
                  </span>
                )}
            </div>
            </div>

            <div className="layout">
        <section className="panel">
          <div className="panel-header-row">
            <h2>Goal Sheet</h2>
            <div className="panel-header-actions">
              <div className="view-toggle">
                <button
                  type="button"
                  className={
                    "view-toggle-btn" +
                    (viewMode === "map" ? " view-toggle-btn-active" : "")
                  }
                  onClick={() => setViewMode("map")}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className={
                    "view-toggle-btn" +
                          (viewMode === "grid"
                            ? " view-toggle-btn-active"
                            : "")
                  }
                  onClick={() => setViewMode("grid")}
                >
                  View
                </button>
              </div>

              {viewMode === "map" && (
                <>
                  <button
                    type="button"
                    className="template-btn"
                    onClick={() => setTemplatesOpen(true)}
                  >
                    Templates
                  </button>
                  <button
                    type="button"
                    className="ai-template-btn"
                    onClick={() => setAiModalOpen(true)}
                  >
                    Templates (AI)
                  </button>
                  <button
                    type="button"
                    className="reset-btn"
                    onClick={() => setResetOpen(true)}
                  >
                    Reset All
                  </button>
                </>
              )}

              {viewMode === "grid" && (
                <button
                  type="button"
                  className="export-btn"
                  onClick={handleExport}
                >
                  Export / Print
                </button>
              )}
            </div>
          </div>

          <p className="panel-subtitle">
                  {viewMode === "map"
                    ? "Edit mode: add your main goal, rename pillars, and type in actions—or use Templates / Templates (AI) to start from a ready-made map."
                    : "View mode: see your Harada-style grid. Click a pillar to collapse it and an action to mark it done for today."}
          </p>

          {viewMode === "map" ? (
            <EditMode
              state={state}
              activePillar={activePillar}
              onSelectPillar={setActivePillar}
              onGoalChange={updateGoal}
              onPillarChange={updatePillar}
              onTaskChange={updateTask}
            />
          ) : (
            <ViewMode
              state={state}
              selectedDate={selectedDate}
              diaryEntry={diaryEntry}
              progressForDay={progressForDay}
              pillarCompletion={pillarCompletion}
              completedDefinedTasks={completedDefinedTasks}
              totalDefinedTasks={totalDefinedTasks}
              progressPercent={progressPercent}
              collapsedPillars={collapsedPillars}
              onTogglePillar={handleTogglePillarCollapse}
              onToggleTask={toggleTaskForDay}
              onDiaryChange={updateDiary}
              historyOpen={historyOpen}
              onToggleHistory={handleToggleHistory}
              expandedDiaryDates={expandedDiaryDates}
              onToggleDiaryDate={toggleDiaryDateExpanded}
              olderExpanded={olderExpanded}
              onToggleOlder={handleToggleOlder}
            />
          )}

          {templatesOpen && (
            <TemplateModal
              templates={TEMPLATES}
              onClose={() => setTemplatesOpen(false)}
              onApply={applyTemplate}
            />
          )}

          {aiModalOpen && (
            <AiHelperModal
              value={aiGoalText}
              onChange={(next) => setAiGoalText(next)}
              onCancel={() => setAiModalOpen(false)}
              onGenerate={handleAiGenerate}
            />
          )}

          {resetOpen && (
            <ResetModal
              onCancel={() => setResetOpen(false)}
              onConfirm={handleConfirmReset}
            />
          )}
              </section>
            </div>
      </main>

          <AuthModal
            authView={authView}
            onClose={() => setAuthView(null)}
            onSwitchView={(view) => setAuthView(view)}
          />

          {startModalOpen && (
            <div className="start-overlay" role="dialog" aria-modal="true">
              <div className="start-card">
                <h2 className="start-title">How do you want to start?</h2>
                <p className="start-subtitle">
                  You&apos;re looking at the View mode right now. Choose how you
                  want to build your first Action Map.
                </p>

                <div className="start-actions">
              <button
                type="button"
                    className="start-btn-primary"
                    onClick={() => {
                      setViewMode("map"); // jump to Edit mode
                      setStartModalOpen(false);
                    }}
                  >
                    Fill it out yourself
              </button>
                  <button
                    type="button"
                    className="start-btn-secondary"
                    onClick={() => {
                      setStartModalOpen(false);
                      setViewMode("map"); // edit mode so they can tweak
                      setAiModalOpen(true); // open your existing AI helper modal
                    }}
                  >
                    Use AI to create my board
                  </button>
                </div>

                <button
                  type="button"
                  className="start-skip"
                  onClick={() => setStartModalOpen(false)}
                >
                  Skip for now
                    </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app app-dark">
      <div className="home-shell">
        <header className="home-nav">
          <div className="home-logo">
            <span className="home-logo-mark">◆</span>
            <span className="home-logo-text">
              Action<span>Maps</span>
            </span>
          </div>

          <nav className="home-nav-actions">
            {isLoggedIn && user?.email ? (
              <>
                {isAdmin && <span className="home-nav-user-pill">Admin</span>}
                {!isAdmin && (
                  <span className="home-nav-user-pill">{user.email}</span>
                )}
                    <button
                      type="button"
                  className="home-nav-link"
                  onClick={() => supabase.auth.signOut()}
                    >
                  Log out
                    </button>
                </>
              ) : (
                <>
                <button
                  type="button"
                  className="home-nav-link"
                  onClick={() => setAuthView("login")}
                >
                  Log in
                </button>
                <button
                  type="button"
                  className="home-nav-cta"
                  onClick={() => setAuthView("signup")}
                >
                  Sign up
                </button>
              </>
            )}
          </nav>
        </header>

        <main className="home-main">
          <section className="home-hero">
            <div className="home-hero-inner">
              <p className="home-hero-kicker">Harada-inspired goal OS</p>

              <h1 className="home-hero-title">
                Don&apos;t let dreams stay in your dreams
              </h1>

              <p className="home-hero-subtitle">
                Turn your biggest goals into a clear, actionable plan. One goal,
                8 pillars, 64 actions—all in one place, powered by AI to help you
                get started in minutes.
              </p>

              {/* AI highlight */}
              <div className="home-hero-ai-card">
                <span className="ai-pill">NEW</span>
                <div className="home-hero-ai-text">
                  <p className="home-hero-ai-title">AI-assisted goal planning</p>
                  <p className="home-hero-ai-body">
                    Tell us your goal in one sentence and let AI draft pillars and
                    actions you can tweak in minutes.
                  </p>
                </div>
              </div>

              {/* Main CTAs */}
              <div className="home-hero-ctas">
                <button
                  type="button"
                  className="hero-primary-cta hero-primary-cta-large"
                  onClick={() => setAppView("builder")}
                >
                  Get started free
                </button>
                <button
                  type="button"
                  className="hero-secondary-cta hero-secondary-cta-large"
                  onClick={() =>
                    document
                      .getElementById("examples")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                >
                  View examples
                </button>
                <button
                  type="button"
                  className="hero-secondary-cta hero-secondary-cta-large hero-outline-cta"
                  onClick={() => setAppView("harada")}
                >
                  What is the Harada Method?
                </button>
              </div>

              {/* Scroll CTAs for Why / How */}
              <div className="home-hero-anchors">
                <button
                  type="button"
                  className="hero-anchor-btn"
                  onClick={() =>
                    document
                      .getElementById("why")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                >
                  Why Action Maps?
                </button>
                <button
                  type="button"
                  className="hero-anchor-btn"
                  onClick={() =>
                    document
                      .getElementById("how-it-works")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                >
                  How it works
                </button>
              </div>

              <p className="home-hero-meta">
                Free to try • No credit card required • Works in any browser
              </p>
            </div>
          </section>

          <section className="home-features" id="why">
            <h2 className="home-section-title">Why Action Maps?</h2>
            <p className="home-section-subtitle">
              Old-school planning templates, updated for how you actually work.
            </p>
            <div className="home-feature-grid">
              <article className="home-feature-card">
                <h3>See the whole map</h3>
                <p>
                  The 8 × 8 grid shows how every action ladders up to your main
                  goal, instead of being scattered across tools.
                </p>
              </article>
              <article className="home-feature-card">
                <h3>Everything in one place</h3>
                <p>
                  Goals, pillars, actions, and progress all live together. No
                  more bouncing between docs, kanban boards, and calendars.
                </p>
              </article>
              <article className="home-feature-card">
                <h3>Built for product brains</h3>
                <p>
                  Treat pillars like themes and actions like tickets. Use View
                  mode as your daily control panel.
                </p>
              </article>
            </div>
          </section>

          <section className="home-how" id="how-it-works">
            <h2 className="home-section-title">How it works</h2>
            <p className="home-section-subtitle">
              Borrowed from the Harada Method, tuned for modern workflows.
            </p>
            <ol className="home-how-grid">
              <li className="home-how-step">
                <h3>1. Set your one big goal</h3>
                <p>
                  Drop your north star in the center. Think outcomes, not tasks.
                </p>
              </li>
              <li className="home-how-step">
                <h3>2. Define 8 pillars</h3>
                <p>
                  Choose the key areas that must move for this goal to happen
                  (product, health, finances, relationships, etc.).
                </p>
              </li>
              <li className="home-how-step">
                <h3>3. Map 64 actions</h3>
                <p>
                  Add up to 8 concrete actions per pillar. Small enough to do,
                  big enough to matter.
                </p>
              </li>
              <li className="home-how-step">
                <h3>4. Flip to View mode</h3>
                <p>
                  Use the traditional grid to track today. Tap actions to mark
                  them done and see your progress bar move.
                </p>
              </li>
            </ol>
          </section>

          <section className="home-examples" id="examples">
            <h2 className="home-section-title">Examples</h2>
            <p className="home-section-subtitle">
              See Action Maps in View mode for real-world goals.
            </p>

            <div className="examples-toggle">
                    <button
                      type="button"
                className={
                  "examples-toggle-btn" +
                  (exampleId === "career" ? " examples-toggle-btn-active" : "")
                }
                onClick={() => handleExampleChange("career")}
              >
                Career change
                    </button>
              <button
                type="button"
                className={
                  "examples-toggle-btn" +
                  (exampleId === "sidebiz" ? " examples-toggle-btn-active" : "")
                }
                onClick={() => handleExampleChange("sidebiz")}
              >
                Launch a side project
              </button>
              <button
                type="button"
                className={
                  "examples-toggle-btn" +
                  (exampleId === "wellbeing"
                    ? " examples-toggle-btn-active"
                    : "")
                }
                onClick={() => handleExampleChange("wellbeing")}
              >
                Wellbeing reset
              </button>
            </div>

            <div className="examples-grid-shell">
              <TraditionalGrid
                state={exampleState}
                collapsedPillars={Array(8).fill(false)}
                onTogglePillar={() => {}}
                progressForDay={[]}
                onToggleTask={() => {}}
              />
          </div>
        </section>
      </main>

        <AuthModal
          authView={authView}
          onClose={() => setAuthView(null)}
          onSwitchView={(view) => setAuthView(view)}
        />

        <footer className="home-footer">
          <p>
            Built for humans who like grids. Not affiliated with the official
            Harada Method.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;
