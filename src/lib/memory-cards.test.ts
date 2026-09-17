import { describe, expect, it } from "vitest";
import { memoryUnitSchema } from "./validation";
import { buildMemoryCardDraft, privacyLabel } from "./memory-cards";

describe("memory card draft", () => {
  it("only presents validated memory-unit fields without expanding facts", () => {
    const memory = memoryUnitSchema.parse({ title: "院子里的棋", summary: "我记得小时候在院子里和爷爷下棋。", original_quote: "小时候和爷爷下棋。", time_text: "小时候", age_text: null, age_inferred: false, people: [], places: [], events: [], roles: [], objects: [], emotions_explicit: [], emotions_inferred: [], themes: [], story_maturity: "S1_FACT", memory_type: "SMALL_MEMORY", privacy_level: "P0_PRIVATE", unresolved_clues: [], recommended_followup: null, followup_priority: 0, sensitive: false });
    expect(buildMemoryCardDraft(memory)).toEqual({ title: "院子里的棋", story: "我记得小时候在院子里和爷爷下棋。", originalQuote: "小时候和爷爷下棋。", timeLabel: "小时候", privacyLevel: "P0_PRIVATE" });
  });

  it("only exposes the two V0.1 privacy choices", () => {
    expect(privacyLabel("P0_PRIVATE")).toBe("这段只给自己");
    expect(privacyLabel("P1_PERSONAL_ARCHIVE")).toBe("可进入未来作品");
  });

  it("caps a card story at the PRD upper bound", () => {
    const memory = memoryUnitSchema.parse({ title: "长故事", summary: "甲".repeat(520), original_quote: "原话", time_text: null, age_text: null, age_inferred: false, people: [], places: [], events: [], roles: [], objects: [], emotions_explicit: [], emotions_inferred: [], themes: [], story_maturity: "S2_STORY", memory_type: "SMALL_MEMORY", privacy_level: "P0_PRIVATE", unresolved_clues: [], recommended_followup: null, followup_priority: 0, sensitive: false });
    expect(buildMemoryCardDraft(memory).story).toHaveLength(500);
  });
});
