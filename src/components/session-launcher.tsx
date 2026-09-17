"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SessionLauncher({ mode, children, className }: { mode: "DAILY" | "FREE"; children: React.ReactNode; className?: string }) {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);

  async function start() {
    setIsStarting(true);
    const response = await fetch("/api/sessions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode }) });
    const result = await response.json();
    if (response.ok) router.push(`/session/${result.id}`);
    else setIsStarting(false);
  }

  return <button className={className} type="button" onClick={start} disabled={isStarting}>{isStarting ? "正在准备" : children}</button>;
}
