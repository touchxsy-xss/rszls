import type { MemoryUnit } from "./ai";

export type MemoryCardDraft = {
  title: string;
  story: string;
  originalQuote: string;
  timeLabel: string | null;
  privacyLevel: "P0_PRIVATE" | "P1_PERSONAL_ARCHIVE";
};

function normalize(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function buildMemoryCardDraft(memory: MemoryUnit): MemoryCardDraft {
  // The card is a presentation of the validated unit, never a second invented narrative.
  return {
    title: normalize(memory.title).slice(0, 120),
    story: normalize(memory.summary).slice(0, 500),
    originalQuote: normalize(memory.original_quote).slice(0, 500),
    timeLabel: memory.time_text ?? memory.age_text,
    privacyLevel: memory.privacy_level === "P1_PERSONAL_ARCHIVE" ? "P1_PERSONAL_ARCHIVE" : "P0_PRIVATE",
  };
}

export function privacyLabel(level: "P0_PRIVATE" | "P1_PERSONAL_ARCHIVE") {
  return level === "P1_PERSONAL_ARCHIVE" ? "可进入未来作品" : "这段只给自己";
}
