import { NextResponse } from "next/server";
import { getPublicBetaConfig, getPublicRuntimeConfig } from "@/lib/public-beta/config";
import { inspectGlobalDynamicAvailability } from "@/lib/public-beta/repository";
import { getPublicBetaStore } from "@/lib/public-beta/store";

export async function GET() {
  const config = getPublicBetaConfig();
  const runtime = getPublicRuntimeConfig();
  const availability = await inspectGlobalDynamicAvailability(
    config,
    getPublicBetaStore(config),
  );
  const response = availability === "allowed" || availability === "static_mode"
    ? runtime
    : {
        mode: "static" as const,
        dynamic_enabled: false,
        requires_invite: false,
        reason: availability,
      };
  return NextResponse.json(response, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
