import type { UserState } from "@/types/state";
import { stateStore } from "./state-store";

export async function initUserState(userId?: string | null) {
  return (await stateStore.get(userId)) ?? stateStore.create(userId ?? undefined);
}

export async function patchUserPreferences(
  state: UserState,
  patch: Partial<UserState["profile"]>,
) {
  return stateStore.update(state.user_id, {
    profile: {
      ...state.profile,
      ...patch,
    },
  });
}
