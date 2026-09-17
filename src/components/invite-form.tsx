"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function InviteForm() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("F0001");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const response = await fetch("/api/auth/invite", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ inviteCode }) });
    const result = await response.json();
    setIsSubmitting(false);
    if (!response.ok) return setError(result.error ?? "暂时无法验证邀请码。"), undefined;
    router.push(`${result.hasPin ? "/login" : "/consent"}?invite=${encodeURIComponent(result.inviteCode)}`);
  }

  return <form className="form-stack" onSubmit={submit}>
    <label htmlFor="invite">邀请码</label>
    <input id="invite" name="invite" autoCapitalize="characters" autoCorrect="off" inputMode="text" value={inviteCode} onChange={(event) => setInviteCode(event.target.value.toUpperCase())} maxLength={5} required />
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="button button-primary" type="submit" disabled={isSubmitting}>{isSubmitting ? "正在进入" : "进入人生整理师"}</button>
  </form>;
}
