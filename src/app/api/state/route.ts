import { NextResponse } from "next/server";
import { initUserState } from "@/lib/harness/state-machine";
import { stateStore } from "@/lib/harness/state-store";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  const state = await initUserState(userId);
  return NextResponse.json(state);
}

export async function PATCH(req: Request) {
  const body = await req.json();
  if (!body.user_id) {
    return NextResponse.json({ error: "user_id is required" }, { status: 400 });
  }

  const updated = await stateStore.update(body.user_id, body);
  return NextResponse.json(updated);
}
