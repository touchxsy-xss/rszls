import { describe, expect, it } from "vitest";
import { buildDay7Draft, renderDay7Pdf } from "./day7";

const card = (index: number) => ({ id: `card-${index}`, response_id: `response-${index}`, memory_unit_id: `unit-${index}`, ai_title: `故事 ${index}`, ai_story: `只来自原始素材的故事 ${index}`, ai_original_quote: `原话 ${index}`, time_label: `时间 ${index}`, representative_media_id: null, privacy_level: "P1_PERSONAL_ARCHIVE" as const, user_title: null, user_story: null, created_at: "2026-09-12", updated_at: "2026-09-12", representative_asset_id: null, representative_asset_type: null });

describe("Day 7 work", () => {
  it("uses at most seven explicitly archived cards", () => {
    const draft = buildDay7Draft("创始人", Array.from({ length: 8 }, (_, index) => card(index)));
    expect(draft.cards).toHaveLength(7);
    expect(draft.intro).toContain("7 段记忆");
  });

  it("renders a non-empty PDF with a catalog and Chinese font", () => {
    const pdf = renderDay7Pdf(buildDay7Draft("创始人", [card(1)]));
    expect(pdf.subarray(0, 8).toString("binary")).toContain("%PDF-1.4");
    expect(pdf.toString("binary")).toContain("/STSong-Light");
    expect(pdf.length).toBeGreaterThan(500);
  });

  it("paginates a full seven-story work", () => {
    const pdf = renderDay7Pdf(buildDay7Draft("创始人", Array.from({ length: 7 }, (_, index) => card(index))));
    expect(pdf.toString("binary")).toContain("/Count 2");
  });
});
