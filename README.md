# Harada Grid – Local Goal Planner

A local-first goal-setting app that digitizes the **Harada Method**: one big goal, 8 pillars, 8 actions each, and a daily diary.

This project replaces the default Vite/React README with a focused explanation of how the app works and how to run it.

---

## 🧠 What is this?

The Harada Method is a Japanese goal-setting technique that takes:

* **1 big goal**
* **8 supporting pillars**
* **8 small actions per pillar**

…and lays them out in a 64-cell grid. This app turns that system into a simple, local web app with:

* An **Edit** view for designing your Harada grid
* A **View** (traditional) view that looks like the classic 9×9 Harada sheet
* A **Daily Diary** and **history** so you can track what actually happened

All data is stored in **localStorage**. No backend, no sync, no accounts—just your browser.

---

## ✨ Core Features

### 1. Goal + Pillar Editor (Edit mode)

* Define your **main goal** in the center “Goal” card.
* Create **8 pillars** (e.g., “Health”, “Career Shift”, “Finances”…).
* For each pillar, add **8 concrete actions** (daily/regular habits).
* UI is optimised for editing:

  * Pillar cards across the top
  * A detail panel showing the 8 actions for the selected pillar

### 2. Traditional Harada Grid (View mode)

* Renders a **9×9 grid** with:

  * Center cell = Main Goal
  * 8 black pillar cells around the center
  * 64 action cells on the outer ring
* Behaviors:

  * **Click a pillar** to collapse/expand its block (for a cleaner view).
  * **Click an action** to toggle it as **Done** for today.

    * Done actions turn green and appear in your daily progress.

### 3. Daily Progress Bar

* In View mode, a progress section shows:

  * `completed / total` defined actions for today
  * A progress bar that fills as you check off tasks
  * 8 small pillar dots that light up when all actions for that pillar are done

### 4. Daily Diary + History

* Each day has:

  * A **diary entry** (free-form text)
  * **Action checkmarks** (which actions were done)
* A **Diary History** section:

  * Shows past days with a summary:

    * `Completed full grid`
    * `Completed X actions`
    * `No actions completed`
  * Each day can be expanded to read the diary entry.
  * Older entries are grouped and can be expanded/collapsed.

### 5. Templates

* **Templates** button in Edit mode:

  * Open a modal with a set of predefined goal systems.
  * Applying a template:

    * Overwrites **goal, pillars, and actions**.
    * Keeps **diary entries and completion history**.

### 6. AI Templates (stub)

* **Templates (AI)** button in Edit mode:

  * Opens a modal with a text box for your main goal.
  * Currently logs the goal to the console as a placeholder.
  * Intended to be wired up to the OpenAI API later to auto-generate pillars and actions.

### 7. Reset All

* **Reset All** button in Edit mode:

  * Opens a confirmation modal.
  * Clears:

    * Main goal
    * Pillars & actions
    * Diary entries
    * Progress/completion history

### 8. Export / Print (Traditional View)

* **Export / Print** button (View mode only):

  * Uses a print-optimized layout:

    * **Page 1:** Daily Diary & history
    * **Page 2:** Full Harada grid on its own page
  * Completed actions are clearly visible:

    * Green background
    * A ✓ checkmark added before the text

---

## 🛠 Tech Stack

* **React** (TypeScript)
* **Vite** (build tooling + dev server)
* **LocalStorage** for persistence
* **Plain CSS** (no Tailwind/Chakra/etc.)
* No backend, no auth, no external DBs

---

## 🚀 Getting Started

### 1. Install dependencies

```bash
npm install
# or
pnpm install
# or
yarn
```

### 2. Run the dev server

```bash
npm run dev
```

Open the URL printed in your terminal (usually `http://localhost:5173/`).

### 3. Build for production

```bash
npm run build
```

To preview the built app:

```bash
npm run preview
```

---

## 📁 Project Structure (simplified)

```text
src/
  App.tsx                # Main app component (Edit + View modes, state)
  main.tsx               # Vite entry point
  index.css              # Global styles (app + grid + print layout)
  templates.ts           # Built-in Harada templates

  types.ts               # Shared TypeScript types (HaradaState, etc.)

  utils/
    date.ts              # Date helpers (todayISO, formatting)
    harada.ts            # State helpers (load/save localStorage, task IDs, etc.)
    print.ts             # Helper to trigger print with a special body class

  components/
    TraditionalGrid.tsx  # 9×9 Harada grid rendering (View mode)
```

---

## 🧭 Future Ideas

* Wire **AI Templates** to OpenAI to auto-generate pillars/actions.
* Add **multiple goal sheets** (work, fitness, personal, etc.).
* Export to **PDF** or **CSV**.
* Optional cloud sync (while keeping the local-first feel).

---

## License

This project started from the React + TypeScript + Vite template and was customized into a Harada Method planner.
You’re free to clone, fork, or adapt it for your own personal goal-tracking experiments.
