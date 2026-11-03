"use client";

import { createContext, useContext, useState, useTransition, type ReactNode } from "react";
import { flash } from "./ui";
import type { SaveResult } from "@/app/admin/content-actions";
import type { PanelData } from "@/lib/admin/panel";

/** The dashboard's data from the server (lib/admin/panel.ts), for every view. */
const Ctx = createContext<PanelData | null>(null);
export const PanelDataProvider = ({ data, children }: { data: PanelData; children: ReactNode }) => <Ctx value={data}>{children}</Ctx>;
export function usePanel() {
  const d = useContext(Ctx);
  if (!d) throw new Error("usePanel outside the admin panel");
  return d;
}

/**
 * Saving a view's edits through its server action: pending while it runs, the server's error if it refuses, and on
 * success `onSaved` (the view marks its edits as saved) and a confirmation.
 */
export function useSaver<T>(action: (v: T) => Promise<SaveResult>, onSaved: (v: T) => void) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const save = (v: T) =>
    start(async () => {
      try {
        const r = await action(v);
        if (r.ok) {
          setError(null);
          onSaved(v);
          flash("Published. The site shows it on the next page load.");
        } else setError(r.error);
      } catch {
        setError("Couldn't reach the server. Check your connection and try again.");
      }
    });
  return { save, pending, error, clearError: () => setError(null) };
}

/** Relative time for the panel: "12 min ago", "3 h ago", "Yesterday", "4 Nov". */
export function ago(iso: string, now = Date.now()) {
  const m = Math.round((now - new Date(iso).getTime()) / 60_000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  if (h < 48) return "Yesterday";
  const d = Math.round(h / 24);
  if (d < 7) return `${d} days ago`;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}
