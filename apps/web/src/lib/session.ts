import type { AuthSession } from "./api";

const sessionStorageKey = "vaxis.session";

export function loadStoredSession() {
  const raw = localStorage.getItem(sessionStorageKey);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    localStorage.removeItem(sessionStorageKey);
    return null;
  }
}

export function storeSession(session: AuthSession) {
  localStorage.setItem(sessionStorageKey, JSON.stringify(session));
}

export function clearStoredSession() {
  localStorage.removeItem(sessionStorageKey);
}
