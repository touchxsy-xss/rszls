import { describe, expect, it } from "vitest";
import { RuleBasedProvider, decideFollowup } from "./ai";
import { memoryUnitSchema } from "./validation";

describe("phase 3 AI safety rules", () => {
  it("fallback preserves user wording without inventing facts", async () => {
    const unit = await new RuleBasedProvider().extract({ text: "我记得一张旧照片。", transcript: null, audioAssetCount: 0, imageAssetCount: 1, videoAssetCount: 0 });
    const parsed = memoryUnitSchema.parse(unit);
    expect(parsed.summary).toBe("我记得一张旧照片。");
    expect(parsed.people).toEqual([]);
    expect(parsed.time_text).toBeNull();
    expect(parsed.emotions_inferred).toEqual([]);
  });

  it("stops followup for sensitive or high emotion content", () => {
    const decision = decideFollowup(memoryUnitSchema.parse({ title: "一段经历", summary: "内容", original_quote: "内容", time_text: null, age_text: null, age_inferred: false, people: [], places: [], events: [], roles: [], objects: [], emotions_explicit: ["难过"], emotions_inferred: [], themes: [], story_maturity: "S3_EMOTIONAL_STORY", memory_type: "SENSITIVE_MEMORY", privacy_level: "P0_PRIVATE", unresolved_clues: ["细节"], recommended_followup: "还记得什么？", followup_priority: 0.9, sensitive: true }));
    expect(decision.should_follow_up).toBe(false);
    expect(decision.follow_up_question).toBeNull();
  });

  it("allows at most one low-risk natural question", () => {
    const decision = decideFollowup(memoryUnitSchema.parse({ title: "一件小事", summary: "足够长的内容", original_quote: "足够长的内容", time_text: null, age_text: null, age_inferred: false, people: [], places: [], events: [], roles: [], objects: [], emotions_explicit: [], emotions_inferred: [], themes: [], story_maturity: "S2_STORY", memory_type: "SMALL_MEMORY", privacy_level: "P0_PRIVATE", unresolved_clues: [], recommended_followup: "你还记得哪个画面？", followup_priority: 0.5, sensitive: false }));
    expect(decision.should_follow_up).toBe(true);
    expect(decision.follow_up_question).toBe("你还记得哪个画面？");
  });
});
