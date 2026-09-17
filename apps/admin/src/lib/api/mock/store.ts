import { createFixtures, MOCK_DB_VERSION, type MockDb } from "./fixtures";

/**
 * Where the sample data lives: memory, mirrored to this tab's
 * sessionStorage so a reload or a pasted link keeps your changes. Closing
 * the tab, or "Reset sample data", starts again from the fixtures.
 */

const DB_KEY = "scm-admin:sample-db";
const SESSION_KEY = "scm-admin:sample-session";
const CONTROLS_KEY = "scm-admin:sample-controls";
export const STORAGE_FULL_EVENT = "scm-admin:sample-storage-full";

let db: MockDb | null = null;

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function getDb(): MockDb {
  if (db) return db;
  const raw = storage()?.getItem(DB_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as MockDb;
      if (parsed.version === MOCK_DB_VERSION) {
        db = parsed;
        return db;
      }
    } catch {
      // Unreadable: fall through to fresh fixtures.
    }
  }
  db = createFixtures();
  persist();
  return db;
}

export function persist() {
  if (!db) return;
  try {
    storage()?.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    // Usually uploaded photographs filling the quota. Changes still work in
    // memory; the sample banner says a reload will lose them.
    if (typeof window !== "undefined") window.dispatchEvent(new Event(STORAGE_FULL_EVENT));
  }
}

export function resetDb() {
  db = createFixtures();
  persist();
}

export function getSessionUserId(): string | null {
  return storage()?.getItem(SESSION_KEY) ?? null;
}

export function setSessionUserId(id: string | null) {
  const store = storage();
  if (!store) return;
  if (id) store.setItem(SESSION_KEY, id);
  else store.removeItem(SESSION_KEY);
}

// ---- Controls for reviewing loading and error states --------------------------------

export interface SampleControls {
  /** `slow` makes every request take 1.5–2.5 seconds. */
  latency: "normal" | "slow";
  /** `next` fails the next request once; `always` fails every request. */
  failures: "off" | "next" | "always";
}

let controls: SampleControls | null = null;

export function getControls(): SampleControls {
  if (controls) return controls;
  try {
    const raw = storage()?.getItem(CONTROLS_KEY);
    controls = raw ? (JSON.parse(raw) as SampleControls) : { latency: "normal", failures: "off" };
  } catch {
    controls = { latency: "normal", failures: "off" };
  }
  return controls;
}

export function setControls(next: Partial<SampleControls>) {
  controls = { ...getControls(), ...next };
  try {
    storage()?.setItem(CONTROLS_KEY, JSON.stringify(controls));
  } catch {
    // Not important enough to report.
  }
}
