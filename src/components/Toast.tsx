"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";
import { useUI } from "@/lib/store";

export function Toast() {
  const toast = useUI((s) => s.toast);
  const [hiddenKey, setHiddenKey] = useState<number | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setHiddenKey(toast.key), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  const on = !!toast && hiddenKey !== toast.key;

  return (
    <div
      role="status"
      aria-live="polite"
      className={clsx(
        "pointer-events-none fixed bottom-[calc(84px+env(safe-area-inset-bottom,0px))] md:bottom-[calc(24px+env(safe-area-inset-bottom,0px))] left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-[18px] py-3 text-[13px] font-semibold text-surface transition-[opacity,translate] duration-300 ease-soft",
        on ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0",
      )}
    >
      {toast?.msg}
    </div>
  );
}
