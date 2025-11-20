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
import { supabase } from "./supabaseClient";
import type { User } from "@supabase/supabase-js";

type AppView = "home" | "builder" | "harada";
type AuthView = "login" | "signup" | null;

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
  const [viewMode, setViewMode] = useState<"map" | "grid">("map");
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

  const [exampleId, setExampleId] = useState<ExampleId>("career");
  const [exampleState, setExampleState] = useState<HaradaState>(() =>
    buildExampleState("career")
  );

  const [appView, setAppView] = useState<AppView>("home");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authView, setAuthView] = useState<AuthView>(null);
  const [user, setUser] = useState<User | null>(null);

  const handleExampleChange = (id: ExampleId) => {
    setExampleId(id);
    setExampleState(buildExampleState(id));
  };

  const handleUiLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setIsLoggedIn(false);
    }
  };

  useEffect(() => {
    saveState(state);
  }, [state]);

  // Load current session + watch for changes
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setUser(data.session?.user ?? null);
      } catch (error) {
        console.error("Error loading session:", error);
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
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

  useEffect(() => {
    setIsLoggedIn(!!user);
  }, [user]);

  // Auto-save grid to Supabase for logged-in users
  useEffect(() => {
    if (!user) return;

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

  const authOverlay = authView ? (
    <div className="auth-overlay" role="dialog" aria-modal="true">
      <div className="auth-card">
            <button
              type="button"
          className="auth-close"
          aria-label="Close"
          onClick={() => setAuthView(null)}
        >
          ×
            </button>

        {authView === "login" ? (
          <>
            <h2 className="auth-title">Log in</h2>
            <p className="auth-subtitle">
              Use your email and password. (Email magic handled by Supabase.)
            </p>

            <form
              className="auth-form"
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const email = (formData.get("email") as string)?.trim();
                const password = (formData.get("password") as string)?.trim();
                if (!email || !password) return;

                const { error } = await supabase.auth.signInWithPassword({
                  email,
                  password,
                });

                if (!error) {
                  setAuthView(null);
                } else {
                  console.error(error.message);
                }
              }}
            >
              <label className="auth-field">
                <span>Email</span>
                <input name="email" type="email" required autoComplete="email" />
              </label>

              <label className="auth-field">
                <span>Password</span>
                <input
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                />
              </label>

              <button type="submit" className="auth-submit">
                Log in
            </button>

            <button
              type="button"
                className="auth-switch"
                onClick={() => setAuthView("signup")}
            >
                Need an account? Sign up
            </button>
            </form>
          </>
        ) : (
          <>
            <h2 className="auth-title">Sign up</h2>
            <p className="auth-subtitle">
              Create an Action Maps account. You&apos;ll be able to save your grid.
            </p>

            <form
              className="auth-form"
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const email = (formData.get("email") as string)?.trim();
                const password = (formData.get("password") as string)?.trim();
                const confirm = (formData.get("confirm") as string)?.trim();
                if (!email || !password || password !== confirm) return;

                const { error } = await supabase.auth.signUp({
                  email,
                  password,
                });

                if (!error) {
                  setAuthView(null);
                } else {
                  console.error(error.message);
                }
              }}
            >
              <label className="auth-field">
                <span>Email</span>
                <input name="email" type="email" required autoComplete="email" />
              </label>

              <label className="auth-field">
                <span>Password</span>
                <input
                  name="password"
                  type="password"
                  required
                  autoComplete="new-password"
                />
              </label>

              <label className="auth-field">
                <span>Confirm password</span>
                <input
                  name="confirm"
                  type="password"
                  required
                  autoComplete="new-password"
                />
              </label>

              <button type="submit" className="auth-submit">
                Create account
                </button>

                <button
                  type="button"
                className="auth-switch"
                onClick={() => setAuthView("login")}
                >
                Already have an account? Log in
                </button>
            </form>
          </>
        )}
      </div>
    </div>
  ) : null;

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

              {isLoggedIn ? (
              <button
                type="button"
                  className="home-nav-link"
                  onClick={handleUiLogout}
                >
                  Log out
              </button>
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
                  <span>Changes will be saved to your account.</span>
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

          {authOverlay}
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
            {isLoggedIn ? (
              <button
                type="button"
                  className="home-nav-link"
                onClick={handleUiLogout}
              >
                  Log out
              </button>
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
                Transform your goals
                <br />
                into Action Maps.
              </h1>

              <p className="home-hero-subtitle">
                Break down ambitious goals into 64 specific, trackable actions
                using a modern take on the Harada Method—powered by AI templates
                to help you get unstuck.
              </p>

              <div className="home-hero-ai-badge">
                <span className="ai-pill">NEW</span>
                <span>AI-assisted goal planning built into every map.</span>
              </div>

              <div className="home-hero-ctas">
                <button
                  type="button"
                  className="hero-primary-cta"
                  onClick={() => setAppView("builder")}
                >
                  Get started free
                </button>
                <button
                  type="button"
                  className="hero-secondary-cta"
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
                  className="hero-secondary-cta hero-outline-cta"
                  onClick={() => setAppView("harada")}
                >
                  What is the Harada Method?
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

        {authOverlay}

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
