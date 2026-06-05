import { stateStore } from "@/lib/harness/state-store";
import type { UserProfile } from "@/types/state";

export async function updateUserState(args: Record<string, unknown>) {
  const userId = String(args.user_id || "");
  if (!userId) return { success: false, error: "user_id is required" };

  const patch: Partial<UserProfile> = {
    background: typeof args.background === "string" ? args.background : undefined,
    hobbies: Array.isArray(args.hobbies) ? args.hobbies.map(String) : undefined,
    knowledge_blindspots: Array.isArray(args.knowledge_blindspots)
      ? args.knowledge_blindspots.map(String)
      : undefined,
    metaphor_preferences: Array.isArray(args.metaphor_preferences)
      ? args.metaphor_preferences.map(String)
      : undefined,
  };

  const userState = await stateStore.mergeProfilePatch(userId, patch);
  return { success: true, userState };
}
