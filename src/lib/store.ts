"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { byId, MOQ_CASES, MOQ_PAIRS, STEP_CASES, type Filter } from "./products";

export type InquiryLine = { id: string; cases: number };
export type BuyerType = "Retailer" | "Distributor" | "Private label brand";

/* ---- UI state: drawer, quick view, rail filter, toast (not persisted) ---- */
type UIState = {
  drawerOpen: boolean;
  buyerType: BuyerType;
  /** Work email handed over from the line-sheet form. */
  prefillEmail: { value: string; key: number } | null;
  /** Note text handed over from the sample-request section. */
  prefillNote: { value: string; key: number } | null;
  quickView: string | null;
  railFilter: Filter;
  toast: { msg: string; key: number } | null;
  openDrawer: (type?: BuyerType, email?: string, note?: string) => void;
  closeDrawer: () => void;
  openQuickView: (id: string) => void;
  closeQuickView: () => void;
  setRailFilter: (f: Filter) => void;
  setBuyerType: (t: BuyerType) => void;
  showToast: (msg: string) => void;
};

export const useUI = create<UIState>()((set) => ({
  drawerOpen: false,
  buyerType: "Retailer",
  prefillEmail: null,
  prefillNote: null,
  quickView: null,
  railFilter: "all",
  toast: null,
  openDrawer: (type, email, note) =>
    set((s) => ({
      drawerOpen: true,
      quickView: null,
      buyerType: type ?? s.buyerType,
      prefillEmail: email ? { value: email, key: Date.now() } : s.prefillEmail,
      prefillNote: note ? { value: note, key: Date.now() } : s.prefillNote,
    })),
  closeDrawer: () => set({ drawerOpen: false }),
  openQuickView: (id) => set({ quickView: id }),
  closeQuickView: () => set({ quickView: null }),
  setRailFilter: (railFilter) => set({ railFilter }),
  setBuyerType: (buyerType) => set({ buyerType }),
  showToast: (msg) => set({ toast: { msg, key: Date.now() } }),
}));

const toast = (msg: string) => useUI.getState().showToast(msg);

/* ---- Inquiry list (the "cart"), persisted to localStorage ---- */
type InquiryState = {
  lines: InquiryLine[];
  toggle: (id: string) => void;
  setCases: (id: string, cases: number) => void;
  step: (id: string, dir: 1 | -1) => void;
  remove: (id: string) => void;
  /**
   * Makes the list match a colour choice for one style group: `picked` colours are in (at `cases`, or kept / MOQ when
   * omitted), the group's other colours are out. Lines outside the group are untouched.
   */
  syncGroup: (groupIds: string[], picked: string[], cases?: number) => void;
  clear: () => void;
};

export const useInquiry = create<InquiryState>()(
  persist(
    (set, get) => ({
      lines: [],
      toggle: (id) => {
        const name = byId[id]?.name ?? id;
        if (get().lines.some((l) => l.id === id)) {
          set((s) => ({ lines: s.lines.filter((l) => l.id !== id) }));
          toast(`${name} removed`);
        } else {
          set((s) => ({ lines: [...s.lines, { id, cases: MOQ_CASES }] }));
          toast(`${name} added · ${MOQ_PAIRS} pairs`);
        }
      },
      setCases: (id, cases) => {
        const n = Math.max(MOQ_CASES, cases);
        set((s) =>
          s.lines.some((l) => l.id === id)
            ? { lines: s.lines.map((l) => (l.id === id ? { ...l, cases: n } : l)) }
            : { lines: [...s.lines, { id, cases: n }] },
        );
      },
      step: (id, dir) => {
        const line = get().lines.find((l) => l.id === id);
        if (!line) return;
        const n = line.cases + dir * STEP_CASES;
        if (n < MOQ_CASES) return toast(`MOQ is ${MOQ_CASES} cases per style`);
        set((s) => ({ lines: s.lines.map((l) => (l.id === id ? { ...l, cases: n } : l)) }));
      },
      remove: (id) => set((s) => ({ lines: s.lines.filter((l) => l.id !== id) })),
      syncGroup: (groupIds, picked, cases) =>
        set((s) => {
          const n = cases === undefined ? undefined : Math.max(MOQ_CASES, cases);
          const kept = s.lines
            .filter((l) => !groupIds.includes(l.id) || picked.includes(l.id))
            .map((l) => (n !== undefined && picked.includes(l.id) ? { ...l, cases: n } : l));
          const added = picked.filter((id) => !kept.some((l) => l.id === id)).map((id) => ({ id, cases: n ?? MOQ_CASES }));
          return { lines: [...kept, ...added] };
        }),
      clear: () => set({ lines: [] }),
    }),
    {
      name: "artica-inquiry",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ lines: s.lines }),
      // Hydrated on the client in <StoreHydrator/> to avoid SSR mismatches.
      skipHydration: true,
      merge: (persisted, current) => ({
        ...current,
        lines: ((persisted as { lines?: InquiryLine[] })?.lines ?? []).filter((l) => byId[l.id]),
      }),
    },
  ),
);

export const useInCart = (id: string) => useInquiry((s) => s.lines.some((l) => l.id === id));
