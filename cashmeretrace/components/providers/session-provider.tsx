"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";

import { roles, type Role } from "@/lib/constants/nav";

/**
 * MOCK SESSION v3 (Phase 2) — the demo session now binds both a role and,
 * for suppliers, an explicit supplier id so the screens (UC-02/03, profile,
 * dashboard) can filter to the logged-in supplier's own data (BR-05).
 * Stored as JSON in localStorage; the legacy Phase-1 plain string role is
 * still parsed but yields no supplier id — supplier shells then bounce to
 * login instead of silently showing another supplier's data (mock of the
 * real server-side authorization, NFR-09). Replaced by the real JWT/session
 * in Phase 3 (NFR-08: token ≤ 8 h). External-store pattern — no
 * setState-in-effect, hydration-safe.
 */
const STORAGE_KEY = "ct.mock.session";
const LEGACY_KEY = "ct.mock.session.role";
const SESSION_EVENT = "ct:mock:session-change";

export interface MockSession {
  role: Role | null;
  supplierId: string | null;
}

const EMPTY: MockSession = { role: null, supplierId: null };

const noopSubscribe = () => () => {};

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(SESSION_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SESSION_EVENT, callback);
  };
}

function parseStored(): MockSession {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<MockSession>;
      if (parsed.role && (roles as readonly string[]).includes(parsed.role)) {
        return {
          role: parsed.role,
          supplierId: typeof parsed.supplierId === "string" ? parsed.supplierId : null,
        };
      }
    }
    // Legacy Phase-1 value: a bare role string. Suppliers need an
    // explicit supplier id in Phase 2, so those sessions are treated as
    // expired (the shell redirects to login).
    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (legacy && (roles as readonly string[]).includes(legacy)) {
      return { role: legacy as Role, supplierId: null };
    }
  } catch {
    /* localStorage unavailable or corrupt — treat as no session */
  }
  return { ...EMPTY };
}

let cached = EMPTY;

function sameSession(a: MockSession, b: MockSession) {
  return a.role === b.role && a.supplierId === b.supplierId;
}

function getSnapshot(): MockSession {
  if (typeof window === "undefined") return EMPTY;
  const next = parseStored();
  if (!sameSession(next, cached)) cached = next;
  return cached;
}

function getServerSnapshot(): MockSession {
  return EMPTY;
}

function getHydrated(): boolean {
  return true;
}

function getNotHydrated(): boolean {
  return false;
}

export interface SessionLogin {
  role: Role;
  /** Strict supplier binding (BR-05) — required for supplier sessions. */
  supplierId?: string | null;
}

interface SessionContextValue {
  /** True once the client store has been read (hydrated). */
  isHydrated: boolean;
  role: Role | null;
  supplierId: string | null;
  login: (next: SessionLogin) => void;
  logout: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const session = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isHydrated = useSyncExternalStore(noopSubscribe, getHydrated, getNotHydrated);

  const login = useCallback((next: SessionLogin) => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ role: next.role, supplierId: next.supplierId ?? null }),
      );
      window.dispatchEvent(new Event(SESSION_EVENT));
    } catch {
      /* ignore */
    }
  }, []);

  const logout = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(LEGACY_KEY);
      window.dispatchEvent(new Event(SESSION_EVENT));
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({
      isHydrated,
      role: session.role,
      supplierId: session.supplierId,
      login,
      logout,
    }),
    [isHydrated, session.role, session.supplierId, login, logout],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within <SessionProvider>");
  }
  return ctx;
}
