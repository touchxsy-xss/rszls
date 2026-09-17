"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { privacyLabel } from "@/lib/memory-cards";

type Card = { id: string; ai_title: string; ai_story: string; time_label: string | null; privacy_level: "P0_PRIVATE" | "P1_PERSONAL_ARCHIVE"; user_title: string | null; user_story: string | null; representative_asset_id: string | null; representative_asset_type: "AUDIO" | "IMAGE" | "VIDEO" | null; memory_payload_json: string };
const filters = ["全部", "人物", "地点", "照片故事", "人生事件"] as const;

function matches(card: Card, filter: (typeof filters)[number]) {
  if (filter === "全部") return true;
  let payload: { people?: unknown[]; places?: unknown[]; events?: unknown[] } = {};
  try { payload = JSON.parse(card.memory_payload_json) as typeof payload; } catch { return false; }
  if (filter === "人物") return Boolean(payload.people?.length);
  if (filter === "地点") return Boolean(payload.places?.length);
  if (filter === "照片故事") return card.representative_asset_type === "IMAGE";
  return Boolean(payload.events?.length);
}

export function MemoryBrowser({ cards }: { cards: Card[] }) {
  const [filter, setFilter] = useState<(typeof filters)[number]>("全部");
  const visible = useMemo(() => cards.filter((card) => matches(card, filter)), [cards, filter]);
  return <><nav className="memory-filters" aria-label="记忆分类">{filters.map((item) => <button className={filter === item ? "active" : ""} key={item} type="button" onClick={() => setFilter(item)}>{item}</button>)}</nav><section className="memory-list">{visible.length === 0 ? <p className="saved-panel">这个分类下还没有记忆。</p> : visible.map((card) => { const title = card.user_title ?? card.ai_title; const story = card.user_story ?? card.ai_story; return <Link className="memory-list-card" key={card.id} href={`/memories/${card.id}`}>{card.representative_asset_id && <Image src={`/api/media/${card.representative_asset_id}`} alt="记忆照片缩略图" width={104} height={82} unoptimized />}<div><p className="eyebrow">{card.time_label ?? "一段记忆"}</p><h2>{title}</h2><p>{story}</p><small>{privacyLabel(card.privacy_level)}</small></div></Link>; })}</section></>;
}
