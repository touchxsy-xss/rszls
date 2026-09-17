import { z } from "zod";

export const inviteSchema = z.object({
  inviteCode: z.string().trim().toUpperCase().regex(/^[A-Z]\d{4}$/, "邀请码格式不正确。"),
});

export const pinSchema = z.object({
  inviteCode: z.string().trim().toUpperCase().regex(/^[A-Z]\d{4}$/),
  pin: z.string().regex(/^\d{4}$/, "请输入 4 位数字 PIN。"),
  mode: z.enum(["set", "verify"]),
  displayName: z.string().trim().min(1).max(40).optional(),
  birthYear: z.number().int().min(1900).max(new Date().getFullYear()).nullable().optional(),
  city: z.string().trim().max(80).nullable().optional(),
  consent: z.boolean().optional(),
});

export const adminLoginSchema = z.object({
  password: z.string().min(1).max(200),
});

export const createSessionSchema = z.object({
  mode: z.enum(["DAILY", "FREE"]),
});

export const responseTextSchema = z.object({
  sessionId: z.string().uuid(),
  text: z.string().trim().min(1, "先写下一些内容再保存。").max(30000),
});

export const memoryUnitSchema = z.object({
  title: z.string().min(1).max(120),
  summary: z.string().min(1).max(2000),
  original_quote: z.string().max(500),
  time_text: z.string().max(120).nullable(),
  age_text: z.string().max(120).nullable(),
  age_inferred: z.boolean(),
  people: z.array(z.object({ name: z.string().min(1).max(80), relation: z.string().max(80).nullable() })).max(30),
  places: z.array(z.object({ name: z.string().min(1).max(120) })).max(30),
  events: z.array(z.string().min(1).max(160)).max(30),
  roles: z.array(z.string().min(1).max(80)).max(20),
  objects: z.array(z.string().min(1).max(120)).max(30),
  emotions_explicit: z.array(z.string().min(1).max(80)).max(20),
  emotions_inferred: z.array(z.string().min(1).max(80)).max(20),
  themes: z.array(z.string().min(1).max(80)).max(20),
  story_maturity: z.enum(["S0_CLUE", "S1_FACT", "S2_STORY", "S3_EMOTIONAL_STORY", "S4_READY_FOR_WORK"]),
  memory_type: z.enum(["LIFE_SKELETON", "SMALL_MEMORY", "CORE_STORY", "FAMILY_LEGACY", "SENSITIVE_MEMORY"]),
  privacy_level: z.enum(["P0_PRIVATE", "P1_PERSONAL_ARCHIVE", "P2_FAMILY_READY", "P3_PUBLIC_READY"]),
  unresolved_clues: z.array(z.string().min(1).max(200)).max(10),
  recommended_followup: z.string().max(240).nullable(),
  followup_priority: z.number().min(0).max(1),
  sensitive: z.boolean(),
});

export const processResponseSchema = z.object({
  responseId: z.string().uuid(),
});

export const followupAnswerSchema = z.object({
  text: z.string().trim().min(1, "先说一点，再决定要不要继续。").max(30000),
});

export const memoryCardUpdateSchema = z.object({
  title: z.string().trim().min(1, "请保留一个标题。").max(120),
  story: z.string().trim().min(1, "请保留这段记忆的内容。").max(500),
  privacyLevel: z.enum(["P0_PRIVATE", "P1_PERSONAL_ARCHIVE"]),
});

export const memoryCardFeedbackSchema = z.object({
  rating: z.enum(["VERY_LIKE_ME", "MOSTLY_LIKE_ME", "NOT_MUCH_LIKE_ME", "FACTUAL_ERROR"]),
});

export const adminMemoryUnitUpdateSchema = memoryUnitSchema;

export const adminFollowupUpdateSchema = z.object({
  action: z.enum(["ADOPT", "EDIT", "DISMISS"]),
  question: z.string().trim().min(1, "请保留一个自然的追问。").max(240).optional(),
}).superRefine((value, context) => {
  if (value.action === "EDIT" && !value.question) context.addIssue({ code: z.ZodIssueCode.custom, message: "修改追问时请输入问题。", path: ["question"] });
});

export const adminReviewSchema = z.object({
  memoryUnitId: z.string().uuid().nullable(),
  aiError: z.boolean(),
  hallucination: z.boolean(),
  overInterpretation: z.boolean(),
  duplicateQuestion: z.boolean(),
  manualMinutes: z.number().min(0).max(240).nullable(),
  notes: z.string().trim().max(2000).nullable(),
});

export const adminPromptOverrideSchema = z.object({
  day: z.number().int().min(1).max(7),
  title: z.string().trim().min(1).max(120),
  promptText: z.string().trim().min(1).max(1000),
  guidanceText: z.string().trim().min(1).max(500),
});

export const day7WorkSchema = z.object({
  title: z.string().trim().min(1).max(120),
  intro: z.string().trim().min(1).max(500),
  closing: z.string().trim().min(1).max(500),
  cardIds: z.array(z.string().uuid()).min(5, "至少选择 5 段已确认的记忆。").max(7, "最多选择 7 段记忆。"),
});
