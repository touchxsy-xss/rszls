import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/current-user";
import { getAdminAnalytics } from "@/lib/database";

export async function GET() {
  await requireAdmin();
  return NextResponse.json(getAdminAnalytics());
}
