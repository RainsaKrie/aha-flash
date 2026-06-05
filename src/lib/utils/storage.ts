const USER_ID_KEY = "aha-flash:user-id";

export function readUserId() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(USER_ID_KEY);
}

export function writeUserId(userId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USER_ID_KEY, userId);
}
