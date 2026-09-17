import { describe, expect, it } from "vitest";
import { adminFollowupUpdateSchema, adminPromptOverrideSchema, adminReviewSchema, memoryUnitSchema } from "./validation";

describe("Phase 5 administrator boundaries", () => {
  it("requires an edited follow-up to contain one short question", () => {
    expect(adminFollowupUpdateSchema.safeParse({ action: "EDIT" }).success).toBe(false);
    expect(adminFollowupUpdateSchema.safeParse({ action: "EDIT", question: "你还记得那个画面吗？" }).success).toBe(true);
  });

  it("keeps administrator memory-unit revisions inside the same no-invention schema", () => {
    const result = memoryUnitSchema.safeParse({ title: "一件事", summary: "原始内容", original_quote: "原话", time_text: null, age_text: null, age_inferred: false, people: [], places: [], events: [], roles: [], objects: [], emotions_explicit: [], emotions_inferred: [], themes: [], story_maturity: "S1_FACT", memory_type: "SMALL_MEMORY", privacy_level: "P0_PRIVATE", unresolved_clues: [], recommended_followup: null, followup_priority: 0, sensitive: false });
    expect(result.success).toBe(true);
  });

  it("limits an administrative next-day prompt to the seven-day study", () => {
    expect(adminPromptOverrideSchema.safeParse({ day: 8, title: "题目", promptText: "内容", guidanceText: "引导" }).success).toBe(false);
    expect(adminPromptOverrideSchema.safeParse({ day: 2, title: "题目", promptText: "内容", guidanceText: "引导" }).success).toBe(true);
  });

  it("records review flags and bounded manual handling time", () => {
    expect(adminReviewSchema.safeParse({ memoryUnitId: null, aiError: false, hallucination: true, overInterpretation: false, duplicateQuestion: false, manualMinutes: 12, notes: "需要删去没有依据的地点。" }).success).toBe(true);
    expect(adminReviewSchema.safeParse({ memoryUnitId: null, aiError: false, hallucination: false, overInterpretation: false, duplicateQuestion: false, manualMinutes: 241, notes: null }).success).toBe(false);
  });
});
