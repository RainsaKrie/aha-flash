'use client';

const INVITE_CODE_KEY = 'aha-flash:public-beta-invite-code';

export function rememberPublicBetaInviteCode(code: string) {
  if (typeof window === 'undefined') return;
  try {
    const normalized = code.trim();
    if (normalized) window.sessionStorage.setItem(INVITE_CODE_KEY, normalized);
  } catch {
    // Invite persistence is a convenience; the server remains authoritative.
  }
}

export function readPublicBetaInviteCode() {
  if (typeof window === 'undefined') return '';
  try {
    return window.sessionStorage.getItem(INVITE_CODE_KEY) || '';
  } catch {
    return '';
  }
}

export function clearPublicBetaInviteCode() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(INVITE_CODE_KEY);
  } catch {
    // No-op when session storage is unavailable.
  }
}
