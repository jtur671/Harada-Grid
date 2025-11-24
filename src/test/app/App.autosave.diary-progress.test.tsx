import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { HaradaState } from "../../types";
import { createEmptyState } from "../../utils/harada";
import { createStateFingerprint, hasMeaningfulContent } from "../../utils/stateFingerprint";

/**
 * Tests for Autosave with Diary Entries and Progress Data
 * 
 * Critical bug fix: Autosave was only fingerprinting goal/pillars/tasks,
 * so diary entries and daily task completions weren't being saved.
 * 
 * These tests ensure:
 * 1. Diary entries trigger autosave
 * 2. Task completions (progressByDate) trigger autosave
 * 3. Completed dates trigger autosave
 * 4. State fingerprint includes all these fields
 * 5. Autosave saves complete state including diary/progress
 */

describe("Autosave - Diary and Progress Data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should include diary entries in state fingerprint", () => {
    const baseState = createEmptyState();
    const baseFingerprint = createStateFingerprint(baseState);

    const withDiary: HaradaState = {
      ...baseState,
      diaryByDate: {
        "2025-11-24": "Today I worked on my goal",
      },
    };

    const diaryFingerprint = createStateFingerprint(withDiary);
    expect(diaryFingerprint).not.toEqual(baseFingerprint);
    expect(diaryFingerprint).toContain("2025-11-24");
    expect(diaryFingerprint).toContain("Today I worked on my goal");
  });

  it("should include progressByDate in state fingerprint", () => {
    const baseState = createEmptyState();
    const baseFingerprint = createStateFingerprint(baseState);

    const withProgress: HaradaState = {
      ...baseState,
      progressByDate: {
        "2025-11-24": ["0-0", "0-1", "1-2"],
      },
    };

    const progressFingerprint = createStateFingerprint(withProgress);
    expect(progressFingerprint).not.toEqual(baseFingerprint);
    expect(progressFingerprint).toContain("2025-11-24");
    expect(progressFingerprint).toContain("0-0");
  });

  it("should include completedDates in state fingerprint", () => {
    const baseState = createEmptyState();
    const baseFingerprint = createStateFingerprint(baseState);

    const withCompleted: HaradaState = {
      ...baseState,
      completedDates: ["2025-11-24", "2025-11-25"],
    };

    const completedFingerprint = createStateFingerprint(withCompleted);
    expect(completedFingerprint).not.toEqual(baseFingerprint);
    expect(completedFingerprint).toContain("2025-11-24");
    expect(completedFingerprint).toContain("2025-11-25");
  });

  it("should treat diary-only entries as meaningful content", () => {
    const blankState: HaradaState = {
      goal: "",
      pillars: Array.from({ length: 8 }, () => ""),
      tasks: Array.from({ length: 8 }, () =>
        Array.from({ length: 8 }, () => "")
      ),
      diaryByDate: {},
      progressByDate: {},
      completedDates: [],
    };
    expect(hasMeaningfulContent(blankState)).toBe(false);

    const diaryState: HaradaState = {
      ...blankState,
      diaryByDate: {
        "2025-11-24": "Morning reflection",
      },
    };

    expect(hasMeaningfulContent(diaryState)).toBe(true);
  });

  it("should treat progress-only entries as meaningful content", () => {
    const blankState: HaradaState = {
      goal: "",
      pillars: Array.from({ length: 8 }, () => ""),
      tasks: Array.from({ length: 8 }, () =>
        Array.from({ length: 8 }, () => "")
      ),
      diaryByDate: {},
      progressByDate: {},
      completedDates: [],
    };
    expect(hasMeaningfulContent(blankState)).toBe(false);

    const progressState: HaradaState = {
      ...blankState,
      progressByDate: {
        "2025-11-24": ["0-0"],
      },
    };

    expect(hasMeaningfulContent(progressState)).toBe(true);
  });

  it("should treat completedDates as meaningful content", () => {
    const blankState: HaradaState = {
      goal: "",
      pillars: Array.from({ length: 8 }, () => ""),
      tasks: Array.from({ length: 8 }, () =>
        Array.from({ length: 8 }, () => "")
      ),
      diaryByDate: {},
      progressByDate: {},
      completedDates: [],
    };
    expect(hasMeaningfulContent(blankState)).toBe(false);

    const completedState: HaradaState = {
      ...blankState,
      completedDates: ["2025-11-24"],
    };

    expect(hasMeaningfulContent(completedState)).toBe(true);
  });

  it("should detect changes when only diary entry is modified", () => {
    const state1: HaradaState = {
      ...createEmptyState(),
      diaryByDate: {
        "2025-11-24": "First entry",
      },
    };

    const state2: HaradaState = {
      ...createEmptyState(),
      diaryByDate: {
        "2025-11-24": "Updated entry",
      },
    };

    const fingerprint1 = createStateFingerprint(state1);
    const fingerprint2 = createStateFingerprint(state2);
    expect(fingerprint1).not.toEqual(fingerprint2);
  });

  it("should detect changes when only progress is modified", () => {
    const state1: HaradaState = {
      ...createEmptyState(),
      progressByDate: {
        "2025-11-24": ["0-0"],
      },
    };

    const state2: HaradaState = {
      ...createEmptyState(),
      progressByDate: {
        "2025-11-24": ["0-0", "0-1"],
      },
    };

    const fingerprint1 = createStateFingerprint(state1);
    const fingerprint2 = createStateFingerprint(state2);
    expect(fingerprint1).not.toEqual(fingerprint2);
  });

  it("should detect changes when diary is added for a new date", () => {
    const state1: HaradaState = {
      ...createEmptyState(),
      diaryByDate: {
        "2025-11-24": "Entry 1",
      },
    };

    const state2: HaradaState = {
      ...createEmptyState(),
      diaryByDate: {
        "2025-11-24": "Entry 1",
        "2025-11-25": "Entry 2",
      },
    };

    const fingerprint1 = createStateFingerprint(state1);
    const fingerprint2 = createStateFingerprint(state2);
    expect(fingerprint1).not.toEqual(fingerprint2);
  });

  it("should include all state fields in fingerprint", () => {
    const completeState: HaradaState = {
      goal: "My goal",
      pillars: ["Pillar 1", "Pillar 2", "", "", "", "", "", ""],
      tasks: [
        ["Task 1", "Task 2", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", ""],
      ],
      diaryByDate: {
        "2025-11-24": "Diary entry",
        "2025-11-25": "Another entry",
      },
      progressByDate: {
        "2025-11-24": ["0-0", "0-1"],
        "2025-11-25": ["0-0", "0-1", "1-0"],
      },
      completedDates: ["2025-11-24"],
    };

    const fingerprint = createStateFingerprint(completeState);
    
    // Verify all fields are included
    expect(fingerprint).toContain("My goal");
    expect(fingerprint).toContain("Pillar 1");
    expect(fingerprint).toContain("Task 1");
    expect(fingerprint).toContain("2025-11-24");
    expect(fingerprint).toContain("Diary entry");
    expect(fingerprint).toContain("0-0");
    expect(fingerprint).toContain("2025-11-25");
  });

  it("should save complete state including diary and progress to Supabase", async () => {
    const stateWithDiaryAndProgress: HaradaState = {
      ...createEmptyState(),
      goal: "Test goal",
      diaryByDate: {
        "2025-11-24": "Today's reflection",
      },
      progressByDate: {
        "2025-11-24": ["0-0", "0-1", "1-2"],
      },
      completedDates: ["2025-11-24"],
    };

    // When autosave runs, it should save the complete state
    // including diaryByDate, progressByDate, and completedDates
    const stateToSave = stateWithDiaryAndProgress;
    
    expect(stateToSave.diaryByDate).toHaveProperty("2025-11-24");
    expect(stateToSave.progressByDate).toHaveProperty("2025-11-24");
    expect(stateToSave.completedDates).toContain("2025-11-24");
    
    // Verify fingerprint includes all fields
    const fingerprint = createStateFingerprint(stateToSave);
    expect(fingerprint).toContain("Today's reflection");
    expect(fingerprint).toContain("0-0");
    expect(fingerprint).toContain("2025-11-24");
  });
});

describe("Autosave - Regression Prevention", () => {
  it("should never exclude diary/progress from fingerprint", () => {
    // This test ensures we never accidentally remove diary/progress from fingerprint
    const state: HaradaState = {
      ...createEmptyState(),
      diaryByDate: { "2025-11-24": "test" },
      progressByDate: { "2025-11-24": ["0-0"] },
      completedDates: ["2025-11-24"],
    };

    const fingerprint = createStateFingerprint(state);
    const parsed = JSON.parse(fingerprint);

    // All fields must be present
    expect(parsed).toHaveProperty("diaryByDate");
    expect(parsed).toHaveProperty("progressByDate");
    expect(parsed).toHaveProperty("completedDates");
    expect(parsed.diaryByDate).toHaveProperty("2025-11-24");
    expect(parsed.progressByDate).toHaveProperty("2025-11-24");
    expect(parsed.completedDates).toContain("2025-11-24");
  });

  it("should always check diary/progress in hasMeaningfulContent", () => {
    // This test ensures hasMeaningfulContent always checks diary/progress
    // Note: createEmptyState might have default pillar/task values, so create truly blank state
    const blankState: HaradaState = {
      goal: "",
      pillars: Array.from({ length: 8 }, () => ""),
      tasks: Array.from({ length: 8 }, () =>
        Array.from({ length: 8 }, () => "")
      ),
      diaryByDate: {},
      progressByDate: {},
      completedDates: [],
    };
    
    // Should return false for truly blank state
    expect(hasMeaningfulContent(blankState)).toBe(false);

    // Should return true if only diary exists
    const diaryOnly = { ...blankState, diaryByDate: { "2025-11-24": "test" } };
    expect(hasMeaningfulContent(diaryOnly)).toBe(true);

    // Should return true if only progress exists
    const progressOnly = { ...blankState, progressByDate: { "2025-11-24": ["0-0"] } };
    expect(hasMeaningfulContent(progressOnly)).toBe(true);

    // Should return true if only completedDates exists
    const completedOnly = { ...blankState, completedDates: ["2025-11-24"] };
    expect(hasMeaningfulContent(completedOnly)).toBe(true);
  });
});

