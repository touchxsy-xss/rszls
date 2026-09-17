import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { toPlainObject } from "@/lib/records";

type UserRow = {
  id: string;
  invite_code: string;
  pin_hash: string | null;
  display_name: string;
  birth_year: number | null;
  city: string | null;
  roles: string;
  consent_at: string | null;
  experiment_day: number;
};

type PromptRow = {
  id: string;
  day_number: number;
  title: string;
  prompt_text: string;
  guidance_text: string;
};

export type SessionRow = {
  id: string;
  user_id: string;
  prompt_id: string | null;
  mode: "DAILY" | "FREE";
  started_at: string;
  ended_at: string | null;
  status: "OPEN" | "RAW_SAVED";
};

export type ResponseRow = {
  id: string;
  session_id: string;
  parent_response_id: string | null;
  text_input: string | null;
  transcript: string | null;
  created_at: string;
  updated_at: string;
  processing_status: "RAW" | "PROCESSING" | "COMPLETED" | "PENDING_PROVIDER" | "NEEDS_ADMIN_REVIEW";
  processing_error: string | null;
  ai_provider: string | null;
  ai_raw_output: string | null;
};

export type MemoryUnitRow = {
  id: string;
  response_id: string;
  version: number;
  source: "AI" | "ADMIN" | "USER";
  payload_json: string;
  created_at: string;
  updated_at: string;
};

export type FollowupRow = {
  id: string;
  response_id: string;
  question: string;
  status: "PENDING" | "ANSWERED" | "DISMISSED";
  answer_response_id: string | null;
  decision_json: string;
  created_at: string;
  updated_at: string;
};

export type MemoryCardRow = {
  id: string;
  response_id: string;
  memory_unit_id: string;
  ai_title: string;
  ai_story: string;
  ai_original_quote: string;
  time_label: string | null;
  representative_media_id: string | null;
  privacy_level: "P0_PRIVATE" | "P1_PERSONAL_ARCHIVE";
  user_title: string | null;
  user_story: string | null;
  created_at: string;
  updated_at: string;
};

export type MemoryCardFeedbackRow = {
  id: string;
  memory_card_id: string;
  rating: "VERY_LIKE_ME" | "MOSTLY_LIKE_ME" | "NOT_MUCH_LIKE_ME" | "FACTUAL_ERROR";
  created_at: string;
};

export type AdminReviewRow = {
  id: string;
  response_id: string;
  memory_unit_id: string | null;
  ai_error: number;
  hallucination: number;
  over_interpretation: number;
  duplicate_question: number;
  manual_minutes: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type MediaAssetRow = {
  id: string;
  response_id: string;
  user_id: string;
  type: "AUDIO" | "IMAGE" | "VIDEO";
  storage_key: string;
  original_file_name: string;
  mime_type: string;
  file_size: number;
  duration_seconds: number | null;
  created_at: string;
};

export type Day7WorkRow = {
  id: string;
  user_id: string;
  title: string;
  intro: string;
  closing: string;
  card_ids_json: string;
  generated_at: string;
  updated_at: string;
};

function databasePath() {
  const configured = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  if (!configured.startsWith("file:")) throw new Error("Phase 1 only supports a local SQLite DATABASE_URL.");
  return path.resolve(process.cwd(), configured.slice("file:".length));
}

const db = new DatabaseSync(databasePath());
db.exec("PRAGMA busy_timeout = 5000");

const prompts = [
  [1, "一张老照片", "找一张你看到以后会想起一些事情的老照片。这张照片是什么时候拍的？为什么你现在还留着它？", "想到多少说多少。"],
  [2, "小时候的家", "想一想你小时候住得最久的那个家。推门进去，你最先看到什么？", "不用一次讲完整。"],
  [3, "一个重要的人", "如果从你年轻时候认识的人里选一个今天还能再见一次的人，你会选谁？", "可以从一个小细节开始。"],
  [4, "第一次靠自己", "你第一次觉得“我已经可以靠自己了”，是什么时候？", "说起哪里都可以。"],
  [5, "一件舍不得丢的东西", "有没有一样东西，本身可能不值多少钱，但你一直舍不得扔？", "它为什么一直留在你身边？"],
  [6, "人生的一次转弯", "有没有一个当时看起来普通的决定，后来才发现改变了你的人生？", "不需要给这件事下结论。"],
  [7, "回看与作品", "如果以后你的家人翻到这些故事，你最希望他们知道关于你的什么？", "这是可选的结尾问题。"],
] as const;

const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      invite_code TEXT NOT NULL UNIQUE,
      pin_hash TEXT,
      display_name TEXT NOT NULL,
      birth_year INTEGER,
      city TEXT,
      roles TEXT NOT NULL,
      consent_at TEXT,
      experiment_day INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS daily_prompts (
      id TEXT PRIMARY KEY,
      day_number INTEGER NOT NULL UNIQUE,
      title TEXT NOT NULL,
      prompt_text TEXT NOT NULL,
      guidance_text TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'SYSTEM',
      active_date TEXT,
      overridden_by_admin INTEGER NOT NULL DEFAULT 0,
      overridden_by_user_id TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      prompt_id TEXT,
      mode TEXT NOT NULL DEFAULT 'DAILY',
      started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ended_at TEXT,
      status TEXT NOT NULL DEFAULT 'OPEN'
    );
    CREATE TABLE IF NOT EXISTS responses (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      parent_response_id TEXT,
      text_input TEXT,
      transcript TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      ,processing_status TEXT NOT NULL DEFAULT 'RAW'
      ,processing_error TEXT
      ,ai_provider TEXT
      ,ai_raw_output TEXT
    );
    CREATE TABLE IF NOT EXISTS memory_units (
      id TEXT PRIMARY KEY,
      response_id TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      source TEXT NOT NULL DEFAULT 'AI',
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS followups (
      id TEXT PRIMARY KEY,
      response_id TEXT NOT NULL,
      question TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      answer_response_id TEXT,
      decision_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS memory_cards (
      id TEXT PRIMARY KEY,
      response_id TEXT NOT NULL UNIQUE,
      memory_unit_id TEXT NOT NULL,
      ai_title TEXT NOT NULL,
      ai_story TEXT NOT NULL,
      ai_original_quote TEXT NOT NULL,
      time_label TEXT,
      representative_media_id TEXT,
      privacy_level TEXT NOT NULL DEFAULT 'P0_PRIVATE',
      user_title TEXT,
      user_story TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS memory_card_feedback (
      id TEXT PRIMARY KEY,
      memory_card_id TEXT NOT NULL,
      rating TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS analytics_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      session_id TEXT,
      event_name TEXT NOT NULL,
      metadata_json TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS media_assets (
      id TEXT PRIMARY KEY,
      response_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      storage_key TEXT NOT NULL UNIQUE,
      original_file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      duration_seconds REAL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      actor_id TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS admin_reviews (
      id TEXT PRIMARY KEY,
      response_id TEXT NOT NULL UNIQUE,
      memory_unit_id TEXT,
      ai_error INTEGER NOT NULL DEFAULT 0,
      hallucination INTEGER NOT NULL DEFAULT 0,
      over_interpretation INTEGER NOT NULL DEFAULT 0,
      duplicate_question INTEGER NOT NULL DEFAULT 0,
      manual_minutes REAL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS day7_works (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      intro TEXT NOT NULL,
      closing TEXT NOT NULL,
      card_ids_json TEXT NOT NULL,
      generated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
`;

export function initializeDatabase() {
  const expectedTables = ["users", "daily_prompts", "sessions", "responses", "media_assets", "admin_audit_logs", "admin_reviews", "day7_works", "memory_units", "followups", "memory_cards", "memory_card_feedback", "analytics_events"];
  const existingTables = db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (${expectedTables.map(() => "?").join(",")})`).all(...expectedTables) as Array<{ name: string }>;
  if (existingTables.length !== expectedTables.length) db.exec(schema);
  const sessionColumns = db.prepare("PRAGMA table_info(sessions)").all() as Array<{ name: string }>;
  if (!sessionColumns.some((column) => column.name === "mode")) db.exec("ALTER TABLE sessions ADD COLUMN mode TEXT NOT NULL DEFAULT 'DAILY'");
  const responseColumns = db.prepare("PRAGMA table_info(responses)").all() as Array<{ name: string }>;
  if (!responseColumns.some((column) => column.name === "processing_status")) db.exec("ALTER TABLE responses ADD COLUMN processing_status TEXT NOT NULL DEFAULT 'RAW'");
  if (!responseColumns.some((column) => column.name === "processing_error")) db.exec("ALTER TABLE responses ADD COLUMN processing_error TEXT");
  if (!responseColumns.some((column) => column.name === "ai_provider")) db.exec("ALTER TABLE responses ADD COLUMN ai_provider TEXT");
  if (!responseColumns.some((column) => column.name === "ai_raw_output")) db.exec("ALTER TABLE responses ADD COLUMN ai_raw_output TEXT");
  const seedUser = db.prepare("SELECT id FROM users WHERE invite_code = ?").get("F0001");
  if (!seedUser) db.prepare("INSERT INTO users (id, invite_code, display_name, roles, experiment_day) VALUES (?, ?, ?, ?, ?)").run("seed-f0001", "F0001", "创始人测试用户", "USER_ADMIN", 1);
  const promptCount = db.prepare("SELECT COUNT(*) AS count FROM daily_prompts").get() as { count: number };
  if (promptCount.count < prompts.length) {
    const statement = db.prepare("INSERT INTO daily_prompts (id, day_number, title, prompt_text, guidance_text) VALUES (?, ?, ?, ?, ?) ON CONFLICT(day_number) DO UPDATE SET title = excluded.title, prompt_text = excluded.prompt_text, guidance_text = excluded.guidance_text");
    for (const [day, title, promptText, guidanceText] of prompts) statement.run(`prompt-${day}`, day, title, promptText, guidanceText);
  }
}

initializeDatabase();

export function findUserByInvite(inviteCode: string) {
  return db.prepare("SELECT * FROM users WHERE invite_code = ?").get(inviteCode) as UserRow | undefined;
}

export function findUserById(id: string) {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
}

export function configureUser(user: UserRow, values: { pinHash: string; displayName: string; birthYear: number | null; city: string | null }) {
  db.prepare("UPDATE users SET pin_hash = ?, display_name = ?, birth_year = ?, city = ?, consent_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(values.pinHash, values.displayName, values.birthYear, values.city, new Date().toISOString(), user.id);
}

export function findPromptByDay(day: number) {
  return db.prepare("SELECT * FROM daily_prompts WHERE day_number = ?").get(day) as PromptRow | undefined;
}

export function listDailyPrompts() {
  return db.prepare("SELECT * FROM daily_prompts ORDER BY day_number ASC").all() as PromptRow[];
}

export function createSession(values: { id: string; userId: string; promptId: string | null; mode: "DAILY" | "FREE" }) {
  db.prepare("INSERT INTO sessions (id, user_id, prompt_id, mode) VALUES (?, ?, ?, ?)").run(values.id, values.userId, values.promptId, values.mode);
  return findSessionForUser(values.id, values.userId)!;
}

export function findSessionForUser(sessionId: string, userId: string) {
  return db.prepare("SELECT * FROM sessions WHERE id = ? AND user_id = ?").get(sessionId, userId) as SessionRow | undefined;
}

export function getOrCreateDraftResponse(sessionId: string) {
  const existing = db.prepare("SELECT * FROM responses WHERE session_id = ? AND parent_response_id IS NULL ORDER BY created_at ASC LIMIT 1").get(sessionId) as ResponseRow | undefined;
  if (existing) return existing;
  const id = randomUUID();
  db.prepare("INSERT INTO responses (id, session_id) VALUES (?, ?)").run(id, sessionId);
  return db.prepare("SELECT * FROM responses WHERE id = ?").get(id) as ResponseRow;
}

export function createChildResponse(sessionId: string, parentResponseId: string, text: string) {
  const id = randomUUID();
  db.prepare("INSERT INTO responses (id, session_id, parent_response_id, text_input, processing_status) VALUES (?, ?, ?, ?, 'RAW')").run(id, sessionId, parentResponseId, text);
  return db.prepare("SELECT * FROM responses WHERE id = ?").get(id) as ResponseRow;
}

export function saveResponseText(responseId: string, text: string) {
  db.prepare("UPDATE responses SET text_input = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(text, responseId);
  return db.prepare("SELECT * FROM responses WHERE id = ?").get(responseId) as ResponseRow;
}

export function findResponseForUser(responseId: string, userId: string) {
  return db.prepare("SELECT r.* FROM responses r JOIN sessions s ON s.id = r.session_id WHERE r.id = ? AND s.user_id = ?").get(responseId, userId) as ResponseRow | undefined;
}

export function listMediaForResponse(responseId: string) {
  return db.prepare("SELECT * FROM media_assets WHERE response_id = ? ORDER BY created_at ASC").all(responseId) as MediaAssetRow[];
}

export function updateResponseProcessing(responseId: string, values: { status: ResponseRow["processing_status"]; error?: string | null; provider?: string | null; rawOutput?: string | null; transcript?: string | null }) {
  db.prepare("UPDATE responses SET processing_status = ?, processing_error = ?, ai_provider = ?, ai_raw_output = ?, transcript = COALESCE(?, transcript), updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(values.status, values.error ?? null, values.provider ?? null, values.rawOutput ?? null, values.transcript ?? null, responseId);
  return db.prepare("SELECT * FROM responses WHERE id = ?").get(responseId) as ResponseRow;
}

export function createMemoryUnit(values: { id: string; responseId: string; payload: unknown; source?: "AI" | "ADMIN" | "USER" }) {
  const latest = db.prepare("SELECT MAX(version) AS version FROM memory_units WHERE response_id = ?").get(values.responseId) as { version: number | null };
  const version = (latest.version ?? 0) + 1;
  db.prepare("INSERT INTO memory_units (id, response_id, version, source, payload_json) VALUES (?, ?, ?, ?, ?)").run(values.id, values.responseId, version, values.source ?? "AI", JSON.stringify(values.payload));
  return db.prepare("SELECT * FROM memory_units WHERE id = ?").get(values.id) as MemoryUnitRow;
}

export function findLatestMemoryUnit(responseId: string) {
  return db.prepare("SELECT * FROM memory_units WHERE response_id = ? ORDER BY version DESC LIMIT 1").get(responseId) as MemoryUnitRow | undefined;
}

export function createMemoryCard(values: { id: string; responseId: string; memoryUnitId: string; aiTitle: string; aiStory: string; aiOriginalQuote: string; timeLabel: string | null; representativeMediaId: string | null; privacyLevel: "P0_PRIVATE" | "P1_PERSONAL_ARCHIVE" }) {
  db.prepare("INSERT INTO memory_cards (id, response_id, memory_unit_id, ai_title, ai_story, ai_original_quote, time_label, representative_media_id, privacy_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run(values.id, values.responseId, values.memoryUnitId, values.aiTitle, values.aiStory, values.aiOriginalQuote, values.timeLabel, values.representativeMediaId, values.privacyLevel);
  return db.prepare("SELECT * FROM memory_cards WHERE id = ?").get(values.id) as MemoryCardRow;
}

export function findMemoryCardForUser(cardId: string, userId: string) {
  return db.prepare(`SELECT c.* FROM memory_cards c
    JOIN responses r ON r.id = c.response_id JOIN sessions s ON s.id = r.session_id
    WHERE c.id = ? AND s.user_id = ?`).get(cardId, userId) as MemoryCardRow | undefined;
}

export function findMemoryCardByResponse(responseId: string) {
  return db.prepare("SELECT * FROM memory_cards WHERE response_id = ?").get(responseId) as MemoryCardRow | undefined;
}

export function listMemoryCardsForUser(userId: string) {
  return db.prepare(`SELECT c.*, m.id AS representative_asset_id, m.type AS representative_asset_type, u.payload_json AS memory_payload_json
    FROM memory_cards c JOIN responses r ON r.id = c.response_id JOIN sessions s ON s.id = r.session_id
    JOIN memory_units u ON u.id = c.memory_unit_id
    LEFT JOIN media_assets m ON m.id = c.representative_media_id
    WHERE s.user_id = ? ORDER BY c.created_at DESC`).all(userId) as Array<MemoryCardRow & { representative_asset_id: string | null; representative_asset_type: MediaAssetRow["type"] | null }>;
}

export function listConfirmedMemoryCardsForDay7(userId: string) {
  return db.prepare(`SELECT c.*, m.id AS representative_asset_id, m.type AS representative_asset_type
    FROM memory_cards c JOIN responses r ON r.id = c.response_id JOIN sessions s ON s.id = r.session_id
    JOIN admin_reviews ar ON ar.response_id = c.response_id AND ar.memory_unit_id = c.memory_unit_id
    LEFT JOIN media_assets m ON m.id = c.representative_media_id
    WHERE s.user_id = ? AND c.privacy_level = 'P1_PERSONAL_ARCHIVE'
    ORDER BY c.created_at ASC LIMIT 7`).all(userId) as Array<MemoryCardRow & { representative_asset_id: string | null; representative_asset_type: MediaAssetRow["type"] | null }>;
}

export function listSelectedMemoryCardsForDay7(userId: string, cardIds: string[]) {
  if (cardIds.length === 0) return [] as Array<MemoryCardRow & { representative_asset_id: string | null; representative_asset_type: MediaAssetRow["type"] | null }>;
  const placeholders = cardIds.map(() => "?").join(", ");
  return db.prepare(`SELECT c.*, m.id AS representative_asset_id, m.type AS representative_asset_type
    FROM memory_cards c JOIN responses r ON r.id = c.response_id JOIN sessions s ON s.id = r.session_id
    JOIN admin_reviews ar ON ar.response_id = c.response_id AND ar.memory_unit_id = c.memory_unit_id
    LEFT JOIN media_assets m ON m.id = c.representative_media_id
    WHERE s.user_id = ? AND c.privacy_level = 'P1_PERSONAL_ARCHIVE' AND c.id IN (${placeholders})
    ORDER BY c.created_at ASC LIMIT 7`).all(userId, ...cardIds) as Array<MemoryCardRow & { representative_asset_id: string | null; representative_asset_type: MediaAssetRow["type"] | null }>;
}

export function findDay7WorkForUser(userId: string) {
  return db.prepare("SELECT * FROM day7_works WHERE user_id = ?").get(userId) as Day7WorkRow | undefined;
}

export function saveDay7Work(values: { userId: string; title: string; intro: string; closing: string; cardIds: string[] }) {
  const existing = findDay7WorkForUser(values.userId);
  const id = existing?.id ?? randomUUID();
  db.prepare(`INSERT INTO day7_works (id, user_id, title, intro, closing, card_ids_json)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET title = excluded.title, intro = excluded.intro, closing = excluded.closing, card_ids_json = excluded.card_ids_json, generated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP`)
    .run(id, values.userId, values.title, values.intro, values.closing, JSON.stringify(values.cardIds));
  return findDay7WorkForUser(values.userId)!;
}

export function updateMemoryCardForUser(cardId: string, userId: string, values: { title: string; story: string; privacyLevel: "P0_PRIVATE" | "P1_PERSONAL_ARCHIVE" }) {
  db.prepare(`UPDATE memory_cards SET user_title = ?, user_story = ?, privacy_level = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND response_id IN (SELECT r.id FROM responses r JOIN sessions s ON s.id = r.session_id WHERE s.user_id = ?)`)
    .run(values.title, values.story, values.privacyLevel, cardId, userId);
  return findMemoryCardForUser(cardId, userId);
}

export function createMemoryCardFeedback(values: { id: string; cardId: string; rating: MemoryCardFeedbackRow["rating"] }) {
  db.prepare("INSERT INTO memory_card_feedback (id, memory_card_id, rating) VALUES (?, ?, ?)").run(values.id, values.cardId, values.rating);
  return db.prepare("SELECT * FROM memory_card_feedback WHERE id = ?").get(values.id) as MemoryCardFeedbackRow;
}

export function findLatestMemoryCardFeedback(cardId: string) {
  return db.prepare("SELECT * FROM memory_card_feedback WHERE memory_card_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1").get(cardId) as MemoryCardFeedbackRow | undefined;
}

export function recordAnalyticsEvent(values: { id: string; userId: string; sessionId: string | null; eventName: string; metadata: unknown }) {
  db.prepare("INSERT INTO analytics_events (id, user_id, session_id, event_name, metadata_json) VALUES (?, ?, ?, ?, ?)")
    .run(values.id, values.userId, values.sessionId, values.eventName, JSON.stringify(values.metadata));
}

export function deleteMemoryCardForUser(cardId: string, userId: string) {
  const card = findMemoryCardForUser(cardId, userId);
  if (!card) return undefined;
  const response = db.prepare("SELECT * FROM responses WHERE id = ?").get(card.response_id) as ResponseRow;
  const assets = db.prepare("SELECT * FROM media_assets WHERE response_id IN (SELECT id FROM responses WHERE session_id = ?)").all(response.session_id) as MediaAssetRow[];
  db.exec("BEGIN");
  try {
    db.prepare("DELETE FROM memory_card_feedback WHERE memory_card_id = ?").run(card.id);
    db.prepare("DELETE FROM memory_cards WHERE response_id IN (SELECT id FROM responses WHERE session_id = ?)").run(response.session_id);
    db.prepare("DELETE FROM followups WHERE response_id IN (SELECT id FROM responses WHERE session_id = ?)").run(response.session_id);
    db.prepare("DELETE FROM memory_units WHERE response_id IN (SELECT id FROM responses WHERE session_id = ?)").run(response.session_id);
    db.prepare("DELETE FROM media_assets WHERE response_id IN (SELECT id FROM responses WHERE session_id = ?)").run(response.session_id);
    db.prepare("DELETE FROM responses WHERE session_id = ?").run(response.session_id);
    db.prepare("DELETE FROM sessions WHERE id = ? AND user_id = ?").run(response.session_id, userId);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return { storageKeys: assets.map((asset) => asset.storage_key) };
}

export function listAdminRecords() {
  return db.prepare(`SELECT r.*, s.user_id, s.mode, s.started_at, s.ended_at, u.invite_code, u.display_name
    FROM responses r JOIN sessions s ON s.id = r.session_id JOIN users u ON u.id = s.user_id
    WHERE r.parent_response_id IS NULL ORDER BY r.updated_at DESC`).all() as Array<ResponseRow & { user_id: string; mode: string; started_at: string; ended_at: string | null; invite_code: string; display_name: string }>;
}

export function findAdminRecord(responseId: string) {
  const record = db.prepare(`SELECT r.*, s.user_id, s.mode, s.started_at, s.ended_at, s.status AS session_status, u.invite_code, u.display_name
    FROM responses r JOIN sessions s ON s.id = r.session_id JOIN users u ON u.id = s.user_id
    WHERE r.id = ? AND r.parent_response_id IS NULL`).get(responseId) as (ResponseRow & { user_id: string; mode: string; started_at: string; ended_at: string | null; session_status: string; invite_code: string; display_name: string }) | undefined;
  if (!record) return undefined;
  const media = listMediaForResponse(record.id);
  const units = db.prepare("SELECT * FROM memory_units WHERE response_id = ? ORDER BY version DESC").all(record.id) as MemoryUnitRow[];
  const followup = db.prepare("SELECT * FROM followups WHERE response_id = ? ORDER BY created_at DESC LIMIT 1").get(record.id) as FollowupRow | undefined;
  const review = db.prepare("SELECT * FROM admin_reviews WHERE response_id = ?").get(record.id) as AdminReviewRow | undefined;
  return { record, media, units, followup, review };
}

export function createAdminMemoryUnitRevision(values: { responseId: string; payload: unknown; actorId: string }) {
  const unit = createMemoryUnit({ id: randomUUID(), responseId: values.responseId, payload: values.payload, source: "ADMIN" });
  recordAdminAudit({ actorId: values.actorId, action: "MEMORY_UNIT_REVISED", metadata: { responseId: values.responseId, memoryUnitId: unit.id, version: unit.version } });
  return unit;
}

export function updateAdminFollowup(values: { responseId: string; action: "ADOPT" | "EDIT" | "DISMISS"; question?: string; actorId: string }) {
  const existing = db.prepare("SELECT * FROM followups WHERE response_id = ? ORDER BY created_at DESC LIMIT 1").get(values.responseId) as FollowupRow | undefined;
  if (values.action === "DISMISS") {
    if (existing) db.prepare("UPDATE followups SET status = 'DISMISSED', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(existing.id);
  } else if (existing) {
    db.prepare("UPDATE followups SET question = ?, status = 'PENDING', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(values.question ?? existing.question, existing.id);
  } else if (values.question) {
    createFollowup({ id: randomUUID(), responseId: values.responseId, question: values.question, decision: { should_follow_up: true, source: "ADMIN" } });
  }
  recordAdminAudit({ actorId: values.actorId, action: `FOLLOWUP_${values.action}`, metadata: { responseId: values.responseId, question: values.question ?? null } });
  return db.prepare("SELECT * FROM followups WHERE response_id = ? ORDER BY created_at DESC LIMIT 1").get(values.responseId) as FollowupRow | undefined;
}

export function saveAdminReview(values: { responseId: string; memoryUnitId: string | null; aiError: boolean; hallucination: boolean; overInterpretation: boolean; duplicateQuestion: boolean; manualMinutes: number | null; notes: string | null; actorId: string }) {
  const existing = db.prepare("SELECT id FROM admin_reviews WHERE response_id = ?").get(values.responseId) as { id: string } | undefined;
  const id = existing?.id ?? randomUUID();
  db.prepare(`INSERT INTO admin_reviews (id, response_id, memory_unit_id, ai_error, hallucination, over_interpretation, duplicate_question, manual_minutes, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(response_id) DO UPDATE SET memory_unit_id = excluded.memory_unit_id, ai_error = excluded.ai_error, hallucination = excluded.hallucination, over_interpretation = excluded.over_interpretation, duplicate_question = excluded.duplicate_question, manual_minutes = excluded.manual_minutes, notes = excluded.notes, updated_at = CURRENT_TIMESTAMP`)
    .run(id, values.responseId, values.memoryUnitId, Number(values.aiError), Number(values.hallucination), Number(values.overInterpretation), Number(values.duplicateQuestion), values.manualMinutes, values.notes);
  recordAdminAudit({ actorId: values.actorId, action: "ADMIN_REVIEW_SAVED", metadata: { responseId: values.responseId } });
  return db.prepare("SELECT * FROM admin_reviews WHERE response_id = ?").get(values.responseId) as AdminReviewRow;
}

export function overrideDailyPrompt(values: { day: number; title: string; promptText: string; guidanceText: string; actorId: string }) {
  db.prepare("UPDATE daily_prompts SET title = ?, prompt_text = ?, guidance_text = ?, source = 'ADMIN', overridden_by_admin = 1, updated_at = CURRENT_TIMESTAMP WHERE day_number = ?")
    .run(values.title, values.promptText, values.guidanceText, values.day);
  recordAdminAudit({ actorId: values.actorId, action: "DAILY_PROMPT_OVERRIDDEN", metadata: { day: values.day } });
  return findPromptByDay(values.day)!;
}

export function listAdminUsers() {
  return db.prepare(`SELECT u.id, u.invite_code, u.display_name, u.experiment_day,
    MAX(r.updated_at) AS last_active_at,
    COUNT(DISTINCT CASE WHEN r.parent_response_id IS NULL THEN r.id END) AS response_count,
    COUNT(DISTINCT c.id) AS memory_count,
    COUNT(DISTINCT CASE WHEN m.type = 'IMAGE' THEN m.id END) AS image_count,
    COALESCE(SUM(CASE WHEN m.type = 'AUDIO' THEN m.duration_seconds ELSE 0 END), 0) AS audio_seconds,
    MAX(CASE WHEN f.status = 'PENDING' OR r.processing_status = 'NEEDS_ADMIN_REVIEW' THEN 1 ELSE 0 END) AS has_pending_review
    FROM users u
    LEFT JOIN sessions s ON s.user_id = u.id
    LEFT JOIN responses r ON r.session_id = s.id
    LEFT JOIN media_assets m ON m.response_id = r.id
    LEFT JOIN memory_cards c ON c.response_id = r.id
    LEFT JOIN followups f ON f.response_id = r.id
    GROUP BY u.id ORDER BY last_active_at DESC`).all();
}

export function getAdminAnalytics() {
  const eventRows = db.prepare("SELECT event_name, COUNT(*) AS count FROM analytics_events GROUP BY event_name").all() as Array<{ event_name: string; count: number }>;
  const feedbackRows = db.prepare("SELECT rating, COUNT(*) AS count FROM memory_card_feedback GROUP BY rating").all() as Array<{ rating: string; count: number }>;
  const dailyRows = db.prepare(`SELECT substr(created_at, 1, 10) AS date, COUNT(DISTINCT user_id) AS active_users,
    COUNT(*) AS response_count FROM analytics_events WHERE event_name IN ('response_submitted', 'text_submitted') GROUP BY substr(created_at, 1, 10) ORDER BY date DESC LIMIT 14`).all();
  const review = db.prepare(`SELECT COUNT(*) AS reviewed_count, COALESCE(SUM(manual_minutes), 0) AS manual_minutes,
    COALESCE(SUM(ai_error), 0) AS ai_error_count, COALESCE(SUM(hallucination), 0) AS hallucination_count,
    COALESCE(SUM(over_interpretation), 0) AS over_interpretation_count, COALESCE(SUM(duplicate_question), 0) AS duplicate_question_count FROM admin_reviews`).get();
  return { events: eventRows, feedback: feedbackRows, daily: dailyRows, review };
}

export function recordAdminAudit(values: { actorId: string; action: string; metadata: unknown }) {
  db.prepare("INSERT INTO admin_audit_logs (id, action, actor_id, metadata) VALUES (?, ?, ?, ?)")
    .run(randomUUID(), values.action, values.actorId, JSON.stringify(values.metadata));
}

export function createFollowup(values: { id: string; responseId: string; question: string; decision: unknown }) {
  db.prepare("INSERT INTO followups (id, response_id, question, decision_json) VALUES (?, ?, ?, ?)").run(values.id, values.responseId, values.question, JSON.stringify(values.decision));
  return db.prepare("SELECT * FROM followups WHERE id = ?").get(values.id) as FollowupRow;
}

export function findFollowupForUser(followupId: string, userId: string) {
  return db.prepare("SELECT f.* FROM followups f JOIN responses r ON r.id = f.response_id JOIN sessions s ON s.id = r.session_id WHERE f.id = ? AND s.user_id = ?").get(followupId, userId) as FollowupRow | undefined;
}

export function answerFollowup(followupId: string, responseId: string) {
  db.prepare("UPDATE followups SET status = 'ANSWERED', answer_response_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(responseId, followupId);
  return db.prepare("SELECT * FROM followups WHERE id = ?").get(followupId) as FollowupRow;
}

export function createMediaAsset(asset: MediaAssetRow) {
  db.prepare("INSERT INTO media_assets (id, response_id, user_id, type, storage_key, original_file_name, mime_type, file_size, duration_seconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run(asset.id, asset.response_id, asset.user_id, asset.type, asset.storage_key, asset.original_file_name, asset.mime_type, asset.file_size, asset.duration_seconds);
  return asset;
}

export function findMediaForUser(mediaId: string, userId: string) {
  return db.prepare("SELECT * FROM media_assets WHERE id = ? AND user_id = ?").get(mediaId, userId) as MediaAssetRow | undefined;
}

export function findMediaById(mediaId: string) {
  return db.prepare("SELECT * FROM media_assets WHERE id = ?").get(mediaId) as MediaAssetRow | undefined;
}

export function deleteMediaAssetForUser(mediaId: string, userId: string) {
  const asset = findMediaForUser(mediaId, userId);
  if (!asset) return undefined;
  db.prepare("DELETE FROM media_assets WHERE id = ? AND user_id = ?").run(mediaId, userId);
  return asset;
}

export function getSessionMaterials(sessionId: string, userId: string) {
  const session = findSessionForUser(sessionId, userId);
  if (!session) return undefined;
  const response = db.prepare("SELECT * FROM responses WHERE session_id = ? AND parent_response_id IS NULL ORDER BY created_at ASC LIMIT 1").get(sessionId) as ResponseRow | undefined;
  const media = response
    ? db.prepare("SELECT * FROM media_assets WHERE response_id = ? ORDER BY created_at ASC").all(response.id) as MediaAssetRow[]
    : [];
  return {
    session: toPlainObject(session),
    response: response ? toPlainObject(response) : undefined,
    media: media.map((asset) => toPlainObject(asset)),
    memoryUnit: response ? findLatestMemoryUnit(response.id) : undefined,
    memoryCard: response ? findMemoryCardByResponse(response.id) : undefined,
    followup: response ? (db.prepare("SELECT * FROM followups WHERE response_id = ? ORDER BY created_at DESC LIMIT 1").get(response.id) as FollowupRow | undefined) : undefined,
  };
}

export function markSessionRawSaved(sessionId: string, userId: string) {
  db.prepare("UPDATE sessions SET status = 'RAW_SAVED', ended_at = ? WHERE id = ? AND user_id = ?").run(new Date().toISOString(), sessionId, userId);
  return findSessionForUser(sessionId, userId);
}
