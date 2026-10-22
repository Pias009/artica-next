"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};
const todayKey = () => new Date().toDateString();

/**
 * Today's date at midnight, read in the browser (pages are prerendered, so the server's date would go stale).
 * Null on the server and during hydration, so both render the same placeholder.
 */
export function useToday() {
  const key = useSyncExternalStore(noop, todayKey, () => null);
  return key ? new Date(key) : null;
}
