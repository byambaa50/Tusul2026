"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/** True only after the client store is readable — avoids hydration flashes. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
