import type { UserState } from "@/types/state";
import { selectMetaphorDomain } from "./domain-mappings";

export function getPreferredMetaphorContext(state: UserState) {
  const selected = selectMetaphorDomain(state.profile.hobbies);
  const preferences = state.profile.metaphor_preferences.join(", ") || "互动类比";

  return {
    selected,
    promptHint: `优先使用 ${selected.domain} 隐喻域。可用素材: ${selected.tags.join(" / ")}。用户显式偏好: ${preferences}。`,
  };
}
