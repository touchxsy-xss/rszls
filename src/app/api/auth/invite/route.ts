import { NextResponse } from "next/server";
import { findUserByInvite } from "@/lib/database";
import { inviteSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const parsed = inviteSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const user = findUserByInvite(parsed.data.inviteCode);
  if (!user) return NextResponse.json({ error: "邀请码不存在。" }, { status: 404 });

  return NextResponse.json({ inviteCode: user.invite_code, hasPin: Boolean(user.pin_hash) });
}
