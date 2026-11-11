/**
 * SHARED MOCK STORAGE WRITES — the demo persists to localStorage, which can
 * fail (quota exceeded, privacy mode, storage disabled). UC-01 E4 and
 * UC-02 E3 require the caller to roll back and surface an error, so writes
 * throw instead of being silently ignored.
 */
export class MockStorageError extends Error {
  readonly storageKey: string;
  readonly reason: unknown;

  constructor(storageKey: string, reason?: unknown) {
    super(`Mock storage write failed for "${storageKey}"`);
    this.name = "MockStorageError";
    this.storageKey = storageKey;
    this.reason = reason;
  }
}

/** JSON-encodes and writes one key; throws MockStorageError on failure. */
export function writeJson(storageKey: string, value: unknown): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(value));
  } catch (reason) {
    throw new MockStorageError(storageKey, reason);
  }
}
