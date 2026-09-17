"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const inviteCode = useSearchParams().get("invite") ?? "";
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const pin = new FormData(event.currentTarget).get("pin");
    const response = await fetch("/api/auth/pin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ inviteCode, pin, mode: "verify" }) });
    const result = await response.json();
    if (!response.ok) return setError(result.error ?? "暂时无法登录。"), undefined;
    router.replace("/today");
  }

  return <form className="form-stack" onSubmit={submit}><label htmlFor="pin">输入 4 位 PIN</label><input id="pin" name="pin" type="password" inputMode="numeric" pattern="[0-9]{4}" minLength={4} maxLength={4} required autoFocus />{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-primary" type="submit">继续</button></form>;
}
